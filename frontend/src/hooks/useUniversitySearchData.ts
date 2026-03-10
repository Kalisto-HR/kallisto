import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Pagination, UniversityListItem } from "../types/domain";
import {
  fetchUniversities,
  searchUniversities,
  type UniversitySearchParams,
} from "../services/client/universitiesService";

interface UseUniversitySearchDataState {
  result: Pagination<UniversityListItem>;
  loading: boolean;
  error: string | null;
}

type UniversityAdvancedFilters = Omit<UniversitySearchParams, "q" | "page" | "limit">;

const DEFAULT_LIMIT = 10;

function createEmptyFilters(): UniversityAdvancedFilters {
  return {
    province: undefined,
    city: undefined,
    country: undefined,
    minRanking: undefined,
    maxRanking: undefined,
    maxFee: undefined,
    maxTuition: undefined,
    minAcceptanceRate: undefined,
    maxAcceptanceRate: undefined,
    minIelts: undefined,
    minToefl: undefined,
    scholarshipAvailable: undefined,
    cityType: undefined,
    campusVibe: undefined,
  };
}

function normalizeString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function normalizeNumber(value: number | undefined): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }
  return value;
}

function normalizeInteger(value: number | undefined): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }
  return Math.trunc(value);
}

function normalizeFilters(filters: UniversityAdvancedFilters): UniversityAdvancedFilters {
  return {
    province: normalizeString(filters.province),
    city: normalizeString(filters.city),
    country: normalizeString(filters.country),
    minRanking: normalizeInteger(filters.minRanking),
    maxRanking: normalizeInteger(filters.maxRanking),
    maxFee: normalizeNumber(filters.maxFee),
    maxTuition: normalizeNumber(filters.maxTuition),
    minAcceptanceRate: normalizeNumber(filters.minAcceptanceRate),
    maxAcceptanceRate: normalizeNumber(filters.maxAcceptanceRate),
    minIelts: normalizeNumber(filters.minIelts),
    minToefl: normalizeInteger(filters.minToefl),
    scholarshipAvailable: filters.scholarshipAvailable,
    cityType: normalizeString(filters.cityType),
    campusVibe: normalizeString(filters.campusVibe),
  };
}

function areFiltersEqual(left: UniversityAdvancedFilters, right: UniversityAdvancedFilters): boolean {
  return JSON.stringify(normalizeFilters(left)) === JSON.stringify(normalizeFilters(right));
}

function countActiveFilters(filters: UniversityAdvancedFilters): number {
  return Object.values(normalizeFilters(filters)).reduce<number>((count, value) => {
    if (typeof value === "boolean") {
      return count + 1;
    }
    if (typeof value === "number") {
      return count + 1;
    }
    if (typeof value === "string" && value.length > 0) {
      return count + 1;
    }
    return count;
  }, 0);
}

function parseIntParam(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return parsed;
}

function parseFloatParam(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    return undefined;
  }
  return parsed;
}

