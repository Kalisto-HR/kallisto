package validation

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strings"
)

var uuidRegex = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

func ValidateUUID(value, fieldName string) *ValidationError {
	if !uuidRegex.MatchString(value) {
		return &ValidationError{
			Field:   fieldName,
			Message: "must be a valid UUID",
		}
	}
	return nil
}

func ValidateEmail(value, fieldName string) *ValidationError {
	atIndex := strings.Index(value, "@")
	if atIndex == -1 {
		return &ValidationError{
			Field:   fieldName,
			Message: "must be a valid email address",
		}
	}
	afterAt := value[atIndex+1:]
	if !strings.Contains(afterAt, ".") {
		return &ValidationError{
			Field:   fieldName,
			Message: "must be a valid email address",
		}
	}
	return nil
}

func ValidateRequired(value, fieldName string) *ValidationError {
	if strings.TrimSpace(value) == "" {
		return &ValidationError{
			Field:   fieldName,
			Message: "is required",
		}
	}
	return nil
}

func ValidateMinLength(value, fieldName string, min int) *ValidationError {
	if len(value) < min {
		return &ValidationError{
			Field:   fieldName,
			Message: fmt.Sprintf("must be at least %d characters", min),
		}
	}
	return nil
}

func ValidateMaxLength(value, fieldName string, max int) *ValidationError {
	if len(value) > max {
		return &ValidationError{
			Field:   fieldName,
			Message: fmt.Sprintf("must be at most %d characters", max),
		}
	}
	return nil
}

func ValidateInList(value, fieldName string, allowed []string) *ValidationError {
	for _, v := range allowed {
		if value == v {
			return nil
		}
	}
	return &ValidationError{
		Field:   fieldName,
		Message: fmt.Sprintf("must be one of: %s", strings.Join(allowed, ", ")),
	}
}

func Validate(errs ...*ValidationError) []*ValidationError {
	var result []*ValidationError
	for _, err := range errs {
		if err != nil {
			result = append(result, err)
		}
	}
	return result
}

func WriteValidationErrors(w http.ResponseWriter, errs []*ValidationError) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": false,
		"message": "validation failed",
		"errors":  errs,
	})
}
