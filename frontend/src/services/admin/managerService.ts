import { adminApi } from "../api/httpClient";
import type {
  ApplicationStructureVersion,
  ManagerDashboardPayload,
  ManagementStaffPagePayload,
  ManagementStaffRole,
  ManagementStaffStatus,
} from "../../types/domain";

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

export async function fetchManagementDashboard(_universityId: string): Promise<ManagerDashboardPayload> {
  void _universityId;
  const result = await adminApi.get<unknown>("/v1.0/partner/dashboard");
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
  _universityId: string,
  _query: ManagementStaffQuery = {},
): Promise<ManagementStaffPagePayload> {
  void _universityId;
  void _query;
  throw new Error("University-side user management has been removed");
}

export async function createManagementStaff(_universityId: string, payload: CreateManagementStaffPayload): Promise<void> {
  void _universityId;
  const result = await adminApi.post<{ msg: string }>("/v1.0/staff/accounts", {
    email: payload.email,
    password: payload.password,
    first_name: payload.firstName,
    last_name: payload.lastName,
    role: payload.staffRole === "staff" ? "staff" : "partner",
  });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to create staff");
  }
}

export async function updateManagementStaff(
  _universityId: string,
  _staffId: string,
  _payload: UpdateManagementStaffPayload,
): Promise<void> {
  void _universityId;
  void _staffId;
  void _payload;
  throw new Error("University-side user management has been removed");
}

export async function updateManagementStaffStatus(
  _universityId: string,
  _staffId: string,
  _status: ManagementStaffStatus,
  _reason?: string,
): Promise<void> {
  void _universityId;
  void _staffId;
  void _status;
  void _reason;
  throw new Error("University-side user management has been removed");
}

export async function resendManagementStaffInvite(_universityId: string, _staffId: string): Promise<void> {
  void _universityId;
  void _staffId;
  throw new Error("University-side user management has been removed");
}

export async function fetchApplicationStructureHistory(
  _universityId: string,
  limit = 20,
): Promise<ApplicationStructureVersion[]> {
  void _universityId;
  const result = await adminApi.get<{ items?: unknown[] }>(
    `/v1.0/partner/university/application-structure/history?limit=${limit}`,
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

export async function publishApplicationStructure(_universityId: string, changeNote?: string): Promise<void> {
  void _universityId;
  const result = await adminApi.post<{ id: string }>("/v1.0/partner/university/application-structure/publish", {
    change_note: changeNote,
  });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to publish application structure");
  }
}
