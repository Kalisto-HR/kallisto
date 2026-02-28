import { adminApi } from "../api/httpClient";
import type {
  ApplicationStructureVersion,
  ManagerDashboardPayload,
  ManagementStaffPagePayload,
  ManagementStaffRole,
  ManagementStaffStatus,
} from "../../types/domain";
import { normalizePagination } from "../mappers/responseMappers";

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toBool(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function normalizeDashboard(value: unknown): ManagerDashboardPayload {
  const source = (value ?? {}) as Record<string, unknown>;
  const recentsRaw: unknown[] = Array.isArray(source.recent_applications ?? source.recentApplications)
    ? ((source.recent_applications ?? source.recentApplications) as unknown[])
    : [];
  const notificationsRaw: unknown[] = Array.isArray(source.notifications) ? (source.notifications as unknown[]) : [];

  return {
    newApplications: toNumber(source.new_applications ?? source.newApplications),
    totalApplicants: toNumber(source.total_applicants ?? source.totalApplicants),
    avgSAT: toNumber(source.avg_sat ?? source.avgSAT),
    avgIELTS: toNumber(source.avg_ielts ?? source.avgIELTS),
    maleCount: toNumber(source.male_count ?? source.maleCount),
    femaleCount: toNumber(source.female_count ?? source.femaleCount),
    recentApplications: recentsRaw.map((value) => {
      const item = (value ?? {}) as Record<string, unknown>;
      return {
        id: toString(item.id),
        name: toString(item.name),
        program: toString(item.program),
        citizenship: toString(item.citizenship),
        status: toString(item.status) as ManagerDashboardPayload["recentApplications"][number]["status"],
        submittedAt: toNullableString(item.submitted_at ?? item.submittedAt),
      };
    }),
    notifications: notificationsRaw.map((value) => {
      const item = (value ?? {}) as Record<string, unknown>;
      return {
        id: toString(item.id),
        type: toString(item.type),
        message: toString(item.message),
        time: toString(item.time),
        read: toBool(item.read),
      };
    }),
  };
}

export async function fetchManagementDashboard(universityId: string): Promise<ManagerDashboardPayload> {
  const result = await adminApi.get<unknown>(`/v1.0/universities/${universityId}/dashboard`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load dashboard");
  }
  return normalizeDashboard(result.data);
}

export interface ManagementStaffQuery {
  search?: string;
  role?: ManagementStaffRole | "all";
  status?: ManagementStaffStatus | "all";
  page?: number;
  limit?: number;
}

export interface CreateManagementStaffPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  staffRole?: ManagementStaffRole;
  status?: ManagementStaffStatus;
}

export interface UpdateManagementStaffPayload {
  email?: string;
  firstName?: string;
  lastName?: string;
  staffRole?: ManagementStaffRole;
}

