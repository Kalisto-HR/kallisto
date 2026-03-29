package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	auth "kallisto/infra/auth/jwt"
	authsession "kallisto/infra/auth/session"
	"kallisto/infra/authz"
	"kallisto/infra/middlewares"
	"kallisto/infra/observability"
	"kallisto/infra/utils"
	"kallisto/infra/validation"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	db           *pgxpool.Pool
	auditLogger  *observability.AuditLogger
	sessionStore authsession.Store
	throttle     authsession.Throttle
}

type signInRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type signUpRequest struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

type provisionUserRequest struct {
	Email            string  `json:"email"`
	Password         string  `json:"password"`
	FirstName        string  `json:"first_name"`
	LastName         string  `json:"last_name"`
	Role             string  `json:"role"`
	UniversityLinked *string `json:"university_linked,omitempty"`
}

type resolvedUser struct {
	ID               string
	Email            string
	Password         string
	FirstName        string
	LastName         string
	Role             string
	UniversityLinked *string
}

func NewAuthHandler(db *pgxpool.Pool) *AuthHandler {
	return &AuthHandler{
		db:           db,
		auditLogger:  observability.NewAuditLogger(db, nil),
		sessionStore: authsession.NewStore(db),
		throttle:     authsession.NewThrottle(db),
	}
}

