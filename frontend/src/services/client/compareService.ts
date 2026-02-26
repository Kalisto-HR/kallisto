import { clientApi } from "../api/httpClient";
import { normalizeEnvelope, normalizeUniversityListItem } from "../mappers/responseMappers";
import type { UniversityListItem } from "../../types/domain";

export async function fetchCompareList(): Promise<UniversityListItem[]> {
  const result = await clientApi.get<unknown>("/v1.0/compare");
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load compare list");
  }

  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to load compare list");
  }

  if (!Array.isArray(envelope.data)) {
    return [];
  }

  return envelope.data.map(normalizeUniversityListItem).filter((item) => item.id.length > 0);
}

export async function addCompareItem(universityId: string): Promise<void> {
  const result = await clientApi.post(`/v1.0/compare/${universityId}`);
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to add compare item");
  }
}

export async function removeCompareItem(universityId: string): Promise<void> {
  const result = await clientApi.delete(`/v1.0/compare/${universityId}`);
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to remove compare item");
  }
}

export async function clearCompareList(): Promise<void> {
  const result = await clientApi.delete("/v1.0/compare");
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to clear compare list");
  }
}
