import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Pagination, UniversityListItem } from "../types/domain";
import {
  fetchUniversityFilterOptions,
  fetchUniversities,
  searchUniversities,
  type UniversityFilterOptions,
  type UniversitySearchParams,
} from "../services/applicant/universitiesService";

interface UseUniversitySearchDataState {
  result: Pagination<UniversityListItem>;
  loading: boolean;
  error: string | null;
  filterOptions: UniversityFilterOptions;
  filterOptionsLoading: boolean;
  filterOptionsError: string | null;
}

type UniversityAdvancedFilters = Omit<UniversitySearchParams, "q" | "page" | "limit">;

const DEFAULT_LIMIT = 10;

function createEmptyFilters(): UniversityAdvancedFilters {
  return {
    minPrice: undefined,
    maxPrice: undefined,
    region: undefined,
    studyFormats: [],
    languages: [],
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

function normalizeStringList(value: string[] | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(new Set(value.map((item) => item.trim()).filter(Boolean))).sort();
}

function normalizeFilters(filters: UniversityAdvancedFilters): UniversityAdvancedFilters {
  return {
    minPrice: normalizeNumber(filters.minPrice),
    maxPrice: normalizeNumber(filters.maxPrice),
    region: normalizeString(filters.region),
    studyFormats: normalizeStringList(filters.studyFormats),
    languages: normalizeStringList(filters.languages),
  };
}

function areFiltersEqual(left: UniversityAdvancedFilters, right: UniversityAdvancedFilters): boolean {
  return JSON.stringify(normalizeFilters(left)) === JSON.stringify(normalizeFilters(right));
}

function countActiveFilters(filters: UniversityAdvancedFilters): number {
  return Object.values(normalizeFilters(filters)).reduce<number>((count, value) => {
    if (typeof value === "number") {
      return count + 1;
    }
    if (typeof value === "string" && value.length > 0) {
      return count + 1;
    }
    if (Array.isArray(value) && value.length > 0) {
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

function parseListParam(value: string | null): string[] {
  if (!value) {
    return [];
  }
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function validateFilters(filters: UniversityAdvancedFilters): string | null {
  if (
    typeof filters.minPrice === "number" &&
    typeof filters.maxPrice === "number" &&
    filters.minPrice > filters.maxPrice
  ) {
    return "Minimum price cannot be greater than maximum price.";
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
    minPrice: parseFloatParam(searchParams.get("minPrice")),
    maxPrice: parseFloatParam(searchParams.get("maxPrice")),
    region: searchParams.get("region") ?? undefined,
    studyFormats: parseListParam(searchParams.get("studyFormats")),
    languages: parseListParam(searchParams.get("languages")),
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

  if (typeof normalizedFilters.minPrice === "number") params.set("minPrice", String(normalizedFilters.minPrice));
  if (typeof normalizedFilters.maxPrice === "number") params.set("maxPrice", String(normalizedFilters.maxPrice));
  if (normalizedFilters.region) params.set("region", normalizedFilters.region);
  if (normalizedFilters.studyFormats?.length) params.set("studyFormats", normalizedFilters.studyFormats.join(","));
  if (normalizedFilters.languages?.length) params.set("languages", normalizedFilters.languages.join(","));

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
    filterOptions: {
      priceRange: { min: null, max: null },
      regions: [],
      studyFormats: [],
      languages: [],
    },
    filterOptionsLoading: true,
    filterOptionsError: null,
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
      setState((prev) => ({ ...prev, result, loading: false, error: null }));
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

  useEffect(() => {
    let cancelled = false;
    const loadFilterOptions = async () => {
      setState((prev) => ({ ...prev, filterOptionsLoading: true, filterOptionsError: null }));
      try {
        const filterOptions = await fetchUniversityFilterOptions();
        if (!cancelled) {
          setState((prev) => ({ ...prev, filterOptions, filterOptionsLoading: false }));
        }
      } catch (error) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            filterOptionsLoading: false,
            filterOptionsError: error instanceof Error ? error.message : "Failed to load university filters",
          }));
        }
      }
    };
    void loadFilterOptions();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const setFilter = useCallback(
    <K extends keyof UniversityAdvancedFilters>(key: K, value: UniversityAdvancedFilters[K]) => {
      const nextFilters = normalizeFilters({ ...appliedFilters, [key]: value });
      const validationError = validateFilters(nextFilters);
      if (validationError) {
        setFilterValidationError(validationError);
        return;
      }
      setFilterValidationError(null);
      setDraftFilters(nextFilters);
      setAppliedFilters(nextFilters);
      setPageState(1);
      updateSearch(query, 1, nextFilters);
    },
    [appliedFilters, query, updateSearch],
  );

  const setFilters = useCallback(
    (nextPartialFilters: Partial<UniversityAdvancedFilters>) => {
      const nextFilters = normalizeFilters({ ...appliedFilters, ...nextPartialFilters });
      const validationError = validateFilters(nextFilters);
      if (validationError) {
        setFilterValidationError(validationError);
        return;
      }
      setFilterValidationError(null);
      setDraftFilters(nextFilters);
      setAppliedFilters(nextFilters);
      setPageState(1);
      updateSearch(query, 1, nextFilters);
    },
    [appliedFilters, query, updateSearch],
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
    setFilter,
    setFilters,
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
