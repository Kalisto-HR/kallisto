package api

import internal "kallisto/services/admin/internal/handlers"

var (
	GetUniversityDashboardHandler            = internal.GetUniversityDashboardHandler
	GetUniversityHandler                     = internal.GetUniversityHandler
	UpdateUniversityHandler                  = internal.UpdateUniversityHandler
	GetUniversityApplicationStructureHandler = internal.GetUniversityApplicationStructureHandler
	UpdateUniversityApplicationStructureHandler = internal.UpdateUniversityApplicationStructureHandler
	GetApplicationStructureHistoryHandler    = internal.GetApplicationStructureHistoryHandler
	PublishApplicationStructureHandler       = internal.PublishApplicationStructureHandler
	GetApplicationsHandler                   = internal.GetApplicationsHandler
	GetApplicationHandler                    = internal.GetApplicationHandler
	ListSubmittedApplicationFilesHandler     = internal.ListSubmittedApplicationFilesHandler
	DownloadSubmittedApplicationFileHandler  = internal.DownloadSubmittedApplicationFileHandler
	GetGlobalOverviewHandler                 = internal.GetGlobalOverviewHandler
	GetUniversitiesHandler                   = internal.GetUniversitiesHandler
	CreateUniversityHandler                  = internal.CreateUniversityHandler
	ImportUniversitiesHandler                = internal.ImportUniversitiesHandler
	DeleteUniversityHandler                  = internal.DeleteUniversityHandler
	GetGlobalServiceLogsHandler              = internal.GetGlobalServiceLogsHandler
	GetGlobalAuditLogsHandler                = internal.GetGlobalAuditLogsHandler
	GetGlobalSettingsHandler                 = internal.GetGlobalSettingsHandler
	UpdateGlobalSettingsHandler              = internal.UpdateGlobalSettingsHandler
)
