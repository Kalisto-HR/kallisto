import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { UniversitySearchPage } from "./UniversitySearchPage";
import { useUniversitySearchData } from "../../hooks/useUniversitySearchData";
import {
  addCompareItem,
  COMPARE_LIMIT_MESSAGE,
  fetchCompareList,
  removeCompareItem,
} from "../../services/client/compareService";

vi.mock("../../hooks/useUniversitySearchData", () => ({
  useUniversitySearchData: vi.fn(),
}));

vi.mock("../../services/client/compareService", () => ({
  MAX_COMPARE_ITEMS: 4,
  COMPARE_LIMIT_MESSAGE:
    "You already have 4 universities in Compare. Remove one to add this university.",
  fetchCompareList: vi.fn(),
  addCompareItem: vi.fn(),
  removeCompareItem: vi.fn(),
}));

describe("UniversitySearchPage compare limits", () => {
  beforeEach(() => {
    vi.mocked(useUniversitySearchData).mockReturnValue({
      result: {
        items: [
          {
            id: "uni-5",
            name: "Fudan University",
            province: "Shanghai",
            city: "Shanghai",
            country: "China",
            ranking: 39,
            applicationFee: 800,
            acceptanceRate: 0.22,
            tuitionFee: 42000,
            applicationDeadline: null,
            ieltsMin: 6.5,
            toeflMin: 90,
            scholarshipAvailable: true,
            cityType: "urban",
            campusVibe: "research-led",
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
      query: "",
      setQuery: vi.fn(),
      page: 1,
      setPage: vi.fn(),
      loading: false,
      error: null,
      refresh: vi.fn(),
      draftFilters: {
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
      },
      appliedFilters: {
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
      },
      setDraftFilter: vi.fn(),
      applyFilters: vi.fn(() => true),
      clearFilters: vi.fn(),
      activeFilterCount: 0,
      hasActiveFilters: false,
      isFiltersDirty: false,
      filterValidationError: null,
    });

    vi.mocked(fetchCompareList).mockResolvedValue([
      { id: "uni-1", name: "Peking University", province: null, city: "Beijing", country: "China", ranking: 14, applicationFee: null, acceptanceRate: null, tuitionFee: null, applicationDeadline: null, ieltsMin: null, toeflMin: null, scholarshipAvailable: null, cityType: null, campusVibe: null },
      { id: "uni-2", name: "Tsinghua University", province: null, city: "Beijing", country: "China", ranking: 20, applicationFee: null, acceptanceRate: null, tuitionFee: null, applicationDeadline: null, ieltsMin: null, toeflMin: null, scholarshipAvailable: null, cityType: null, campusVibe: null },
      { id: "uni-3", name: "Zhejiang University", province: null, city: "Hangzhou", country: "China", ranking: 44, applicationFee: null, acceptanceRate: null, tuitionFee: null, applicationDeadline: null, ieltsMin: null, toeflMin: null, scholarshipAvailable: null, cityType: null, campusVibe: null },
      { id: "uni-4", name: "Nanjing University", province: null, city: "Nanjing", country: "China", ranking: 73, applicationFee: null, acceptanceRate: null, tuitionFee: null, applicationDeadline: null, ieltsMin: null, toeflMin: null, scholarshipAvailable: null, cityType: null, campusVibe: null },
    ]);
    vi.mocked(addCompareItem).mockResolvedValue(undefined);
    vi.mocked(removeCompareItem).mockResolvedValue(undefined);
  });

  it("shows a clear limit message when the compare table already has four universities", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <UniversitySearchPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(vi.mocked(fetchCompareList)).toHaveBeenCalledTimes(1);
    });

    await user.click(screen.getByRole("button", { name: /add to compare/i }));

    expect(await screen.findByText(COMPARE_LIMIT_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(/compare table full/i)).toBeInTheDocument();
    expect(vi.mocked(addCompareItem)).not.toHaveBeenCalled();
  });
});