function parseBoolParam(value: string | null): boolean | undefined {
  if (value === null) {
    return undefined;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return undefined;
}

function validateFilters(filters: UniversityAdvancedFilters): string | null {
  if (
    typeof filters.minRanking === "number" &&
    typeof filters.maxRanking === "number" &&
    filters.minRanking > filters.maxRanking
  ) {
    return "Minimum ranking cannot be greater than maximum ranking.";
  }

  if (
    typeof filters.minAcceptanceRate === "number" &&
    typeof filters.maxAcceptanceRate === "number" &&
    filters.minAcceptanceRate > filters.maxAcceptanceRate
  ) {
    return "Minimum acceptance rate cannot be greater than maximum acceptance rate.";
  }

  return null;
}

interface ParsedSearchState {
  query: string;
  page: number;
  filters: UniversityAdvancedFilters;
}

function parseSearchState(searchParams: URLSearchParams): ParsedSearchState {
  const parsedPage = parseIntParam(searchParams.get("page"));
  const page = parsedPage && parsedPage > 0 ? parsedPage : 1;

  const filters = normalizeFilters({
    province: searchParams.get("province") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    country: searchParams.get("country") ?? undefined,
    minRanking: parseIntParam(searchParams.get("min_ranking")),
    maxRanking: parseIntParam(searchParams.get("max_ranking")),
    maxFee: parseFloatParam(searchParams.get("max_fee")),
    maxTuition: parseFloatParam(searchParams.get("max_tuition")),
    minAcceptanceRate: parseFloatParam(searchParams.get("min_acceptance_rate")),
    maxAcceptanceRate: parseFloatParam(searchParams.get("max_acceptance_rate")),
    minIelts: parseFloatParam(searchParams.get("min_ielts")),
    minToefl: parseIntParam(searchParams.get("min_toefl")),
    scholarshipAvailable: parseBoolParam(searchParams.get("scholarship_available")),
    cityType: searchParams.get("city_type") ?? undefined,
    campusVibe: searchParams.get("campus_vibe") ?? undefined,
  });

  return {
    query: searchParams.get("q") ?? "",
    page,
    filters,
  };
}

function toSearchParams(query: string, page: number, filters: UniversityAdvancedFilters): URLSearchParams {
  const params = new URLSearchParams();
  const normalizedQuery = query.trim();
  const normalizedFilters = normalizeFilters(filters);

  if (normalizedQuery) {
    params.set("q", normalizedQuery);
  }

  params.set("page", String(Math.max(1, page)));
  params.set("limit", String(DEFAULT_LIMIT));

  if (normalizedFilters.province) params.set("province", normalizedFilters.province);
  if (normalizedFilters.city) params.set("city", normalizedFilters.city);
  if (normalizedFilters.country) params.set("country", normalizedFilters.country);
  if (typeof normalizedFilters.minRanking === "number") params.set("min_ranking", String(normalizedFilters.minRanking));
  if (typeof normalizedFilters.maxRanking === "number") params.set("max_ranking", String(normalizedFilters.maxRanking));
  if (typeof normalizedFilters.maxFee === "number") params.set("max_fee", String(normalizedFilters.maxFee));
  if (typeof normalizedFilters.maxTuition === "number") params.set("max_tuition", String(normalizedFilters.maxTuition));
  if (typeof normalizedFilters.minAcceptanceRate === "number") params.set("min_acceptance_rate", String(normalizedFilters.minAcceptanceRate));
  if (typeof normalizedFilters.maxAcceptanceRate === "number") params.set("max_acceptance_rate", String(normalizedFilters.maxAcceptanceRate));
  if (typeof normalizedFilters.minIelts === "number") params.set("min_ielts", String(normalizedFilters.minIelts));
  if (typeof normalizedFilters.minToefl === "number") params.set("min_toefl", String(normalizedFilters.minToefl));
  if (typeof normalizedFilters.scholarshipAvailable === "boolean") {
    params.set("scholarship_available", String(normalizedFilters.scholarshipAvailable));
  }
  if (normalizedFilters.cityType) params.set("city_type", normalizedFilters.cityType);
  if (normalizedFilters.campusVibe) params.set("campus_vibe", normalizedFilters.campusVibe);

  return params;
}

export function useUniversitySearchData() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialState] = useState<ParsedSearchState>(() => parseSearchState(searchParams));
  const [query, setQueryState] = useState(initialState.query);
  const [page, setPageState] = useState(initialState.page);
  const [draftFilters, setDraftFilters] = useState<UniversityAdvancedFilters>(initialState.filters);
  const [appliedFilters, setAppliedFilters] = useState<UniversityAdvancedFilters>(initialState.filters);
  const [filterValidationError, setFilterValidationError] = useState<string | null>(null);
  const [state, setState] = useState<UseUniversitySearchDataState>({
    result: { items: [], total: 0, page: 1, limit: DEFAULT_LIMIT, totalPages: 1 },
    loading: true,
    error: null,
  });

  const updateSearch = useCallback(
    (nextQuery: string, nextPage: number, nextFilters: UniversityAdvancedFilters, replace = false) => {
      setSearchParams(toSearchParams(nextQuery, nextPage, nextFilters), { replace });
    },
    [setSearchParams],
  );

  const load = useCallback(async (nextPage: number, q: string, filters: UniversityAdvancedFilters) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const normalizedQuery = q.trim();
      const normalizedFilters = normalizeFilters(filters);
      const hasFilters = countActiveFilters(normalizedFilters) > 0;
      const result = normalizedQuery || hasFilters
        ? await searchUniversities({
          ...normalizedFilters,
          q: normalizedQuery || undefined,
          page: nextPage,
          limit: DEFAULT_LIMIT,
        })
        : await fetchUniversities(nextPage, DEFAULT_LIMIT);
      setState({ result, loading: false, error: null });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load universities",
      }));
    }
  }, []);

  useEffect(() => {
    const parsed = parseSearchState(searchParams);
    setQueryState(parsed.query);
    setPageState(parsed.page);
    setAppliedFilters(parsed.filters);
    setDraftFilters(parsed.filters);
    setFilterValidationError(null);
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load(page, query, appliedFilters);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [load, page, query, appliedFilters]);

  const setQuery = useCallback(
    (nextQuery: string) => {
      setQueryState(nextQuery);
      setPageState(1);
      updateSearch(nextQuery, 1, appliedFilters, true);
    },
    [appliedFilters, updateSearch],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      const normalizedPage = Math.max(1, nextPage);
      setPageState(normalizedPage);
      updateSearch(query, normalizedPage, appliedFilters);
    },
    [appliedFilters, query, updateSearch],
  );

  const setDraftFilter = useCallback(
    <K extends keyof UniversityAdvancedFilters>(key: K, value: UniversityAdvancedFilters[K]) => {
      setDraftFilters((prev) => normalizeFilters({ ...prev, [key]: value }));
      setFilterValidationError(null);
    },
    [],
  );

  const applyFilters = useCallback(() => {
    const normalizedDraft = normalizeFilters(draftFilters);
    const validationError = validateFilters(normalizedDraft);
    if (validationError) {
      setFilterValidationError(validationError);
      return false;
    }

    setFilterValidationError(null);
    setAppliedFilters(normalizedDraft);
    setPageState(1);
    updateSearch(query, 1, normalizedDraft);
    return true;
  }, [draftFilters, query, updateSearch]);

  const clearFilters = useCallback(() => {
    const emptyFilters = createEmptyFilters();
    setFilterValidationError(null);
    setQueryState("");
    setPageState(1);
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    updateSearch("", 1, emptyFilters);
  }, [updateSearch]);

  const activeFilterCount = useMemo(() => countActiveFilters(appliedFilters), [appliedFilters]);
  const hasActiveFilters = activeFilterCount > 0;
  const isFiltersDirty = useMemo(
    () => !areFiltersEqual(draftFilters, appliedFilters),
    [appliedFilters, draftFilters],
  );

  const refresh = useCallback(() => load(page, query, appliedFilters), [appliedFilters, load, page, query]);

  return {
    ...state,
    query,
    setQuery,
    page,
    setPage,
    draftFilters,
    appliedFilters,
    setDraftFilter,
    applyFilters,
    clearFilters,
    activeFilterCount,
    hasActiveFilters,
    isFiltersDirty,
    filterValidationError,
    refresh,
  };
}

export type { UniversityAdvancedFilters };
