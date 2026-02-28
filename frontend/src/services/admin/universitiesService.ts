import { adminApi } from "../api/httpClient";
import { normalizePagination, normalizeUniversity, normalizeUniversityListItem } from "../mappers/responseMappers";
import type { Pagination, University, UniversityListItem } from "../../types/domain";

export async function fetchAdminUniversities(page = 1, limit = 20): Promise<Pagination<UniversityListItem>> {
  const result = await adminApi.get<unknown>(`/v1.0/universities?page=${page}&limit=${limit}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load universities");
  }

  const pageData = normalizePagination<unknown>(result.data);
  return {
    ...pageData,
    items: pageData.items.map(normalizeUniversityListItem),
  };
}

export async function fetchAdminUniversity(id: string): Promise<University> {
  const result = await adminApi.get<unknown>(`/v1.0/universities/${id}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load university");
  }
  return normalizeUniversity(result.data);
}

export async function fetchAdminApplicationStructure(universityId: string): Promise<Record<string, unknown> | null> {
  const result = await adminApi.get<{ application_schema?: Record<string, unknown> | null }>(
    `/v1.0/universities/${universityId}/application-structure`,
  );
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load application structure");
  }
  return result.data.application_schema ?? null;
}

export async function updateAdminApplicationStructure(
  universityId: string,
  applicationSchema: Record<string, unknown> | null,
): Promise<void> {
  const result = await adminApi.put<{ msg: string }>(`/v1.0/universities/${universityId}/application-structure`, {
    application_schema: applicationSchema,
  });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to save application structure");
  }
}

export async function assignAdminUniversityManager(universityId: string, managerId: string): Promise<void> {
  const result = await adminApi.put<{ msg: string }>(`/v1.0/universities/${universityId}/manager`, { manager_id: managerId });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to assign manager");
  }
}

export interface UpdateAdminUniversityPayload {
  name?: string;
  description?: string | null;
  city?: string | null;
  country?: string | null;
  ieltsMin?: number | null;
  toeflMin?: number | null;
  acceptanceRate?: number | null;
  ranking?: number | null;
  managementProfile?: Record<string, unknown> | null;
}

export async function updateAdminUniversity(universityId: string, payload: UpdateAdminUniversityPayload): Promise<void> {
  const result = await adminApi.put<{ msg: string }>(`/v1.0/universities/${universityId}`, {
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.city !== undefined ? { city: payload.city } : {}),
    ...(payload.country !== undefined ? { country: payload.country } : {}),
    ...(payload.ieltsMin !== undefined ? { ielts_min: payload.ieltsMin } : {}),
    ...(payload.toeflMin !== undefined ? { toefl_min: payload.toeflMin } : {}),
    ...(payload.acceptanceRate !== undefined ? { acceptance_rate: payload.acceptanceRate } : {}),
    ...(payload.ranking !== undefined ? { ranking: payload.ranking } : {}),
    ...(payload.managementProfile !== undefined ? { management_profile: payload.managementProfile } : {}),
  });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to update university");
  }
}
