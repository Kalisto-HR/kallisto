package handlers

import (
	"io"
	"net/http"
	"strconv"
	"strings"

	"kallisto/infra/middlewares"
	"kallisto/infra/utils"
	"kallisto/infra/validation"
	"kallisto/services/client/internal/models"
	"kallisto/services/client/internal/usecases/usecases_impl"

	"github.com/gorilla/mux"
	"go.uber.org/zap"
)

const (
	maxUploadFileSize = 15 * 1024 * 1024 // 15 MB per file
	maxUploadBodySize = 50 * 1024 * 1024 // 50 MB per request
)

func UploadApplicationFilesHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	universityId := strings.TrimSpace(r.URL.Query().Get("university_id"))
	cycle := strings.TrimSpace(r.URL.Query().Get("cycle"))
	fieldKeyRaw := strings.TrimSpace(r.URL.Query().Get("field_key"))

	errors := validation.Validate(
		validation.ValidateRequired(universityId, "university_id"),
		validation.ValidateUUID(universityId, "university_id"),
		validation.ValidateRequired(cycle, "cycle"),
	)
	if len(errors) > 0 {
		validation.WriteValidationErrors(w, errors)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBodySize)
	if err := r.ParseMultipartForm(maxUploadBodySize); err != nil {
		resp := utils.NewApiResponse[any](false, nil, "invalid multipart request or files are too large")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}

	headers := r.MultipartForm.File["files"]
	if len(headers) == 0 {
		resp := utils.NewApiResponse[any](false, nil, "at least one file is required")
		utils.WriteApiResponse(w, resp, http.StatusBadRequest)
		return
	}

	uploads := make([]models.ApplicationFileUpload, 0, len(headers))
	for _, header := range headers {
		if header.Size > maxUploadFileSize {
			resp := utils.NewApiResponse[any](false, nil, "each file must be 15MB or smaller")
			utils.WriteApiResponse(w, resp, http.StatusBadRequest)
			return
		}

		file, err := header.Open()
		if err != nil {
			resp := utils.NewApiResponse[any](false, nil, "failed to read uploaded file")
			utils.WriteApiResponse(w, resp, http.StatusBadRequest)
			return
		}

		content, readErr := io.ReadAll(file)
		closeErr := file.Close()
		if readErr != nil || closeErr != nil {
			resp := utils.NewApiResponse[any](false, nil, "failed to process uploaded file")
			utils.WriteApiResponse(w, resp, http.StatusBadRequest)
			return
		}

		contentType := header.Header.Get("Content-Type")
		if strings.TrimSpace(contentType) == "" {
			contentType = "application/octet-stream"
		}

		uploads = append(uploads, models.ApplicationFileUpload{
			FileName:    header.Filename,
			ContentType: contentType,
			FileSize:    int64(len(content)),
			FileData:    content,
		})
	}

	var fieldKey *string
	if fieldKeyRaw != "" {
		fieldKey = &fieldKeyRaw
	}

	savedFiles, err := usecases_impl.SaveApplicationFiles(r.Context(), claims.UID, universityId, cycle, fieldKey, uploads)
	if err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, err.Error())
		utils.WriteApiResponse(w, resp, status)
		return
	}

	response := make([]models.ApplicationFileResponse, 0, len(savedFiles))
	for _, file := range savedFiles {
		response = append(response, models.ApplicationFileResponse{
			Id:          file.Id,
			Name:        file.FileName,
			Type:        file.ContentType,
			Size:        file.FileSize,
			Storage:     "application_file",
			DownloadURL: "/api/v1.0/application-files/" + file.Id + "/download",
		})
	}

	resp := utils.NewApiResponse(true, response, "files uploaded")
	utils.WriteApiResponse(w, resp, http.StatusCreated)
}

func DownloadApplicationFileHandler(w http.ResponseWriter, r *http.Request) {
	log := zap.L()

	claims, err := middlewares.GetClaimsFromContext(r.Context())
	if err != nil {
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, "unauthorized")
		utils.WriteApiResponse(w, resp, http.StatusUnauthorized)
		return
	}

	fileId := mux.Vars(r)["fileId"]
	if err := validation.ValidateUUID(fileId, "fileId"); err != nil {
		validation.WriteValidationErrors(w, []*validation.ValidationError{err})
		return
	}

	file, err := usecases_impl.GetApplicationFileByIdForUser(r.Context(), claims.UID, fileId)
	if err != nil {
		handleFuncErr, ok := err.(utils.HandlerFuncErr)
		status := http.StatusInternalServerError
		if ok {
			status = handleFuncErr.Status()
		}
		log.Error(err.Error())
		resp := utils.NewApiResponse[any](false, nil, err.Error())
		utils.WriteApiResponse(w, resp, status)
		return
	}

	contentType := strings.TrimSpace(file.ContentType)
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	disposition := "attachment"
	if strings.HasPrefix(contentType, "image/") || contentType == "application/pdf" {
		disposition = "inline"
	}

	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Content-Length", strconv.FormatInt(file.FileSize, 10))
	w.Header().Set("Content-Disposition", disposition+`; filename="`+file.FileName+`"`)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(file.FileData)
}
