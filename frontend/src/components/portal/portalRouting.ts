import { routes } from "../../routes/routeConfig";
import type { PortalContext, PortalPageView } from "../../types/portal";
import { isValidUUID } from "../../utils/validation";

export function resolveUniversityId(primaryId?: string | null, fallbackId?: string | null): string | null {
  const primary = primaryId?.trim() ?? "";
  if (primary && isValidUUID(primary)) {
    return primary;
  }

  const fallback = fallbackId?.trim() ?? "";
  if (fallback && isValidUUID(fallback)) {
    return fallback;
  }

  return null;
}

export function routePathToPortalPage(pathname: string): PortalPageView {
  if (pathname.startsWith("/staff/dashboard")) return "staff-dashboard";
  if (pathname.startsWith("/staff/students")) return "staff-students";
  if (pathname.startsWith("/staff/universities")) return "staff-universities";
  if (pathname.startsWith("/staff/programs")) return "staff-programs";
  if (pathname.startsWith("/staff/applications")) return "staff-applications";
  if (pathname.startsWith("/staff/document-review")) return "staff-document-review";
  if (pathname.startsWith("/staff/payments")) return "staff-payments";
  if (pathname.startsWith("/staff/analytics")) return "staff-analytics";
  if (pathname.startsWith("/staff/notifications")) return "staff-notifications";
  if (pathname.startsWith("/staff/admin-users")) return "staff-admin-users";
  if (pathname.startsWith("/staff/service-logs")) return "staff-service-logs";
  if (pathname.startsWith("/staff/audit-logs")) return "staff-audit-logs";
  if (pathname.startsWith("/staff/settings")) return "staff-settings";

  if (pathname.endsWith("/dashboard")) return "partner-dashboard";
  if (pathname.endsWith("/profile")) return "partner-university-profile";
  if (pathname.endsWith("/application-structure")) return "partner-application-structure";
  if (pathname.endsWith("/applications")) return "partner-applications";

  return "staff-dashboard";
}

export function portalPageToRoutePath(
  page: string,
  context: PortalContext,
  fallbackUniversityId?: string | null,
): string | null {
  const universityId = resolveUniversityId(
    context.type === "university" ? context.universityId : null,
    fallbackUniversityId,
  );

  if (universityId) {
    const universityPageMap: Record<string, string> = {
      "partner-dashboard": routes.partner.dashboard(universityId),
      "partner-university-profile": routes.partner.profile(universityId),
      "partner-application-structure": routes.partner.applicationStructure(universityId),
      "partner-applications": routes.partner.applications(universityId),
    };
    if (universityPageMap[page]) {
      return universityPageMap[page];
    }
  }

  const globalPageMap: Record<string, string> = {
    "staff-dashboard": routes.staff.dashboard,
    "staff-students": routes.staff.students,
    "staff-universities": routes.staff.universities,
    "staff-programs": routes.staff.programs,
    "staff-applications": routes.staff.applications,
    "staff-document-review": routes.staff.documentReview,
    "staff-payments": routes.staff.payments,
    "staff-analytics": routes.staff.analytics,
    "staff-notifications": routes.staff.notifications,
    "staff-admin-users": routes.staff.adminUsers,
    "staff-service-logs": routes.staff.serviceLogs,
    "staff-audit-logs": routes.staff.auditLogs,
    "staff-settings": routes.staff.settings,
  };

  return globalPageMap[page] ?? null;
}

export function getUniversityName(universityId?: string, fallback = "University Context"): string {
  if (!universityId) return fallback;
  if (isValidUUID(universityId)) return fallback;
  return universityId
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
