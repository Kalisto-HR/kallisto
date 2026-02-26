import { adminApi } from "../api/httpClient";
import { normalizeAdminSubmittedApplication, normalizePagination } from "../mappers/responseMappers";
import type { AdminSubmittedApplication, Pagination, ReviewStatus } from "../../types/domain";

export interface AdminApplicationsQuery {
  universityId?: string;
  status?: ReviewStatus;
  page?: number;
  limit?: number;
}

export async function fetchAdminApplications(query: AdminApplicationsQuery = {}): Promise<Pagination<AdminSubmittedApplication>> {
  const params = new URLSearchParams();
  if (query.universityId) params.set("university_id", query.universityId);
  if (query.status) params.set("status", query.status);
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 20));

  const result = await adminApi.get<unknown>(`/v1.0/applications?${params.toString()}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load applications");
  }

  const pageData = normalizePagination<unknown>(result.data);
  return {
    ...pageData,
    items: pageData.items.map(normalizeAdminSubmittedApplication),
  };
}

export async function fetchAdminApplication(id: string): Promise<AdminSubmittedApplication> {
  const result = await adminApi.get<unknown>(`/v1.0/applications/${id}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load application");
  }
  return normalizeAdminSubmittedApplication(result.data);
}

export async function reviewAdminApplication(id: string, status: ReviewStatus, notes?: string): Promise<void> {
  const result = await adminApi.put<{ msg: string }>(`/v1.0/applications/${id}/review`, { status, notes });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to update review");
  }
}
