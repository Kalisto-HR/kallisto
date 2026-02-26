import { clientApi } from "../api/httpClient";
import { normalizeEnvelope, normalizeUniversityListItem } from "../mappers/responseMappers";
import type { UniversityListItem } from "../../types/domain";

function normalizeFavoritesArray(items: unknown[]): UniversityListItem[] {
  return items
    .map((item) => {
      if (typeof item === "string") {
        return {
          id: item,
          name: item,
          province: null,
          city: null,
          country: null,
          ranking: null,
          applicationFee: null,
          acceptanceRate: null,
          tuitionFee: null,
          livingCost: null,
          totalCost: null,
          applicationDeadline: null,
          ieltsMin: null,
          toeflMin: null,
          scholarshipAvailable: null,
          competitiveness: null,
          cityType: null,
          safetyLevel: null,
          campusVibe: null,
          visaRequired: null,
        } satisfies UniversityListItem;
      }
      return normalizeUniversityListItem(item);
    })
    .filter((item) => item.id.length > 0);
}

export async function fetchFavorites(): Promise<UniversityListItem[]> {
  const result = await clientApi.get<unknown>("/v1.0/favorites");
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load favorites");
  }
  if (Array.isArray(result.data)) {
    return normalizeFavoritesArray(result.data);
  }

  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success || !Array.isArray(envelope.data)) {
    return [];
  }
  return normalizeFavoritesArray(envelope.data);
}

export async function addFavorite(universityId: string): Promise<void> {
  const result = await clientApi.post(`/v1.0/universities/${universityId}/favorite`);
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to add favorite");
  }
}

export async function removeFavorite(universityId: string): Promise<void> {
  const result = await clientApi.delete(`/v1.0/universities/${universityId}/favorite`);
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to remove favorite");
  }
}
