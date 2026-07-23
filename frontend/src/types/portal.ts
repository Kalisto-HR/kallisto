export type PortalUserRole = "partner" | "staff";

export type PortalContext =
  | { type: "global" }
  | { type: "university"; universityId: string; universityName: string };

export type PortalPageView =
  | "partner-dashboard"
  | "partner-university-profile"
  | "partner-application-builder"
  | "partner-applications"
  | "staff-dashboard"
  | "staff-students"
  | "staff-universities"
  | "staff-programs"
  | "staff-applications"
  | "staff-document-review"
  | "staff-payments"
  | "staff-analytics"
  | "staff-notifications"
  | "staff-admin-users"
  | "staff-service-logs"
  | "staff-audit-logs"
  | "staff-settings";
