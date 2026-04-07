import { apiRoutes } from "../api/routes";
import { api } from "../api/httpClient";
import { normalizeUniversity } from "../mappers/responseMappers";
import type { University } from "../../types/domain";
import {
  buildUniversityProfileUpdateBody,
  type UniversityProfileUpdatePayload,
} from "../universityProfileUpdate";

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

export async function updatePartnerUniversityProfile(payload: UniversityProfileUpdatePayload): Promise<void> {
  const body = buildUniversityProfileUpdateBody(payload);
  const result = await api.put<{ msg: string }>(apiRoutes.partner.university.profile(), body);
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to update university");
  }
}
