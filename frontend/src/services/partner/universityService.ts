import { apiRoutes } from "../api/routes";
import { api } from "../api/httpClient";
import { normalizeUniversity } from "../mappers/responseMappers";
import type { University } from "../../types/domain";

export interface UpdatePartnerUniversityPayload {
  name?: string;
  description?: string | null;
  city?: string | null;
  country?: string | null;
  ieltsMin?: number | null;
  toeflMin?: number | null;
  acceptanceRate?: number | null;
  ranking?: number | null;
  universityProfile?: Record<string, unknown> | null;
}

export async function fetchPartnerUniversityProfile(): Promise<University> {
  const result = await api.get<unknown>(apiRoutes.partner.university.profile());
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load university");
  }
  return normalizeUniversity(result.data);
}

export async function fetchPartnerApplicationStructure(): Promise<Record<string, unknown> | null> {
  const result = await api.get<{ application_schema?: Record<string, unknown> | null }>(
    apiRoutes.partner.university.applicationStructure(),
  );
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load application structure");
  }
  return result.data.application_schema ?? null;
}

export async function updatePartnerApplicationStructure(
  applicationSchema: Record<string, unknown> | null,
): Promise<void> {
  const result = await api.put<{ msg: string }>(apiRoutes.partner.university.applicationStructure(), {
    application_schema: applicationSchema,
  });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to save application structure");
  }
}

export async function updatePartnerUniversityProfile(payload: UpdatePartnerUniversityPayload): Promise<void> {
  const body = {
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.city !== undefined ? { city: payload.city } : {}),
    ...(payload.country !== undefined ? { country: payload.country } : {}),
    ...(payload.ieltsMin !== undefined ? { ielts_min: payload.ieltsMin } : {}),
    ...(payload.toeflMin !== undefined ? { toefl_min: payload.toeflMin } : {}),
    ...(payload.acceptanceRate !== undefined ? { acceptance_rate: payload.acceptanceRate } : {}),
    ...(payload.ranking !== undefined ? { ranking: payload.ranking } : {}),
    ...(payload.universityProfile !== undefined ? { university_profile: payload.universityProfile } : {}),
  };
  const result = await api.put<{ msg: string }>(apiRoutes.partner.university.profile(), body);
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to update university");
  }
}
