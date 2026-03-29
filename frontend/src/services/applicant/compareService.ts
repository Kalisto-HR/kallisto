import { apiRoutes } from "../api/routes";
import { api } from "../api/httpClient";
import { normalizeEnvelope, normalizeUniversityListItem } from "../mappers/responseMappers";
import type { UniversityListItem } from "../../types/domain";

export const MAX_COMPARE_ITEMS = 4;
export const COMPARE_LIMIT_MESSAGE =
  `You already have ${MAX_COMPARE_ITEMS} universities in Compare. Remove one to add this university.`;

function isCompareLimitErrorMessage(message: string | null | undefined): boolean {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes(`supports up to ${MAX_COMPARE_ITEMS} universities`);
}

export async function fetchCompareList(): Promise<UniversityListItem[]> {
  const result = await api.get<unknown>(apiRoutes.applicant.compare.list());
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
  const result = await api.post(apiRoutes.applicant.compare.item(universityId));
  if (!result.ok) {
    if (isCompareLimitErrorMessage(result.error)) {
      throw new Error(COMPARE_LIMIT_MESSAGE);
    }
    throw new Error(result.error ?? "Failed to add compare item");
  }
}

export async function removeCompareItem(universityId: string): Promise<void> {
  const result = await api.delete(apiRoutes.applicant.compare.item(universityId));
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to remove compare item");
  }
}

export async function clearCompareList(): Promise<void> {
  const result = await api.delete(apiRoutes.applicant.compare.list());
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to clear compare list");
  }
}
