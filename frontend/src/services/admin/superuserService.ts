import { adminApi } from "../api/httpClient";
import { normalizePagination } from "../mappers/responseMappers";
import type { Pagination } from "../../types/domain";

export interface SuperuserOverviewPayload {
  stats: {
    total_universities: number;
    management_accounts: number;
    total_applications: number;
  };
  recent_activity: Array<{
    id: string;
    type: string;
    description: string;
    user: string;
    timestamp: string;
    status: string;
  }>;
  system_health: Array<{
    label: string;
    value: string;
    status: string;
  }>;
}

export interface SuperuserUniversityItem {
  id: string;
  name: string;
  name_en: string;
  type: "public" | "private" | "international" | string;
  location: string;
  status: "active" | "inactive" | "pending" | "suspended" | string;
  admins: number;
  applications: number;
  acceptance_rate: string;
  joined_date: string;
  last_active: string;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function normalizeUniversityType(value: unknown): SuperuserUniversityItem["type"] {
  const normalized = toString(value).trim().toLowerCase();
  if (normalized === "private" || normalized === "international") {
    return normalized;
  }
  return "public";
}

function normalizeUniversityStatus(value: unknown): SuperuserUniversityItem["status"] {
  const normalized = toString(value).trim().toLowerCase();
  if (normalized === "inactive" || normalized === "pending" || normalized === "suspended") {
    return normalized;
  }
  return "active";
}

function buildUniversityLocation(source: Record<string, unknown>): string {
  const explicit = toString(source.location).trim();
  if (explicit) {
    return explicit;
  }

  const parts = [
    toString(source.city).trim(),
    toString(source.province).trim(),
    toString(source.country).trim(),
  ].filter(Boolean);

  return parts.join(", ");
}

function buildAcceptanceRate(source: Record<string, unknown>): string {
  const explicit = toString(source.acceptance_rate).trim();
  if (explicit) {
    return explicit;
  }

  const numeric = toNullableNumber(source.acceptance_rate ?? source.acceptanceRate);
  if (numeric !== null) {
    return `${numeric}%`;
  }

  return "N/A";
}

export function normalizeSuperuserUniversityItem(value: unknown): SuperuserUniversityItem {
  const source = (value ?? {}) as Record<string, unknown>;
  const metadata = toRecord(source.metadata);
  const managementProfile = toRecord(source.management_profile ?? source.managementProfile);

  const fallbackType =
    metadata?.type ??
    metadata?.university_type ??
    managementProfile?.type ??
    managementProfile?.universityType;

  const fallbackStatus =
    metadata?.status ??
    managementProfile?.status ??
    managementProfile?.publicationStatus;

  const fallbackNameEn =
    metadata?.name_en ??
    metadata?.nameEn ??
    managementProfile?.name_en ??
    managementProfile?.nameEn;

  const fallbackApplications =
    metadata?.applications ??
    metadata?.application_count ??
    managementProfile?.applications ??
    managementProfile?.applicationCount;

  const fallbackAdmins =
    metadata?.admins ??
    metadata?.admin_count ??
    managementProfile?.admins ??
    managementProfile?.adminCount;

  const joinedDate = toString(source.joined_date).trim() || toString(source.created_at ?? source.createdAt).trim();

  return {
    id: toString(source.id),
    name: toString(source.name),
    name_en: toString(source.name_en ?? fallbackNameEn).trim() || toString(source.name),
    type: normalizeUniversityType(source.type ?? fallbackType),
    location: buildUniversityLocation(source),
    status: normalizeUniversityStatus(source.status ?? fallbackStatus),
    admins: toNumber(source.admins ?? fallbackAdmins),
    applications: toNumber(source.applications ?? fallbackApplications),
    acceptance_rate: buildAcceptanceRate(source),
    joined_date: joinedDate,
    last_active: toString(source.last_active ?? source.lastActive).trim() || "Unknown",
  };
}

export interface SuperuserServiceLogItem {
  id: string;
  timestamp: string;
  level: "trace" | "debug" | "info" | "warn" | "error" | "fatal" | string;
  microservice: string;
  handler: string;
  message: string;
  method: string;
  status_code: number;
  duration_ms: number;
  role?: string | null;
  user_id?: string | null;
  request_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SuperuserAuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  actor_id?: string | null;
  actor_type: "applicant" | "partner" | "staff" | "system" | "anonymous" | string;
  action: string;
  action_description: string;
  target_entity: string;
  target_id?: string | null;
  outcome: "success" | "failed" | "pending" | string;
  ip_address?: string | null;
  request_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface GlobalSettingItem {
  setting_key: string;
  setting_value: Record<string, unknown> | null;
  updated_at: string;
  updated_by?: string | null;
}

export async function fetchSuperuserOverview(): Promise<SuperuserOverviewPayload> {
  const result = await adminApi.get<SuperuserOverviewPayload>("/v1.0/staff/dashboard");
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load superuser overview");
  }
  return result.data;
}

export async function fetchSuperuserUniversities(params?: {
  q?: string;
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}): Promise<Pagination<SuperuserUniversityItem>> {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.status) search.set("status", params.status);
  if (params?.type) search.set("type", params.type);
  search.set("page", String(params?.page ?? 1));
  search.set("limit", String(params?.limit ?? 20));

