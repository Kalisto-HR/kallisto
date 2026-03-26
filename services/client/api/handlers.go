package api

import internal "kallisto/services/client/internal/handlers"

var (
	ForgotPasswordHandler           = internal.ForgotPasswordHandler
	ResetPasswordHandler            = internal.ResetPasswordHandler
	GetUniversitiesHandler          = internal.GetUniversitiesHandler
	SearchUniversitiesHandler       = internal.SearchUniversitiesHandler
	GetUniversityHandler            = internal.GetUniversityHandler
	IsFavoriteHandler               = internal.IsFavoriteHandler
	AddFavoriteHandler              = internal.AddFavoriteHandler
	RemoveFavoriteHandler           = internal.RemoveFavoriteHandler
	GetFavoritesHandler             = internal.GetFavoritesHandler
	GetCompareHandler               = internal.GetCompareHandler
	ClearCompareHandler             = internal.ClearCompareHandler
	AddCompareHandler               = internal.AddCompareHandler
	RemoveCompareHandler            = internal.RemoveCompareHandler
	GetBasketHandler                = internal.GetBasketHandler
	ClearBasketHandler              = internal.ClearBasketHandler
	GetBasketPlansHandler           = internal.GetBasketPlansHandler
	UpdateBasketPlanHandler         = internal.UpdateBasketPlanHandler
	BasketCheckoutPreviewHandler    = internal.BasketCheckoutPreviewHandler
	AddBasketItemHandler            = internal.AddBasketItemHandler
	RemoveBasketItemHandler         = internal.RemoveBasketItemHandler
	GetApplicationsHandler          = internal.GetApplicationsHandler
	CreateApplicationHandler        = internal.CreateApplicationHandler
	GetApplicationHandler           = internal.GetApplicationHandler
	UpdateApplicationHandler        = internal.UpdateApplicationHandler
	ImportApplicationTestScoresHandler = internal.ImportApplicationTestScoresHandler
	SubmitApplicationHandler        = internal.SubmitApplicationHandler
	DeleteApplicationHandler        = internal.DeleteApplicationHandler
	UploadApplicationFilesHandler   = internal.UploadApplicationFilesHandler
	DownloadApplicationFileHandler  = internal.DownloadApplicationFileHandler
	GetProfileHandler               = internal.GetProfileHandler
	UpdateProfileHandler            = internal.UpdateProfileHandler
	UpdatePasswordHandler           = internal.UpdatePasswordHandler
	UpdateProfilePhotoHandler       = internal.UpdateProfilePhotoHandler
	GetProfilePhotoHandler          = internal.GetProfilePhotoHandler
	GetProfileTestScoresHandler     = internal.GetProfileTestScoresHandler
	CreateProfileTestScoreHandler   = internal.CreateProfileTestScoreHandler
	UpdateProfileTestScoreHandler   = internal.UpdateProfileTestScoreHandler
	DeleteProfileTestScoreHandler   = internal.DeleteProfileTestScoreHandler
	DeleteProfileHandler            = internal.DeleteProfileHandler
)
