import { apiRoutes } from "../api/routes";
import { api } from "../api/httpClient";
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
          applicationFee: null,
          acceptanceRate: null,
          tuitionFee: null,
          applicationDeadline: null,
          ieltsMin: null,
          toeflMin: null,
          scholarshipAvailable: null,
          cityType: null,
          campusVibe: null,
        } satisfies UniversityListItem;
      }
      return normalizeUniversityListItem(item);
    })
    .filter((item) => item.id.length > 0);
}

export async function fetchFavorites(): Promise<UniversityListItem[]> {
  const result = await api.get<unknown>(apiRoutes.applicant.favorites.list());
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
  const result = await api.post(apiRoutes.applicant.universities.favorite(universityId));
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to add favorite");
  }
}

export async function removeFavorite(universityId: string): Promise<void> {
  const result = await api.delete(apiRoutes.applicant.universities.favorite(universityId));
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to remove favorite");
  }
}
