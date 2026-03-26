package authz

import "slices"

const (
	RoleApplicant = "applicant"
	RolePartner   = "partner"
	RoleStaff     = "staff"
)

var rolePermissions = map[string][]string{
	RoleApplicant: {
		"applicant.dashboard",
		"applicant.universities",
		"applicant.applications",
		"applicant.favorites",
		"applicant.compare",
		"applicant.basket",
		"applicant.profile",
	},
	RolePartner: {
		"partner.dashboard",
		"partner.university",
		"partner.application-structure",
		"partner.submissions",
		"partner.files",
	},
	RoleStaff: {
		"partner.dashboard",
		"partner.university",
		"partner.application-structure",
		"partner.submissions",
		"partner.files",
		"staff.dashboard",
		"staff.universities",
		"staff.accounts",
		"staff.service-logs",
		"staff.audit-logs",
		"staff.settings",
	},
}

func PermissionsForRole(role string) []string {
	permissions, ok := rolePermissions[role]
	if !ok {
		return nil
	}

	cloned := make([]string, len(permissions))
	copy(cloned, permissions)
	return cloned
}

func HasPermission(role string, permissions []string, required string) bool {
	if required == "" {
		return false
	}

	if len(permissions) == 0 {
		permissions = PermissionsForRole(role)
	}

	return slices.Contains(permissions, required)
}

func HasAnyPermission(role string, permissions []string, required ...string) bool {
	for _, item := range required {
		if HasPermission(role, permissions, item) {
			return true
		}
	}

	return false
}
