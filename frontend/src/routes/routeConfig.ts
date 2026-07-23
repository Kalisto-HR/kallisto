import type { PortalRole } from "../types/session";

export const routes = {
  auth: {
    signIn: "/auth/sign-in",
    signUp: "/auth/sign-up",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
  },
  forbidden: "/forbidden",
  applicant: {
    dashboard: "/applicant/dashboard",
    universities: "/applicant/universities",
    universityDetail: (id: string) => `/applicant/universities/${id}`,
    programDetail: (universityId: string, programId: string) => `/applicant/universities/${universityId}/programs/${programId}`,
    basket: "/applicant/basket",
    applications: "/applicant/applications",
    applicationDetail: (universityId: string, cycle: string) => `/applicant/applications/${universityId}/${cycle}`,
    applicationCreate: (universityId: string) => `/applicant/applications/new/${universityId}`,
    compare: "/applicant/compare",
    settings: "/applicant/settings",
    help: "/applicant/help",
    billing: "/applicant/billing",
  },
  partner: {
    dashboard: (universityId: string) => `/partner/${universityId}/dashboard`,
    profile: (universityId: string) => `/partner/${universityId}/profile`,
    applicationBuilder: (universityId: string) => `/partner/${universityId}/application-builder`,
    applications: (universityId: string) => `/partner/${universityId}/applications`,
  },
  staff: {
    dashboard: "/staff/dashboard",
    students: "/staff/students",
    universities: "/staff/universities",
    programs: "/staff/programs",
    applications: "/staff/applications",
    documentReview: "/staff/document-review",
    payments: "/staff/payments",
    analytics: "/staff/analytics",
    notifications: "/staff/notifications",
    adminUsers: "/staff/admin-users",
    universityDetail: (id: string) => `/staff/universities/${id}`,
    universityEdit: (id: string) => `/staff/universities/${id}/edit`,
    serviceLogs: "/staff/service-logs",
    auditLogs: "/staff/audit-logs",
    settings: "/staff/settings",
  },
} as const;

export function getDefaultRouteForRole(role: PortalRole, universityLinked?: string | null): string {
  if (role === "partner" && universityLinked) {
    return routes.partner.profile(universityLinked);
  }

  if (role === "staff") {
    return routes.staff.dashboard;
  }

  return routes.applicant.dashboard;
}
