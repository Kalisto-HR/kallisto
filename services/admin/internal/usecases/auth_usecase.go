package usecases

import "kallisto/services/admin/internal/models"

type AuthUseCase interface {
	Register(req models.RegisterRequest) error
	Login(req models.LoginRequest) (string, error)
}
