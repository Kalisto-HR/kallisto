package handlers

import (
	"encoding/json"
	"net/http"

	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/infra/validation"
	"kallisto/services/backend/internal/applicant/models"
	"kallisto/services/backend/internal/applicant/usecases/usecases_impl"

	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

func GetBillingProductsHandler(w http.ResponseWriter, r *http.Request) {
	products, err := usecases_impl.ListBillingProducts(r.Context())
	if err != nil {
		writeBillingError(w, err)
		return
	}
	utils.WriteApiResponse(w, utils.NewApiResponse(true, products, "ok"), http.StatusOK)
}

func GetBillingSummaryHandler(w http.ResponseWriter, r *http.Request) {
	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		utils.WriteApiResponse(w, utils.NewApiResponse[any](false, nil, "unauthorized"), http.StatusUnauthorized)
		return
	}
	summary, err := usecases_impl.GetBillingSummary(r.Context(), claims.UID)
	if err != nil {
		writeBillingError(w, err)
		return
	}
	utils.WriteApiResponse(w, utils.NewApiResponse(true, summary, "ok"), http.StatusOK)
}

func CreateBillingOrderHandler(w http.ResponseWriter, r *http.Request) {
	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		utils.WriteApiResponse(w, utils.NewApiResponse[any](false, nil, "unauthorized"), http.StatusUnauthorized)
		return
	}
	var req models.CreateBillingOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		utils.WriteApiResponse(w, utils.NewApiResponse[any](false, nil, "malformed json request body"), http.StatusBadRequest)
		return
	}
	defer r.Body.Close()
	if errs := validation.Validate(validation.ValidateRequired(req.ProductId, "product_id")); len(errs) > 0 {
		validation.WriteValidationErrors(w, errs)
		return
	}
	order, err := usecases_impl.CreateBillingOrder(r.Context(), claims.UID, req.ProductId)
	if err != nil {
		writeBillingError(w, err)
		return
	}
	utils.WriteApiResponse(w, utils.NewApiResponse(true, order, "billing order created"), http.StatusCreated)
}

func CompleteDevelopmentPaymentHandler(w http.ResponseWriter, r *http.Request) {
	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		utils.WriteApiResponse(w, utils.NewApiResponse[any](false, nil, "unauthorized"), http.StatusUnauthorized)
		return
	}
	orderId := mux.Vars(r)["id"]
	if err := validation.ValidateUUID(orderId, "id"); err != nil {
		validation.WriteValidationErrors(w, []*validation.ValidationError{err})
		return
	}
	order, err := usecases_impl.CompleteDevelopmentPayment(r.Context(), claims.UID, orderId)
	if err != nil {
		writeBillingError(w, err)
		return
	}
	utils.WriteApiResponse(w, utils.NewApiResponse(true, order, "payment confirmed"), http.StatusOK)
}

func GetCurrentSubscriptionHandler(w http.ResponseWriter, r *http.Request) {
	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		utils.WriteApiResponse(w, utils.NewApiResponse[any](false, nil, "unauthorized"), http.StatusUnauthorized)
		return
	}
	subscription, err := usecases_impl.GetCurrentSubscription(r.Context(), claims.UID)
	if err != nil {
		writeBillingError(w, err)
		return
	}
	utils.WriteApiResponse(w, utils.NewApiResponse(true, subscription, "ok"), http.StatusOK)
}

func writeBillingError(w http.ResponseWriter, err error) {
	status := http.StatusInternalServerError
	if handleFuncErr, ok := err.(utils.HandlerFuncErr); ok {
		status = handleFuncErr.Status()
	}
	zap.L().Error(err.Error())
	utils.WriteApiResponse(w, utils.NewApiResponse[any](false, nil, err.Error()), status)
}
