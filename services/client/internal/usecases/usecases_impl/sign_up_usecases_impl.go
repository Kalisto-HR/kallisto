package usecases_impl

import (
	"kallisto/services/client/internal/models"
)

type signUpUsecaseImpl struct {
	request models.SignUpRequest
}

func NewSignUpUseCase(req *models.SignUpRequest) *signUpUsecaseImpl {
	return &signUpUsecaseImpl{
		request: *req,
	}
}

func (uc *signUpUsecaseImpl) SignUp() (string, error) {
	// set up using database
	return "", nil
}
