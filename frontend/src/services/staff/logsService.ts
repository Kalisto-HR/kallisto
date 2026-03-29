import { apiRoutes } from "../api/routes";
import { api } from "../api/httpClient";
import { normalizePagination } from "../mappers/responseMappers";
import type { Pagination } from "../../types/domain";

export interface StaffServiceLogItem {
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

export interface StaffAuditLogItem {
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

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toNullableString(value: unknown): string | null {
  const normalized = toString(value).trim();
  return normalized ? normalized : null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function normalizeActorType(value: unknown): string {
  const normalized = toString(value).trim().toLowerCase();
  if (
    normalized === "applicant" ||
    normalized === "partner" ||
    normalized === "staff" ||
    normalized === "system" ||
    normalized === "anonymous"
  ) {
    return normalized;
  }
  return "anonymous";
}

export function normalizeStaffServiceLogItem(value: unknown): StaffServiceLogItem {
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

export function normalizeStaffAuditLogItem(value: unknown): StaffAuditLogItem {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    id: toString(source.id),
    timestamp: toString(source.timestamp),
    actor: toString(source.actor),
    actor_id: toNullableString(source.actor_id),
    actor_type: normalizeActorType(source.actor_type),
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

export async function fetchStaffServiceLogs(params?: {
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
}): Promise<Pagination<StaffServiceLogItem>> {
  const result = await api.get<unknown>(apiRoutes.staff.logs.service({
    level: params?.level,
    microservice: params?.microservice,
    handler: params?.handler,
    user_id: params?.userId,
    time_range: params?.timeRange,
    request_id: params?.requestId,
    method: params?.method,
    status_code: params?.statusCode,
    role: params?.role,
    from: params?.from,
    to: params?.to,
    page: params?.page ?? 1,
    limit: params?.limit ?? 50,
  }));
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load service logs");
  }
  const page = normalizePagination<unknown>(result.data);
  return {
    ...page,
    items: page.items.map(normalizeStaffServiceLogItem),
  };
}

export async function fetchStaffAuditLogs(params?: {
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
}): Promise<Pagination<StaffAuditLogItem>> {
  const result = await api.get<unknown>(apiRoutes.staff.logs.audit({
    q: params?.q,
    action: params?.action,
    outcome: params?.outcome,
    request_id: params?.requestId,
    actor_type: params?.actorType,
    target_entity: params?.targetEntity,
    from: params?.from,
    to: params?.to,
    page: params?.page ?? 1,
    limit: params?.limit ?? 50,
  }));
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load audit logs");
  }
  const page = normalizePagination<unknown>(result.data);
  return {
    ...page,
    items: page.items.map(normalizeStaffAuditLogItem),
  };
}