  const result = await adminApi.get<unknown>(`/v1.0/staff/universities?${search.toString()}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load global universities");
  }

  const page = normalizePagination<unknown>(result.data);
  return {
    ...page,
    items: page.items.map(normalizeSuperuserUniversityItem),
  };
}

export async function fetchSuperuserServiceLogs(params?: {
  level?: string;
  microservice?: string;
  handler?: string;
  userId?: string;
  timeRange?: string;
  requestId?: string;
  method?: string;
  statusCode?: number | string;
  role?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<Pagination<SuperuserServiceLogItem>> {
  const search = new URLSearchParams();
  if (params?.level) search.set("level", params.level);
  if (params?.microservice) search.set("microservice", params.microservice);
  if (params?.handler) search.set("handler", params.handler);
  if (params?.userId) search.set("user_id", params.userId);
  if (params?.timeRange) search.set("time_range", params.timeRange);
  if (params?.requestId) search.set("request_id", params.requestId);
  if (params?.method) search.set("method", params.method);
  if (params?.statusCode !== undefined && params?.statusCode !== null && `${params.statusCode}`.trim() !== "") {
    search.set("status_code", `${params.statusCode}`);
  }
  if (params?.role) search.set("role", params.role);
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  search.set("page", String(params?.page ?? 1));
  search.set("limit", String(params?.limit ?? 50));

  const result = await adminApi.get<unknown>(`/v1.0/staff/service-logs?${search.toString()}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load service logs");
  }
  const page = normalizePagination<unknown>(result.data);
  return {
    ...page,
    items: page.items.map(normalizeServiceLogItem),
  };
}

export async function fetchSuperuserAuditLogs(params?: {
  q?: string;
  action?: string;
  outcome?: string;
  requestId?: string;
  actorType?: string;
  targetEntity?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}): Promise<Pagination<SuperuserAuditLogItem>> {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.action) search.set("action", params.action);
  if (params?.outcome) search.set("outcome", params.outcome);
  if (params?.requestId) search.set("request_id", params.requestId);
  if (params?.actorType) search.set("actor_type", params.actorType);
  if (params?.targetEntity) search.set("target_entity", params.targetEntity);
  if (params?.from) search.set("from", params.from);
  if (params?.to) search.set("to", params.to);
  search.set("page", String(params?.page ?? 1));
  search.set("limit", String(params?.limit ?? 50));

  const result = await adminApi.get<unknown>(`/v1.0/staff/audit-logs?${search.toString()}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load audit logs");
  }
  const page = normalizePagination<unknown>(result.data);
  return {
    ...page,
    items: page.items.map(normalizeAuditLogItem),
  };
}

export async function fetchGlobalSettings(): Promise<GlobalSettingItem[]> {
  const result = await adminApi.get<{ settings?: GlobalSettingItem[] }>("/v1.0/staff/settings");
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load global settings");
  }
  return result.data.settings ?? [];
}

export async function updateGlobalSettings(settings: Record<string, Record<string, unknown>>): Promise<void> {
  const result = await adminApi.put<{ msg: string }>("/v1.0/staff/settings", { settings });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to update global settings");
  }
}

function toNullableString(value: unknown): string | null {
  const normalized = toString(value).trim();
  return normalized ? normalized : null;
}

function normalizeRole(value: unknown): string {
  const normalized = toString(value).trim().toLowerCase();
  if (normalized === "applicant" || normalized === "partner" || normalized === "staff" || normalized === "system" || normalized === "anonymous") {
    return normalized;
  }
  return "anonymous";
}

export function normalizeServiceLogItem(value: unknown): SuperuserServiceLogItem {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    id: toString(source.id),
    timestamp: toString(source.timestamp),
    level: toString(source.level) || "info",
    microservice: toString(source.microservice),
    handler: toString(source.handler),
    message: toString(source.message),
    method: toString(source.method) || "GET",
    status_code: toNumber(source.status_code, 0),
    duration_ms: toNumber(source.duration_ms, 0),
    role: toNullableString(source.role),
    user_id: toNullableString(source.user_id),
    request_id: toNullableString(source.request_id),
    ip_address: toNullableString(source.ip_address),
    user_agent: toNullableString(source.user_agent),
    metadata: toRecord(source.metadata),
  };
}

export function normalizeAuditLogItem(value: unknown): SuperuserAuditLogItem {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    id: toString(source.id),
    timestamp: toString(source.timestamp),
    actor: toString(source.actor),
    actor_id: toNullableString(source.actor_id),
    actor_type: normalizeRole(source.actor_type),
    action: toString(source.action),
    action_description: toString(source.action_description),
    target_entity: toString(source.target_entity),
    target_id: toNullableString(source.target_id),
    outcome: toString(source.outcome) || "success",
    ip_address: toNullableString(source.ip_address),
    request_id: toNullableString(source.request_id),
    metadata: toRecord(source.metadata),
  };
}
