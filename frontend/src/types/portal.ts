export type PortalUserRole = "partner" | "staff";

export type PortalContext =
  | { type: "global" }
  | { type: "university"; universityId: string; universityName: string };

export type PortalPageView =
  | "partner-dashboard"
  | "partner-university-profile"
  | "partner-application-structure"
  | "partner-applications"
  | "staff-dashboard"
  | "staff-universities"
  | "staff-service-logs"
  | "staff-audit-logs"
  | "staff-settings";
