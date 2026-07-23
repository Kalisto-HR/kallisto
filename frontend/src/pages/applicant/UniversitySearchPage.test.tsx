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
} from "../../services/applicant/compareService";
import { fetchBillingSummary } from "../../services/applicant/billingService";
import { calculateFitScore } from "../../services/applicant/fitScoreService";
import { fetchApplicantProfile, fetchApplicantTestScores } from "../../services/applicant/profileService";
import type { CompareUniversityItem } from "../../types/domain";

vi.mock("../../hooks/useUniversitySearchData", () => ({
  useUniversitySearchData: vi.fn(),
}));

vi.mock("../../services/applicant/compareService", () => ({
  MAX_COMPARE_ITEMS: 4,
  COMPARE_LIMIT_MESSAGE:
    "You already have 4 universities in Compare. Remove one to add this university.",
  fetchCompareList: vi.fn(),
  addCompareItem: vi.fn(),
  removeCompareItem: vi.fn(),
}));

vi.mock("../../services/applicant/billingService", () => ({
  fetchBillingSummary: vi.fn(),
}));

vi.mock("../../services/applicant/fitScoreService", () => ({
  calculateFitScore: vi.fn(),
}));

vi.mock("../../services/applicant/profileService", () => ({
  fetchApplicantProfile: vi.fn(),
  fetchApplicantTestScores: vi.fn(),
}));

function compareItem(id: string, name: string): CompareUniversityItem {
  return {
    id,
    name,
    slug: id,
    region: "tashkent",
    city: "tashkent",
    averageContractAmount: null,
    contractCurrency: "UZS",
    contractPeriod: "year",
    universityType: null,
    languagesOfInstruction: [],
    studyFormats: [],
    financialSupport: {
      scholarships: "not_provided",
      governmentGrants: "not_provided",
      tuitionDiscounts: "not_provided",
      otherSupport: "not_provided",
    },
    dormitoryStatus: "not_provided",
    accreditation: {
      licenceStatus: "not_provided",
      nationalAccreditationStatus: "not_provided",
      internationalAccreditationStatus: "not_provided",
    },
    internationalPartnerships: {
      status: "not_provided",
      verifiedCount: 0,
      partners: [],
    },
    mobility: {
      exchange: "not_provided",
      academicMobility: "not_provided",
      doubleDegree: "not_provided",
      semesterAbroad: "not_provided",
    },
    careerSupport: {
      careerCentre: "not_provided",
      internshipSupport: "not_provided",
      employerPartnerships: "not_provided",
      jobFairs: "not_provided",
      entrepreneurshipSupport: "not_provided",
      employmentData: null,
    },
    admissions: {
      deadline: null,
      deadlineStatus: "not_provided",
      universityApplicationFee: { amount: null, currency: "UZS", status: "not_provided" },
      kallistoApplicationFee: { amount: 10000, currency: "UZS", status: "provided" },
      canApplyThroughKallisto: false,
      kallistoApplicationStatus: "not_available",
    },
  };
}

describe("UniversitySearchPage compare limits", () => {
  beforeEach(() => {
    vi.mocked(useUniversitySearchData).mockReturnValue({
      result: {
        items: [
          {
            id: "uni-5",
            name: "Westminster International University in Tashkent",
            province: null,
            city: "Tashkent",
            country: "Uzbekistan",
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
        minPrice: undefined,
        maxPrice: undefined,
        region: undefined,
        studyFormats: [],
        languages: [],
      },
      appliedFilters: {
        minPrice: undefined,
        maxPrice: undefined,
        region: undefined,
        studyFormats: [],
        languages: [],
      },
      setDraftFilter: vi.fn(),
      setFilter: vi.fn(),
      setFilters: vi.fn(),
      applyFilters: vi.fn(() => true),
      clearFilters: vi.fn(),
      activeFilterCount: 0,
      hasActiveFilters: false,
      isFiltersDirty: false,
      filterValidationError: null,
      filterOptions: {
        priceRange: { min: 12000000, max: 135000000 },
        regions: [{ value: "tashkent", label: "Toshkent" }],
        studyFormats: [{ value: "full-time", label: "Kunduzgi" }],
        languages: [{ value: "english", label: "Ingliz" }],
      },
      filterOptionsLoading: false,
      filterOptionsError: null,
    });

    vi.mocked(fetchCompareList).mockResolvedValue([
      compareItem("uni-1", "New Uzbekistan University"),
      compareItem("uni-2", "Inha University in Tashkent"),
      compareItem("uni-3", "AKFA University"),
      compareItem("uni-4", "Samarkand State University"),
    ]);
    vi.mocked(addCompareItem).mockResolvedValue(undefined);
    vi.mocked(removeCompareItem).mockResolvedValue(undefined);
    vi.mocked(fetchBillingSummary).mockResolvedValue({
      creditBalance: 0,
      creditsPurchased: 0,
      creditsUsed: 0,
      draftApplications: 0,
      submittedApplications: 0,
      products: [],
      orders: [],
      creditHistory: [],
      subscription: null,
      hasActivePremium: false,
    });
    vi.mocked(fetchApplicantProfile).mockResolvedValue({
      id: "applicant-1",
      email: "student@example.com",
      firstName: "Student",
      lastName: "Example",
      data: null,
      lastSeen: null,
    });
    vi.mocked(fetchApplicantTestScores).mockResolvedValue([]);
    vi.mocked(calculateFitScore).mockResolvedValue({
      finalScore: 87,
      label: "Excellent Fit",
      breakdown: {
        academicScore: 90,
        languageScore: 85,
        majorScore: 90,
        budgetScore: 80,
        documentScore: 90,
        deadlineScore: 95,
      },
      reasons: [],
      recommendations: [],
    });
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

  it("does not render the obsolete percentage match badge", async () => {
    render(
      <MemoryRouter>
        <UniversitySearchPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/westminster international university in tashkent/i)).toBeInTheDocument();
    expect(screen.queryByText(/261% match/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /upgrade to premium/i })).toBeInTheDocument();
    expect(vi.mocked(calculateFitScore)).not.toHaveBeenCalled();
  });

  it("uses the official fit score source for premium users", async () => {
    vi.mocked(fetchBillingSummary).mockResolvedValueOnce({
      creditBalance: 0,
      creditsPurchased: 0,
      creditsUsed: 0,
      draftApplications: 0,
      submittedApplications: 0,
      products: [],
      orders: [],
      creditHistory: [],
      subscription: null,
      hasActivePremium: true,
    });

    render(
      <MemoryRouter>
        <UniversitySearchPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("87%")).toBeInTheDocument();
    expect(vi.mocked(calculateFitScore)).toHaveBeenCalledTimes(1);
  });
});



