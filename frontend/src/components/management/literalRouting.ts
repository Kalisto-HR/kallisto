import { routes } from "../../routes/routeConfig";
import type { ManagementContext, ManagementPageView } from "../../types/managementLiteral";

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
  fallbackUniversityId: string,
): string | null {
  const universityId =
    context.type === "university" ? context.universityId : fallbackUniversityId;

  const universityPageMap: Record<string, string> = {
    "management-dashboard": routes.management.university.dashboard(universityId),
    "university-dashboard": routes.management.university.dashboard(universityId),
    "management-university-profile": routes.management.university.profile(universityId),
    "university-profile": routes.management.university.profile(universityId),
    "management-application-structure": routes.management.university.applicationStructure(universityId),
    "management-applications": routes.management.university.applications(universityId),
    "university-applicants": routes.management.university.applications(universityId),
    "management-users": routes.management.university.users(universityId),
    "management-billing": routes.management.university.billing(universityId),
  };

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

  return universityPageMap[page] ?? globalPageMap[page] ?? null;
}

export function getUniversityName(universityId?: string, fallback = "University Context"): string {
  if (!universityId) return fallback;
  if (universityId.length > 18) return fallback;
  return universityId
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}
