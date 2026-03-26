export type ManagementUserRole = "partner" | "staff";

export type ManagementContext =
  | { type: "global" }
  | { type: "university"; universityId: string; universityName: string };

export type ManagementPageView =
  | "partner-dashboard"
  | "partner-university-profile"
  | "partner-application-structure"
  | "partner-applications"
  | "staff-dashboard"
  | "staff-universities"
  | "staff-service-logs"
  | "staff-audit-logs"
  | "staff-settings";
