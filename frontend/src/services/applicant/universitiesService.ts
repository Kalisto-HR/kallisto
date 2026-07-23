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
  minPrice?: number;
  maxPrice?: number;
  region?: string;
  studyFormats?: string[];
  languages?: string[];
  page?: number;
  limit?: number;
}

export interface UniversityFilterOption {
  value: string;
  label: string;
}

export interface UniversityFilterOptions {
  priceRange: {
    min: number | null;
    max: number | null;
  };
  regions: UniversityFilterOption[];
  studyFormats: UniversityFilterOption[];
  languages: UniversityFilterOption[];
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
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    region: params.region,
    studyFormats: params.studyFormats?.join(","),
    languages: params.languages?.join(","),
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

export async function fetchUniversityFilterOptions(): Promise<UniversityFilterOptions> {
  const result = await api.get<unknown>(apiRoutes.applicant.universities.filterOptions());
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load university filters");
  }

  const envelope = normalizeEnvelope<Record<string, unknown>>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to load university filters");
  }

  const data = envelope.data ?? {};
  const priceRange = data.price_range && typeof data.price_range === "object"
    ? data.price_range as Record<string, unknown>
    : {};
  const normalizeOption = (item: unknown): UniversityFilterOption | null => {
    if (!item || typeof item !== "object") {
      return null;
    }
    const row = item as Record<string, unknown>;
    const value = typeof row.value === "string" ? row.value : "";
    const label = typeof row.label === "string" ? row.label : value;
    return value ? { value, label } : null;
  };
  const normalizeOptions = (value: unknown): UniversityFilterOption[] =>
    Array.isArray(value) ? value.map(normalizeOption).filter((item): item is UniversityFilterOption => item !== null) : [];

  return {
    priceRange: {
      min: typeof priceRange.min === "number" ? priceRange.min : null,
      max: typeof priceRange.max === "number" ? priceRange.max : null,
    },
    regions: normalizeOptions(data.regions),
    studyFormats: normalizeOptions(data.study_formats),
    languages: normalizeOptions(data.languages),
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
