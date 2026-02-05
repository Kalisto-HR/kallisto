// response.go provides generic API response types and helpers for consistent JSON responses.
package utils

import (
	"encoding/json"
	"net/http"
	"time"
)

type ApiResponse[T any] struct {
	Success   bool   `json:"success"`
	Data      T      `json:"data"`
	Message   string `json:"message"`
	Timestamp int64  `json:"timestamp"`
}

type PaginatedResponse[T any] struct {
	Items      []T `json:"items"`
	Total      int `json:"total"`
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	TotalPages int `json:"total_pages"`
}

func NewApiResponse[T any](success bool, data T, message string) ApiResponse[T] {
	return ApiResponse[T]{
		Success:   success,
		Data:      data,
		Message:   message,
		Timestamp: time.Now().Unix(),
	}
}

func NewPaginatedResponse[T any](items []T, total, page, limit int) PaginatedResponse[T] {
	totalPages := 0
	if limit > 0 {
		totalPages = (total + limit - 1) / limit
	}
	return PaginatedResponse[T]{
		Items:      items,
		Total:      total,
		Page:       page,
		Limit:      limit,
		TotalPages: totalPages,
	}
}

func WriteApiResponse[T any](w http.ResponseWriter, response ApiResponse[T], status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(response)
}
