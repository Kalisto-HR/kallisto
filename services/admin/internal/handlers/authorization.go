package handlers

import (
	"services/admin/internal/models"
	"services/admin/internal/usecases"

	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
	AuthUC usecases.AuthUseCase
}

func (h *AuthHandler) SignUp(c *fiber.Ctx) error {
	var req models.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}
	err := h.AuthUC.Register(req)
	if err != nil {
		return fiber.NewError(fiber.StatusConflict, err.Error())
	}
	return c.SendStatus(fiber.StatusCreated)
}

func (h *AuthHandler) SignIn(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid body")
	}
	token, err := h.AuthUC.Login(req)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, err.Error())
	}
	return c.JSON(models.LoginResponse{AccessToken: token})
}
