import { adminApi } from "../api/httpClient";
import { normalizeAdminSubmittedApplication, normalizePagination } from "../mappers/responseMappers";
import type { AdminSubmittedApplication, Pagination } from "../../types/domain";

export interface AdminApplicationsQuery {
  universityId?: string;
  search?: string;
  program?: string;
  citizenship?: string;
  intake?: string;
  sortBy?: "received_at" | "submitted_at" | "gpa";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export async function fetchAdminApplications(query: AdminApplicationsQuery = {}): Promise<Pagination<AdminSubmittedApplication>> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.program) params.set("program", query.program);
  if (query.citizenship) params.set("citizenship", query.citizenship);
  if (query.intake) params.set("intake", query.intake);
  if (query.sortBy) params.set("sort_by", query.sortBy);
  if (query.sortOrder) params.set("sort_order", query.sortOrder);
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.limit ?? 20));

  const result = await adminApi.get<unknown>(`/v1.0/partner/applications?${params.toString()}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load submissions");
  }

  const pageData = normalizePagination<unknown>(result.data);
  return {
    ...pageData,
    items: pageData.items.map(normalizeAdminSubmittedApplication),
  };
}

export async function fetchAdminApplication(id: string): Promise<AdminSubmittedApplication> {
  const result = await adminApi.get<unknown>(`/v1.0/partner/applications/${id}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load submission");
  }
  return normalizeAdminSubmittedApplication(result.data);
}

export async function reviewAdminApplication(): Promise<void> {
  throw new Error("Submission review is no longer supported in Kallisto");
}
