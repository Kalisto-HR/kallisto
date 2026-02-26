export type ManagementUserRole = "university-manager" | "superuser";

export type ManagementContext =
  | { type: "global" }
  | { type: "university"; universityId: string; universityName: string };

export type ManagementPageView =
  | "management-dashboard"
  | "management-university-profile"
  | "management-application-structure"
  | "management-applications"
  | "management-users"
  | "management-billing"
  | "management-global-overview"
  | "management-global-universities"
  | "management-global-drafts"
  | "management-global-applications"
  | "management-global-users"
  | "management-global-service-logs"
  | "management-global-audit-logs"
  | "management-global-settings";
