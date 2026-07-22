type QueryValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryValue>;

const API_PREFIX = "/v1.0";

function withQuery(path: string, params?: QueryParams): string {
  if (!params) {
    return path;
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      continue;
    }

    const normalized = String(value).trim();
    if (!normalized) {
      continue;
    }

    search.set(key, normalized);
  }

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

function segment(value: string): string {
  return encodeURIComponent(value);
}

export const apiRoutes = {
  auth: {
    signIn: () => `${API_PREFIX}/auth/sign-in`,
    signUp: () => `${API_PREFIX}/auth/sign-up`,
    signOut: () => `${API_PREFIX}/auth/sign-out`,
    session: () => `${API_PREFIX}/auth/session`,
    forgotPassword: () => `${API_PREFIX}/auth/password/forgot`,
    resetPassword: () => `${API_PREFIX}/auth/password/reset`,
  },
  applicant: {
    universities: {
      list: (page = 1, limit = 10) =>
        withQuery(`${API_PREFIX}/applicant/universities`, { page, limit }),
      search: (params: QueryParams) =>
        withQuery(`${API_PREFIX}/applicant/universities/search`, params),
      detail: (id: string) => `${API_PREFIX}/applicant/universities/${segment(id)}`,
      favorite: (id: string) => `${API_PREFIX}/applicant/universities/${segment(id)}/favorite`,
    },
    applications: {
      list: () => `${API_PREFIX}/applicant/applications`,
      detail: (universityId: string, cycle: string) =>
        `${API_PREFIX}/applicant/applications/${segment(universityId)}/${segment(cycle)}`,
      submit: (universityId: string, cycle: string) =>
        `${API_PREFIX}/applicant/applications/${segment(universityId)}/${segment(cycle)}/submit`,
      importTestScores: (universityId: string, cycle: string) =>
        `${API_PREFIX}/applicant/applications/${segment(universityId)}/${segment(cycle)}/import-test-scores`,
      uploadFiles: (params: QueryParams) =>
        withQuery(`${API_PREFIX}/applicant/application-files/upload`, params),
    },
    basket: {
      plans: () => `${API_PREFIX}/applicant/basket/plans`,
      state: () => `${API_PREFIX}/applicant/basket`,
      item: (universityId: string) => `${API_PREFIX}/applicant/basket/${segment(universityId)}`,
      plan: () => `${API_PREFIX}/applicant/basket/plan`,
      checkoutPreview: () => `${API_PREFIX}/applicant/basket/checkout-preview`,
    },
    compare: {
      list: () => `${API_PREFIX}/applicant/compare`,
      item: (universityId: string) => `${API_PREFIX}/applicant/compare/${segment(universityId)}`,
    },
    favorites: {
      list: () => `${API_PREFIX}/applicant/favorites`,
    },
    fitScore: {
      calculate: () => `${API_PREFIX}/applicant/fit-score/calculate`,
    },
    profile: {
      base: () => `${API_PREFIX}/applicant/profile`,
      password: () => `${API_PREFIX}/applicant/profile/password`,
      photo: () => `${API_PREFIX}/applicant/profile/photo`,
      testScores: () => `${API_PREFIX}/applicant/profile/test-scores`,
      testScore: (id: string) => `${API_PREFIX}/applicant/profile/test-scores/${segment(id)}`,
    },
  },
  partner: {
    dashboard: () => `${API_PREFIX}/partner/dashboard`,
    analytics: {
      contacts: (stage: string) => withQuery(`${API_PREFIX}/partner/analytics/contacts`, { stage }),
    },
    submissions: {
      list: (params: QueryParams) => withQuery(`${API_PREFIX}/partner/applications`, params),
      detail: (id: string) => `${API_PREFIX}/partner/applications/${segment(id)}`,
      status: (id: string) => `${API_PREFIX}/partner/applications/${segment(id)}/status`,
      fileDownload: (applicationId: string, fileId: string) =>
        `${API_PREFIX}/partner/applications/${segment(applicationId)}/files/${segment(fileId)}/download`,
    },
    university: {
      profile: () => `${API_PREFIX}/partner/university/profile`,
      applicationStructure: () => `${API_PREFIX}/partner/university/application-structure`,
      applicationStructureHistory: (limit = 20) =>
        withQuery(`${API_PREFIX}/partner/university/application-structure/history`, { limit }),
      publishApplicationStructure: () =>
        `${API_PREFIX}/partner/university/application-structure/publish`,
    },
  },
  staff: {
    dashboard: () => `${API_PREFIX}/staff/dashboard`,
    students: {
      list: (params: QueryParams) => withQuery(`${API_PREFIX}/staff/students`, params),
    },
    universities: {
      list: (params: QueryParams) => withQuery(`${API_PREFIX}/staff/universities`, params),
      detail: (id: string) => `${API_PREFIX}/staff/universities/${segment(id)}`,
      applicationStructure: (id: string) =>
        `${API_PREFIX}/staff/universities/${segment(id)}/application-structure`,
    },
    logs: {
      service: (params: QueryParams) => withQuery(`${API_PREFIX}/staff/service-logs`, params),
      audit: (params: QueryParams) => withQuery(`${API_PREFIX}/staff/audit-logs`, params),
    },
    settings: {
      base: () => `${API_PREFIX}/staff/settings`,
    },
  },
};

export function buildApiProxyUrl(path: string): string {
  return path.startsWith("/api") ? path : `/api${path}`;
}

export function isPublicAuthRoute(path: string): boolean {
  const normalizedPath = path.split("?")[0] ?? path;

  return (
    normalizedPath === apiRoutes.auth.signIn() ||
    normalizedPath === apiRoutes.auth.signUp() ||
    normalizedPath === apiRoutes.auth.forgotPassword() ||
    normalizedPath === apiRoutes.auth.resetPassword()
  );
}
