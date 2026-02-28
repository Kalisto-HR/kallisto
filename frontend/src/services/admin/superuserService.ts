import { adminApi } from "../api/httpClient";
import { normalizeAdminSubmittedApplication, normalizePagination } from "../mappers/responseMappers";
import type { AdminSubmittedApplication, Pagination } from "../../types/domain";

export interface SuperuserOverviewPayload {
  stats: {
    total_universities: number;
    management_accounts: number;
    total_applications: number;
    pending_drafts: number;
  };
  recent_activity: Array<{
    id: string;
    type: string;
    description: string;
    user: string;
    timestamp: string;
    status: string;
  }>;
  pending_drafts: Array<{
    id: string;
    type: string;
    target: string;
    requester: string;
    created_at: string;
    priority: string;
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

export interface SuperuserDraftItem {
  id: string;
  type: string;
  status: string;
  title: string;
  description: string;
  requester: string;
  requester_email: string;
  target_entity: string;
  target_id: string;
  created_at: string;
  reviewed_at?: string;
  executed_at?: string;
  reviewed_by?: string;
  priority: "low" | "medium" | "high" | string;
  changes: Array<{ field: string; before: string; after: string }>;
  comments: number;
}

export interface SuperuserUserItem {
  user_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status: "active" | "banned" | "suspended" | string;
  updated_at: string;
  ban_reason?: string | null;
}

export interface SuperuserServiceLogItem {
  id: string;
  timestamp: string;
  level: "trace" | "debug" | "info" | "warn" | "error" | "fatal" | string;
  microservice: string;
  handler: string;
  message: string;
  user_id?: string | null;
  request_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface SuperuserAuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  actor_id?: string | null;
  actor_type: "superuser" | "admin" | "system" | "user" | string;
  action: string;
  action_description: string;
  target_entity: string;
  target_id?: string | null;
  outcome: "success" | "failed" | "pending" | string;
  ip_address?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface GlobalSettingItem {
  setting_key: string;
  setting_value: Record<string, unknown> | null;
  updated_at: string;
  updated_by?: string | null;
}

export async function fetchSuperuserOverview(): Promise<SuperuserOverviewPayload> {
  const result = await adminApi.get<SuperuserOverviewPayload>("/v1.0/global/overview");
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

  const result = await adminApi.get<unknown>(`/v1.0/global/universities?${search.toString()}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load global universities");
  }

  return normalizePagination<SuperuserUniversityItem>(result.data);
}

export async function fetchSuperuserDrafts(params?: {
  q?: string;
  type?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<Pagination<SuperuserDraftItem>> {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.type) search.set("type", params.type);
  if (params?.status) search.set("status", params.status);
  search.set("page", String(params?.page ?? 1));
  search.set("limit", String(params?.limit ?? 20));

  const result = await adminApi.get<unknown>(`/v1.0/global/drafts?${search.toString()}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load drafts");
  }
  return normalizePagination<SuperuserDraftItem>(result.data);
}

export async function approveSuperuserDraft(id: string, notes?: string): Promise<void> {
  const result = await adminApi.post<{ msg: string }>(`/v1.0/global/drafts/${id}/approve`, { notes });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to approve draft");
  }
}

export async function rejectSuperuserDraft(id: string, reason: string): Promise<void> {
  const result = await adminApi.post<{ msg: string }>(`/v1.0/global/drafts/${id}/reject`, { reason });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to reject draft");
  }
}

export async function fetchSuperuserApplications(params?: {
  universityId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<Pagination<AdminSubmittedApplication>> {
  const search = new URLSearchParams();
  if (params?.universityId) search.set("university_id", params.universityId);
  if (params?.status) search.set("status", params.status);
  search.set("page", String(params?.page ?? 1));
  search.set("limit", String(params?.limit ?? 20));

  const result = await adminApi.get<unknown>(`/v1.0/global/applications?${search.toString()}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load global applications");
  }

  const pageData = normalizePagination<unknown>(result.data);
  return {
    ...pageData,
    items: pageData.items.map(normalizeAdminSubmittedApplication),
  };
}

export async function fetchSuperuserUsers(params?: {
  q?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<Pagination<SuperuserUserItem>> {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.status) search.set("status", params.status);
  search.set("page", String(params?.page ?? 1));
  search.set("limit", String(params?.limit ?? 20));

  const result = await adminApi.get<unknown>(`/v1.0/global/users?${search.toString()}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load global users");
  }
  return normalizePagination<SuperuserUserItem>(result.data);
}

export async function createBanUserDraft(userId: string, reason: string, duration: string): Promise<string> {
  const result = await adminApi.post<{ id?: string; msg: string }>(`/v1.0/global/users/${userId}/ban-draft`, {
    reason,
    duration,
  });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to create ban draft");
  }
  return result.data?.id ?? "";
}

export async function fetchSuperuserServiceLogs(params?: {
  level?: string;
  microservice?: string;
  handler?: string;
  userId?: string;
  timeRange?: string;
  page?: number;
  limit?: number;
}): Promise<Pagination<SuperuserServiceLogItem>> {
  const search = new URLSearchParams();
  if (params?.level) search.set("level", params.level);
  if (params?.microservice) search.set("microservice", params.microservice);
  if (params?.handler) search.set("handler", params.handler);
  if (params?.userId) search.set("user_id", params.userId);
  if (params?.timeRange) search.set("time_range", params.timeRange);
  search.set("page", String(params?.page ?? 1));
  search.set("limit", String(params?.limit ?? 50));

  const result = await adminApi.get<unknown>(`/v1.0/global/service-logs?${search.toString()}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load service logs");
  }
  return normalizePagination<SuperuserServiceLogItem>(result.data);
}

export async function fetchSuperuserAuditLogs(params?: {
  q?: string;
  action?: string;
  outcome?: string;
  page?: number;
  limit?: number;
}): Promise<Pagination<SuperuserAuditLogItem>> {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.action) search.set("action", params.action);
  if (params?.outcome) search.set("outcome", params.outcome);
  search.set("page", String(params?.page ?? 1));
  search.set("limit", String(params?.limit ?? 50));

  const result = await adminApi.get<unknown>(`/v1.0/global/audit-logs?${search.toString()}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load audit logs");
  }
  return normalizePagination<SuperuserAuditLogItem>(result.data);
}

export async function fetchGlobalSettings(): Promise<GlobalSettingItem[]> {
  const result = await adminApi.get<{ settings?: GlobalSettingItem[] }>("/v1.0/global/settings");
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load global settings");
  }
  return result.data.settings ?? [];
}

export async function updateGlobalSettings(settings: Record<string, Record<string, unknown>>): Promise<void> {
  const result = await adminApi.put<{ msg: string }>("/v1.0/global/settings", { settings });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to update global settings");
  }
}
