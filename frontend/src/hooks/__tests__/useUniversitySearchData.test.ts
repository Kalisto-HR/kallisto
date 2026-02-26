import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useUniversitySearchData } from "../useUniversitySearchData";

vi.mock("../../services/client/universitiesService", () => ({
  fetchUniversities: vi.fn(),
  searchUniversities: vi.fn(),
}));

import { fetchUniversities, searchUniversities } from "../../services/client/universitiesService";

function wrapperWithRoute(initialEntries = ["/student/universities"]) {
  return ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries }, children);
}

describe("useUniversitySearchData", () => {
  const makeUniversityListItem = (id: string, name: string, ranking: number, applicationFee: number) => ({
    id,
    name,
    province: null,
    city: null,
    country: null,
    ranking,
    applicationFee,
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
  });

  it("loads default list and supports query search", async () => {
    vi.clearAllMocks();

    vi.mocked(fetchUniversities).mockResolvedValue({
      items: [makeUniversityListItem("u1", "Alpha", 1, 10)],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
    vi.mocked(searchUniversities).mockResolvedValue({
      items: [makeUniversityListItem("u2", "Beta", 2, 20)],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    const { result } = renderHook(() => useUniversitySearchData(), {
      wrapper: wrapperWithRoute(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.result.items[0]?.id).toBe("u1");

    act(() => {
      result.current.setQuery("beta");
    });

    await waitFor(() => expect(vi.mocked(searchUniversities)).toHaveBeenCalled());
    expect(result.current.result.items[0]?.id).toBe("u2");
  });

  it("applies advanced filters only when applyFilters is called", async () => {
    vi.clearAllMocks();

    vi.mocked(fetchUniversities).mockResolvedValue({
      items: [makeUniversityListItem("u1", "Alpha", 1, 10)],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });
    vi.mocked(searchUniversities).mockResolvedValue({
      items: [makeUniversityListItem("u3", "Gamma", 3, 30)],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    });

    const { result } = renderHook(() => useUniversitySearchData(), {
      wrapper: wrapperWithRoute(),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(vi.mocked(searchUniversities)).not.toHaveBeenCalled();

    act(() => {
      result.current.setDraftFilter("country", "Canada");
      result.current.setDraftFilter("maxRanking", 150);
    });

    await waitFor(() => {
      expect(vi.mocked(searchUniversities)).not.toHaveBeenCalled();
    });

    act(() => {
      const applied = result.current.applyFilters();
      expect(applied).toBe(true);
    });

    await waitFor(() => expect(vi.mocked(searchUniversities)).toHaveBeenCalled());
    expect(vi.mocked(searchUniversities)).toHaveBeenLastCalledWith(
      expect.objectContaining({
        country: "Canada",
        maxRanking: 150,
        page: 1,
        limit: 10,
      }),
    );
  });

  it("hydrates search state from URL query params", async () => {
    vi.clearAllMocks();

    vi.mocked(searchUniversities).mockResolvedValue({
      items: [makeUniversityListItem("u2", "Beta", 2, 20)],
      total: 1,
      page: 2,
      limit: 10,
      totalPages: 1,
    });

    const { result } = renderHook(() => useUniversitySearchData(), {
      wrapper: wrapperWithRoute(["/student/universities?q=beta&country=Canada&page=2&limit=10"]),
    });

    await waitFor(() => expect(vi.mocked(searchUniversities)).toHaveBeenCalled());
    expect(vi.mocked(searchUniversities)).toHaveBeenLastCalledWith(
      expect.objectContaining({
        q: "beta",
        country: "Canada",
        page: 2,
        limit: 10,
      }),
    );
    expect(result.current.query).toBe("beta");
    expect(result.current.page).toBe(2);
  });
});