func (h *AuthHandler) SignIn(w http.ResponseWriter, r *http.Request) {
	var req signInRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	errors := validation.Validate(
		validation.ValidateRequired(req.Email, "email"),
		validation.ValidateEmail(req.Email, "email"),
		validation.ValidateRequired(req.Password, "password"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	ipAddress := observability.RequestIP(r)
	now := time.Now().UTC()
	decision, err := h.throttle.Evaluate(r.Context(), req.Email, ipAddress, now)
	if err != nil {
		utils.WriteJSONResponseWithMsg(w, "failed to evaluate sign-in request", http.StatusInternalServerError)
		return
	}
	if decision != nil && decision.Blocked {
		_ = h.throttle.RecordAttempt(r.Context(), req.Email, ipAddress, false, true, "rate limited")
		h.auditSignInFailure(r.Context(), req.Email, "rate limited")
		retryAfterSeconds := int(decision.RetryAfter.Seconds())
		if retryAfterSeconds <= 0 {
			retryAfterSeconds = 60
		}
		w.Header().Set("Retry-After", fmt.Sprintf("%d", retryAfterSeconds))
		utils.WriteJSONResponseWithMsg(w, "too many sign-in attempts", http.StatusTooManyRequests)
		return
	}

	user, err := h.resolveUserForSignIn(r.Context(), strings.TrimSpace(req.Email))
	if err != nil {
		_ = h.throttle.RecordAttempt(r.Context(), req.Email, ipAddress, false, false, authFailureReason(err))
		h.auditSignInFailure(r.Context(), req.Email, authFailureReason(err))
		writeAuthError(w, err)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		_ = h.throttle.RecordAttempt(r.Context(), req.Email, ipAddress, false, false, "invalid credentials")
		h.auditSignInFailure(r.Context(), req.Email, "invalid credentials")
		utils.WriteJSONResponseWithMsg(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	if _, recordErr := h.issueSession(r.Context(), w, user, ipAddress, strings.TrimSpace(r.UserAgent()), now); recordErr != nil {
		utils.WriteJSONResponseWithMsg(w, recordErr.Error(), http.StatusInternalServerError)
		return
	}

	_ = h.throttle.RecordAttempt(r.Context(), req.Email, ipAddress, true, false, "")

	observability.SetActor(r.Context(), user.ID, user.Role)
	h.auditSignInSuccess(r.Context(), user)
	utils.WriteJSONResponseWithMsg(w, "ok", http.StatusOK)
}

func (h *AuthHandler) SignUp(w http.ResponseWriter, r *http.Request) {
	var req signUpRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	errors := validation.Validate(
		validation.ValidateRequired(req.Email, "email"),
		validation.ValidateEmail(req.Email, "email"),
		validation.ValidateRequired(req.Password, "password"),
		validation.ValidateMinLength(req.Password, "password", 8),
		validation.ValidateRequired(req.FirstName, "first_name"),
		validation.ValidateRequired(req.LastName, "last_name"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	email := strings.TrimSpace(req.Email)
	inUse, err := emailExists(r.Context(), h.db, email)
	if err != nil {
		utils.WriteJSONResponseWithMsg(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if inUse {
		utils.WriteJSONResponseWithMsg(w, "email is already in use", http.StatusConflict)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		utils.WriteJSONResponseWithMsg(w, "failed to create user", http.StatusInternalServerError)
		return
	}

	var userID string
	err = h.db.QueryRow(
		r.Context(),
		`INSERT INTO users (email, password, first_name, last_name, role)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id`,
		email,
		string(hashedPassword),
		req.FirstName,
		req.LastName,
		authz.RoleApplicant,
	).Scan(&userID)
	if err != nil {
		utils.WriteJSONResponseWithMsg(w, "failed to create user", http.StatusInternalServerError)
		return
	}

	if _, err := h.issueSession(r.Context(), w, &resolvedUser{
		ID:        userID,
		Email:     email,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Role:      authz.RoleApplicant,
	}, observability.RequestIP(r), strings.TrimSpace(r.UserAgent()), time.Now().UTC()); err != nil {
		utils.WriteJSONResponseWithMsg(w, err.Error(), http.StatusInternalServerError)
		return
	}

	utils.WriteJSONResponseWithMsg(w, "ok", http.StatusCreated)
}

func (h *AuthHandler) SignOut(w http.ResponseWriter, r *http.Request) {
	claims, _ := middlewares.GetClaimsFromContext(r.Context())
	session, sessionErr := middlewares.GetSessionFromContext(r.Context())
	if sessionErr == nil && session != nil && h.sessionStore != nil {
		if err := h.sessionStore.Revoke(r.Context(), session.ID, authsession.ReasonSessionRevoked); err != nil {
			utils.WriteJSONResponseWithMsg(w, "failed to revoke session", http.StatusInternalServerError)
			return
		}
	}
	if claims != nil {
		observability.SetActor(r.Context(), claims.UID, claims.Role)
	}

	utils.ClearAuthCookies(w)
	h.auditSignOut(r.Context(), claims)
	utils.WriteJSONResponseWithMsg(w, "ok", http.StatusOK)
}

func (h *AuthHandler) GetSession(w http.ResponseWriter, r *http.Request) {
	session, err := middlewares.GetSessionFromContext(r.Context())
	if err != nil || session == nil {
		utils.WriteJSONResponseWithMsg(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	utils.WriteJSONResponse(w, map[string]any{
		"user": map[string]any{
			"id":                session.UserID,
			"email":             session.Email,
			"first_name":        session.FirstName,
			"last_name":         session.LastName,
			"role":              session.Role,
			"permissions":       session.Permissions,
			"university_linked": session.UniversityLinked,
		},
	}, http.StatusOK)
}

func (h *AuthHandler) CreateRoleAccount(w http.ResponseWriter, r *http.Request) {
	var req provisionUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteJSONResponseWithMsg(w, "malformed json request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	errors := validation.Validate(
		validation.ValidateRequired(req.Email, "email"),
		validation.ValidateEmail(req.Email, "email"),
		validation.ValidateRequired(req.Password, "password"),
		validation.ValidateMinLength(req.Password, "password", 8),
		validation.ValidateRequired(req.FirstName, "first_name"),
		validation.ValidateRequired(req.LastName, "last_name"),
		validation.ValidateRequired(req.Role, "role"),
		validation.ValidateInList(req.Role, "role", []string{authz.RolePartner, authz.RoleStaff}),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	if req.Role == authz.RolePartner && (req.UniversityLinked == nil || strings.TrimSpace(*req.UniversityLinked) == "") {
		utils.WriteJSONResponseWithMsg(w, "partner accounts must have a linked university", http.StatusBadRequest)
		return
	}

	email := strings.TrimSpace(req.Email)
	inUse, err := emailExists(r.Context(), h.db, email)
	if err != nil {
		utils.WriteJSONResponseWithMsg(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if inUse {
		utils.WriteJSONResponseWithMsg(w, "email is already in use", http.StatusConflict)
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		utils.WriteJSONResponseWithMsg(w, "failed to create account", http.StatusInternalServerError)
		return
	}

	var userID string
	err = pgx.BeginFunc(r.Context(), h.db, func(tx pgx.Tx) error {
		if err := tx.QueryRow(
			r.Context(),
			`INSERT INTO users (email, password, first_name, last_name, role, university_linked)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 RETURNING id`,
			email,
			string(hashedPassword),
			req.FirstName,
			req.LastName,
			req.Role,
			req.UniversityLinked,
		).Scan(&userID); err != nil {
			return err
		}

		claims, claimsErr := authClaimsFromContext(r.Context())
		actorName := "Staff"
		actorType := "staff"
		var actorID *string
		if claimsErr == nil && claims != nil {
			if strings.TrimSpace(claims.FirstName+" "+claims.LastName) != "" {
				actorName = strings.TrimSpace(claims.FirstName + " " + claims.LastName)
			}
			if strings.TrimSpace(claims.UID) != "" {
				value := strings.TrimSpace(claims.UID)
				actorID = &value
			}
			actorType = claims.Role
		}

		metadata, _ := json.Marshal(map[string]any{
			"created_role":        req.Role,
			"university_linked":   req.UniversityLinked,
			"target_email_masked": observability.MaskEmail(email),
		})

		return observability.InsertAuditLog(r.Context(), tx, observability.AuditEntry{
			ActorName:         actorName,
			ActorID:           actorID,
			ActorType:         actorType,
			ActionType:        "staff.account.create",
			ActionDescription: "Created role account",
			TargetEntity:      "user_account",
			TargetID:          &userID,
			Outcome:           "success",
			IPAddress:         observability.IPAddressFromContext(r.Context()),
			RequestID:         observability.RequestIDFromContext(r.Context()),
			Metadata:          metadata,
		})
	})
	if err != nil {
		utils.WriteJSONResponseWithMsg(w, "failed to create account", http.StatusInternalServerError)
		return
	}

	utils.WriteJSONResponse(w, map[string]string{
		"msg": "ok",
		"id":  userID,
	}, http.StatusCreated)
}

func (h *AuthHandler) resolveUserForSignIn(ctx context.Context, email string) (*resolvedUser, error) {
	user, found, err := findUserByEmail(ctx, h.db, email)
	if err != nil {
		return nil, err
	}
	if found {
		return user, nil
	}
	return nil, utils.NewHandlerFuncErr(http.StatusUnauthorized, "invalid credentials")
}

func findUserByEmail(ctx context.Context, db *pgxpool.Pool, email string) (*resolvedUser, bool, error) {
	if db == nil {
		return nil, false, errors.New("database is not configured")
	}

	row := db.QueryRow(
		ctx,
		`SELECT id, email, password, COALESCE(first_name, ''), COALESCE(last_name, ''), role, university_linked
		 FROM users
		 WHERE email = $1`,
		email,
	)

	user := resolvedUser{}
	if err := row.Scan(
		&user.ID,
		&user.Email,
		&user.Password,
		&user.FirstName,
		&user.LastName,
		&user.Role,
		&user.UniversityLinked,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, false, nil
		}
		return nil, false, fmt.Errorf("failed to query user: %s", err.Error())
	}

	return &user, true, nil
}

func emailExists(ctx context.Context, db *pgxpool.Pool, email string) (bool, error) {
	if db == nil {
		return false, errors.New("database is not configured")
	}

	var exists bool
	if err := db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", email).Scan(&exists); err != nil {
		return false, fmt.Errorf("failed to check user existence: %s", err.Error())
	}

	return exists, nil
}

func writeAuthError(w http.ResponseWriter, err error) {
	handlerErr, ok := err.(utils.HandlerFuncErr)
	if !ok {
		utils.WriteJSONResponseWithMsg(w, err.Error(), http.StatusInternalServerError)
		return
	}

	utils.WriteJSONResponseWithMsg(w, handlerErr.Error(), handlerErr.Status())
}

func (h *AuthHandler) auditSignInSuccess(ctx context.Context, user *resolvedUser) {
	if h.auditLogger == nil || user == nil {
		return
	}

	actorID := user.ID
	metadata, _ := json.Marshal(map[string]any{
		"email_masked":      observability.MaskEmail(user.Email),
		"university_linked": user.UniversityLinked,
	})

	h.auditLogger.Log(ctx, observability.AuditEntry{
		ActorName:         strings.TrimSpace(strings.TrimSpace(user.FirstName) + " " + strings.TrimSpace(user.LastName)),
		ActorID:           &actorID,
		ActorType:         user.Role,
		ActionType:        "auth.sign-in",
		ActionDescription: "Sign-in succeeded",
		TargetEntity:      "session",
		Outcome:           "success",
		IPAddress:         observability.IPAddressFromContext(ctx),
		RequestID:         observability.RequestIDFromContext(ctx),
		Metadata:          metadata,
	})
}

func (h *AuthHandler) auditSignInFailure(ctx context.Context, email string, reason string) {
	if h.auditLogger == nil {
		return
	}

	metadata, _ := json.Marshal(map[string]any{
		"email_masked": observability.MaskEmail(email),
		"reason":       strings.TrimSpace(reason),
	})

	h.auditLogger.Log(ctx, observability.AuditEntry{
		ActorName:         "Anonymous",
		ActorType:         "anonymous",
		ActionType:        "auth.sign-in",
		ActionDescription: "Sign-in failed",
		TargetEntity:      "session",
		Outcome:           "failed",
		IPAddress:         observability.IPAddressFromContext(ctx),
		RequestID:         observability.RequestIDFromContext(ctx),
		Metadata:          metadata,
	})
}

func (h *AuthHandler) auditSignOut(ctx context.Context, claims *auth.Claims) {
	if h.auditLogger == nil {
		return
	}

	actorName := "Anonymous"
	actorType := "anonymous"
	var actorID *string
	if claims != nil {
		fullName := strings.TrimSpace(strings.TrimSpace(claims.FirstName) + " " + strings.TrimSpace(claims.LastName))
		if fullName != "" {
			actorName = fullName
		}
		actorType = claims.Role
		if strings.TrimSpace(claims.UID) != "" {
			value := strings.TrimSpace(claims.UID)
			actorID = &value
		}
	}

	h.auditLogger.Log(ctx, observability.AuditEntry{
		ActorName:         actorName,
		ActorID:           actorID,
		ActorType:         actorType,
		ActionType:        "auth.sign-out",
		ActionDescription: "Sign-out completed",
		TargetEntity:      "session",
		Outcome:           "success",
		IPAddress:         observability.IPAddressFromContext(ctx),
		RequestID:         observability.RequestIDFromContext(ctx),
	})
}

func authClaimsFromContext(ctx context.Context) (*auth.Claims, error) {
	return middlewares.GetClaimsFromContext(ctx)
}

func authFailureReason(err error) string {
	handlerErr, ok := err.(utils.HandlerFuncErr)
	if !ok {
		return "sign-in failed"
	}

	switch handlerErr.Status() {
	case http.StatusUnauthorized:
		return "invalid credentials"
	case http.StatusConflict:
		return "duplicate account detected"
	default:
		return "sign-in failed"
	}
}

func (h *AuthHandler) issueSession(
	ctx context.Context,
	w http.ResponseWriter,
	user *resolvedUser,
	ipAddress *string,
	userAgent string,
	now time.Time,
) (*authsession.Session, error) {
	if user == nil {
		return nil, fmt.Errorf("failed to issue session")
	}

	if h.sessionStore == nil {
		return nil, fmt.Errorf("session store is not configured")
	}

	csrfToken, err := generateTokenValue()
	if err != nil {
		return nil, fmt.Errorf("failed to generate csrf token")
	}

	sessionExpiry := now.Add(time.Duration(auth.EXPIRATION_THRESHOLD) * time.Second)
	sessionRecord, err := h.sessionStore.Create(ctx, authsession.CreateParams{
		UserID:           user.ID,
		Email:            user.Email,
		FirstName:        user.FirstName,
		LastName:         user.LastName,
		Role:             user.Role,
		Permissions:      authz.PermissionsForRole(user.Role),
		UniversityLinked: user.UniversityLinked,
		CSRFToken:        csrfToken,
		IPAddress:        ipAddress,
		UserAgent:        userAgent,
		IssuedAt:         now,
		ExpiresAt:        sessionExpiry,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create session")
	}

	claims := auth.Claims{
		SID: sessionRecord.ID,
		UID: sessionRecord.UserID,
		Iat: now.Unix(),
		Exp: sessionRecord.ExpiresAt.Unix(),
	}

	token, err := auth.NewJWTFromClaims(&claims)
	if err != nil {
		return nil, fmt.Errorf("failed to create access token")
	}

	utils.SetAuthCookies(w, token.TokenString, sessionRecord.CSRFToken)
	return sessionRecord, nil
}

func generateTokenValue() (string, error) {
	buffer := make([]byte, 32)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return hex.EncodeToString(buffer), nil
}
