import { clientApi } from "../api/httpClient";
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
  const result = await clientApi.get<unknown>(`/v1.0/applicant/universities?page=${page}&limit=${limit}`);
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
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.province) search.set("province", params.province);
  if (params.city) search.set("city", params.city);
  if (params.country) search.set("country", params.country);
  if (typeof params.minRanking === "number") search.set("min_ranking", String(params.minRanking));
  if (typeof params.maxRanking === "number") search.set("max_ranking", String(params.maxRanking));
  if (typeof params.maxFee === "number") search.set("max_fee", String(params.maxFee));
  if (typeof params.maxTuition === "number") search.set("max_tuition", String(params.maxTuition));
  if (typeof params.minAcceptanceRate === "number") search.set("min_acceptance_rate", String(params.minAcceptanceRate));
  if (typeof params.maxAcceptanceRate === "number") search.set("max_acceptance_rate", String(params.maxAcceptanceRate));
  if (typeof params.minIelts === "number") search.set("min_ielts", String(params.minIelts));
  if (typeof params.minToefl === "number") search.set("min_toefl", String(params.minToefl));
  if (typeof params.scholarshipAvailable === "boolean") search.set("scholarship_available", String(params.scholarshipAvailable));
  if (params.cityType) search.set("city_type", params.cityType);
  if (params.campusVibe) search.set("campus_vibe", params.campusVibe);
  search.set("page", String(params.page ?? 1));
  search.set("limit", String(params.limit ?? 10));

  const result = await clientApi.get<unknown>(`/v1.0/applicant/universities/search?${search.toString()}`);
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
  const result = await clientApi.get<unknown>(`/v1.0/applicant/universities/${id}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load university");
  }
  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to load university");
  }
  return normalizeUniversity(envelope.data);
}
