import { routes } from "../../routes/routeConfig";
import type { ManagementContext, ManagementPageView } from "../../types/managementLiteral";
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

export function routePathToManagementPage(pathname: string): ManagementPageView {
  if (pathname.startsWith("/management/global/overview")) return "management-global-overview";
  if (pathname.startsWith("/management/global/universities")) return "management-global-universities";
  if (pathname.startsWith("/management/global/drafts")) return "management-global-drafts";
  if (pathname.startsWith("/management/global/applications")) return "management-global-applications";
  if (pathname.startsWith("/management/global/users")) return "management-global-users";
  if (pathname.startsWith("/management/global/service-logs")) return "management-global-service-logs";
  if (pathname.startsWith("/management/global/audit-logs")) return "management-global-audit-logs";
  if (pathname.startsWith("/management/global/settings")) return "management-global-settings";

  if (pathname.endsWith("/dashboard")) return "management-dashboard";
  if (pathname.endsWith("/profile")) return "management-university-profile";
  if (pathname.endsWith("/application-structure")) return "management-application-structure";
  if (pathname.endsWith("/applications")) return "management-applications";
  if (pathname.endsWith("/users")) return "management-users";
  if (pathname.endsWith("/billing")) return "management-billing";

  return "management-dashboard";
}

export function sourcePageToRoutePath(
  page: string,
  context: ManagementContext,
  fallbackUniversityId?: string | null,
): string | null {
  const universityId = resolveUniversityId(
    context.type === "university" ? context.universityId : null,
    fallbackUniversityId,
  );

  if (universityId) {
    const universityPageMap: Record<string, string> = {
      "management-dashboard": routes.management.university.dashboard(universityId),
      "university-dashboard": routes.management.university.dashboard(universityId),
      "management-university-profile": routes.management.university.profile(universityId),
      "university-profile": routes.management.university.profile(universityId),
      "university-settings": routes.management.university.applicationStructure(universityId),
      "management-application-structure": routes.management.university.applicationStructure(universityId),
      "management-applications": routes.management.university.applications(universityId),
      "university-applicants": routes.management.university.applications(universityId),
      "university-notifications": routes.management.university.applications(universityId),
      "university-applicant-detail": routes.management.university.applications(universityId),
      "management-users": routes.management.university.users(universityId),
      "management-billing": routes.management.university.billing(universityId),
    };
    if (universityPageMap[page]) {
      return universityPageMap[page];
    }
  }

  const globalPageMap: Record<string, string> = {
    "management-global-overview": routes.management.global.overview,
    "management-global-universities": routes.management.global.universities,
    "management-global-drafts": routes.management.global.drafts,
    "management-global-applications": routes.management.global.applications,
    "management-global-users": routes.management.global.users,
    "management-global-service-logs": routes.management.global.serviceLogs,
    "management-global-audit-logs": routes.management.global.auditLogs,
    "management-global-settings": routes.management.global.settings,
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
