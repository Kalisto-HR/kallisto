package usecases_impl

import (
	"kallisto/services/admin/internal/models"
)

type signInUsecaseImpl struct {
	request models.SignInRequest
}

func NewSignInUseCase(req *models.SignInRequest) *signInUsecaseImpl {
	return &signInUsecaseImpl{
		request: *req,
	}
}

func (uc *signInUsecaseImpl) SignIn() (string, error) {
	// set up using database
	return "", nil
}
