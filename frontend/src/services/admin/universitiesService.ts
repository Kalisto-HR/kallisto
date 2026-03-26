import { adminApi } from "../api/httpClient";
import { normalizePagination, normalizeUniversity, normalizeUniversityListItem } from "../mappers/responseMappers";
import type { Pagination, University, UniversityListItem } from "../../types/domain";

export async function fetchAdminUniversities(page = 1, limit = 20): Promise<Pagination<UniversityListItem>> {
  const result = await adminApi.get<unknown>(`/v1.0/staff/universities?page=${page}&limit=${limit}`);
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
  const partnerResult = await adminApi.get<unknown>("/v1.0/partner/university/profile");
  if (partnerResult.ok && partnerResult.data) {
    return normalizeUniversity(partnerResult.data);
  }

  const staffResult = await adminApi.get<unknown>(`/v1.0/staff/universities/${id}`);
  if (!staffResult.ok || !staffResult.data) {
    throw new Error(staffResult.error ?? partnerResult.error ?? "Failed to load university");
  }
  return normalizeUniversity(staffResult.data);
}

export async function fetchAdminApplicationStructure(universityId: string): Promise<Record<string, unknown> | null> {
  const partnerResult = await adminApi.get<{ application_schema?: Record<string, unknown> | null }>(
    "/v1.0/partner/university/application-structure",
  );
  if (partnerResult.ok && partnerResult.data) {
    return partnerResult.data.application_schema ?? null;
  }

  const staffResult = await adminApi.get<{ application_schema?: Record<string, unknown> | null }>(
    `/v1.0/staff/universities/${universityId}/application-structure`,
  );
  if (!staffResult.ok || !staffResult.data) {
    throw new Error(staffResult.error ?? partnerResult.error ?? "Failed to load application structure");
  }
  return staffResult.data.application_schema ?? null;
}

export async function updateAdminApplicationStructure(
  universityId: string,
  applicationSchema: Record<string, unknown> | null,
): Promise<void> {
  const result = await adminApi.put<{ msg: string }>("/v1.0/partner/university/application-structure", {
    application_schema: applicationSchema,
  });
  if (!result.ok) {
    const fallback = await adminApi.put<{ msg: string }>(`/v1.0/staff/universities/${universityId}/application-structure`, {
      application_schema: applicationSchema,
    });
    if (!fallback.ok) {
      throw new Error(fallback.error ?? result.error ?? "Failed to save application structure");
    }
  }
}

export async function assignAdminUniversityManager(universityId: string, managerId: string): Promise<void> {
  void universityId;
  void managerId;
  throw new Error("Per-university manager assignment has been removed");
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
  const body = {
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.city !== undefined ? { city: payload.city } : {}),
    ...(payload.country !== undefined ? { country: payload.country } : {}),
    ...(payload.ieltsMin !== undefined ? { ielts_min: payload.ieltsMin } : {}),
    ...(payload.toeflMin !== undefined ? { toefl_min: payload.toeflMin } : {}),
    ...(payload.acceptanceRate !== undefined ? { acceptance_rate: payload.acceptanceRate } : {}),
    ...(payload.ranking !== undefined ? { ranking: payload.ranking } : {}),
    ...(payload.managementProfile !== undefined ? { management_profile: payload.managementProfile } : {}),
  };
  const result = await adminApi.put<{ msg: string }>("/v1.0/partner/university/profile", body);
  if (!result.ok) {
    const fallback = await adminApi.put<{ msg: string }>(`/v1.0/staff/universities/${universityId}`, body);
    if (!fallback.ok) {
      throw new Error(fallback.error ?? result.error ?? "Failed to update university");
    }
  }
}
