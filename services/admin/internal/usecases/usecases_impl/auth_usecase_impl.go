package usecases_impl

import (
	"errors"
	"kallisto/services/admin/internal/models"
)

type authUseCaseImpl struct {
	users map[string]models.User
}

func NewAuthUseCase() *authUseCaseImpl {
	return &authUseCaseImpl{
		users: make(map[string]models.User),
	}
}

func (uc *authUseCaseImpl) Register(req models.RegisterRequest) error {
	if _, exists := uc.users[req.Email]; exists {
		return errors.New("user already exists")
	}

	uc.users[req.Email] = models.User{
		Email:    req.Email,
		Name:     req.Name,
		Password: req.Password,
	}
	return nil
}

func (uc *authUseCaseImpl) Login(req models.LoginRequest) (string, error) {
	user, exists := uc.users[req.Email]
	if !exists || user.Password != req.Password {
		return "", errors.New("invalid credentials")
	}

	return "", nil
}
