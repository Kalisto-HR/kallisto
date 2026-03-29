import { apiRoutes } from "../api/routes";
import { api } from "../api/httpClient";
import {
  normalizeEnvelope,
  normalizePagination,
  normalizeUniversity,
  normalizeUniversityListItem,
} from "../mappers/responseMappers";
import type { Pagination, University, UniversityListItem } from "../../types/domain";

export interface UniversitySearchParams {
  q?: string;
  province?: string;
  city?: string;
  country?: string;
  minRanking?: number;
  maxRanking?: number;
  maxFee?: number;
  maxTuition?: number;
  minAcceptanceRate?: number;
  maxAcceptanceRate?: number;
  minIelts?: number;
  minToefl?: number;
  scholarshipAvailable?: boolean;
  cityType?: string;
  campusVibe?: string;
  page?: number;
  limit?: number;
}

export async function fetchUniversities(page = 1, limit = 10): Promise<Pagination<UniversityListItem>> {
  const result = await api.get<unknown>(apiRoutes.applicant.universities.list(page, limit));
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load universities");
  }

  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to load universities");
  }

  const pageData = normalizePagination<unknown>(envelope.data);
  return {
    ...pageData,
    items: pageData.items.map(normalizeUniversityListItem),
  };
}

export async function searchUniversities(params: UniversitySearchParams): Promise<Pagination<UniversityListItem>> {
  const result = await api.get<unknown>(apiRoutes.applicant.universities.search({
    q: params.q,
    province: params.province,
    city: params.city,
    country: params.country,
    min_ranking: params.minRanking,
    max_ranking: params.maxRanking,
    max_fee: params.maxFee,
    max_tuition: params.maxTuition,
    min_acceptance_rate: params.minAcceptanceRate,
    max_acceptance_rate: params.maxAcceptanceRate,
    min_ielts: params.minIelts,
    min_toefl: params.minToefl,
    scholarship_available: params.scholarshipAvailable,
    city_type: params.cityType,
    campus_vibe: params.campusVibe,
    page: params.page ?? 1,
    limit: params.limit ?? 10,
  }));
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to search universities");
  }

  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to search universities");
  }

  const pageData = normalizePagination<unknown>(envelope.data);
  return {
    ...pageData,
    items: pageData.items.map(normalizeUniversityListItem),
  };
}

export async function fetchUniversityById(id: string): Promise<University> {
  const result = await api.get<unknown>(apiRoutes.applicant.universities.detail(id));
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load university");
  }

  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to load university");
  }

  return normalizeUniversity(envelope.data);
}