export async function fetchManagementStaff(
  universityId: string,
  query: ManagementStaffQuery = {},
): Promise<ManagementStaffPagePayload> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.role && query.role !== "all") params.set("role", query.role);
  if (query.status && query.status !== "all") params.set("status", query.status);
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 20));

  const result = await adminApi.get<unknown>(`/v1.0/universities/${universityId}/staff?${params.toString()}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load staff");
  }

  const pageData = normalizePagination<unknown>(result.data);
  const source = (result.data ?? {}) as Record<string, unknown>;
  const invitationsRaw = Array.isArray(source.invitations) ? source.invitations : [];
  const rolesRaw = Array.isArray(source.roles) ? source.roles : [];

  return {
    ...pageData,
    items: pageData.items.map((value) => {
      const item = (value ?? {}) as Record<string, unknown>;
      return {
        id: toString(item.id),
        email: toString(item.email),
        firstName: toString(item.first_name ?? item.firstName),
        lastName: toString(item.last_name ?? item.lastName),
        staffRole: toString(item.staff_role ?? item.staffRole) as ManagementStaffRole,
        status: toString(item.status) as ManagementStaffStatus,
        lastActiveAt: toNullableString(item.last_active_at ?? item.lastActiveAt),
        createdAt: toString(item.created_at ?? item.createdAt),
      };
    }),
    invitations: invitationsRaw.map((value) => {
      const item = (value ?? {}) as Record<string, unknown>;
      return {
        id: toString(item.id),
        email: toString(item.email),
        staffRole: toString(item.staff_role ?? item.staffRole) as ManagementStaffRole,
        status: toString(item.status) as ManagementStaffPagePayload["invitations"][number]["status"],
        createdAt: toString(item.created_at ?? item.createdAt),
        expiresAt: toString(item.expires_at ?? item.expiresAt),
      };
    }),
    roles: rolesRaw.map((value) => {
      const item = (value ?? {}) as Record<string, unknown>;
      const permissions = Array.isArray(item.permissions)
        ? item.permissions.filter((permission): permission is string => typeof permission === "string")
        : [];
      return {
        id: toString(item.id),
        name: toString(item.name) as ManagementStaffRole,
        description: toString(item.description),
        userCount: toNumber(item.user_count ?? item.userCount),
        permissions,
      };
    }),
  };
}

export async function createManagementStaff(universityId: string, payload: CreateManagementStaffPayload): Promise<void> {
  const result = await adminApi.post<{ msg: string }>(`/v1.0/universities/${universityId}/staff`, {
    email: payload.email,
    password: payload.password,
    first_name: payload.firstName,
    last_name: payload.lastName,
    staff_role: payload.staffRole,
    status: payload.status,
  });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to create staff");
  }
}

export async function updateManagementStaff(
  universityId: string,
  staffId: string,
  payload: UpdateManagementStaffPayload,
): Promise<void> {
  const result = await adminApi.put<{ msg: string }>(`/v1.0/universities/${universityId}/staff/${staffId}`, {
    email: payload.email,
    first_name: payload.firstName,
    last_name: payload.lastName,
    staff_role: payload.staffRole,
  });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to update staff");
  }
}

export async function updateManagementStaffStatus(
  universityId: string,
  staffId: string,
  status: ManagementStaffStatus,
  reason?: string,
): Promise<void> {
  const result = await adminApi.put<{ msg: string }>(`/v1.0/universities/${universityId}/staff/${staffId}/status`, {
    status,
    reason,
  });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to update staff status");
  }
}

export async function resendManagementStaffInvite(universityId: string, staffId: string): Promise<void> {
  const result = await adminApi.post<{ msg: string }>(`/v1.0/universities/${universityId}/staff/${staffId}/resend-invite`);
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to resend invitation");
  }
}

export async function fetchApplicationStructureHistory(
  universityId: string,
  limit = 20,
): Promise<ApplicationStructureVersion[]> {
  const result = await adminApi.get<{ items?: unknown[] }>(
    `/v1.0/universities/${universityId}/application-structure/history?limit=${limit}`,
  );
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load structure history");
  }
  const items = Array.isArray(result.data.items) ? result.data.items : [];
  return items.map((value) => {
    const item = (value ?? {}) as Record<string, unknown>;
    return {
      id: toString(item.id),
      universityId: toString(item.university_id ?? item.universityId),
      versionNo: toNumber(item.version_no ?? item.versionNo),
      schema: toRecord(item.schema),
      published: toBool(item.published),
      changedBy: toNullableString(item.changed_by ?? item.changedBy),
      changeNote: toNullableString(item.change_note ?? item.changeNote),
      createdAt: toString(item.created_at ?? item.createdAt),
    };
  });
}

export async function publishApplicationStructure(universityId: string, changeNote?: string): Promise<void> {
  const result = await adminApi.post<{ id: string }>(`/v1.0/universities/${universityId}/application-structure/publish`, {
    change_note: changeNote,
  });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to publish application structure");
  }
}
