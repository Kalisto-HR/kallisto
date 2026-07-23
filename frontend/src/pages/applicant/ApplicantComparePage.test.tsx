import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApplicantComparePage } from "./ApplicantComparePage";
import { clearCompareList, fetchCompareList, removeCompareItem } from "../../services/applicant/compareService";
import type { CompareUniversityItem } from "../../types/domain";

vi.mock("../../services/applicant/compareService", () => ({
  clearCompareList: vi.fn(),
  fetchCompareList: vi.fn(),
  removeCompareItem: vi.fn(),
  MAX_COMPARE_ITEMS: 4,
  COMPARE_LIMIT_MESSAGE: "You already have 4 universities in Compare. Remove one to add this university.",
  PREMIUM_REQUIRED_MESSAGE: "PREMIUM_REQUIRED",
}));

function compareUniversity(overrides: Partial<CompareUniversityItem>): CompareUniversityItem {
  return {
    id: "uni-1",
    slug: "uni-1",
    name: "Bukhara State University",
    region: "bukhara",
    city: "bukhara",
    averageContractAmount: 32000000,
    contractCurrency: "UZS",
    contractPeriod: "year",
    universityType: "public",
    languagesOfInstruction: ["uzbek", "russian"],
    studyFormats: ["full_time"],
    financialSupport: {
      scholarships: "available",
      governmentGrants: "not_provided",
      tuitionDiscounts: "varies",
      otherSupport: "not_provided",
    },
    dormitoryStatus: "limited",
    dormitoryNote: "Available for a limited number of students.",
    accreditation: {
      licenceStatus: "verified",
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
      careerCentre: "available",
      internshipSupport: "available",
      employerPartnerships: "not_provided",
      jobFairs: "not_provided",
      entrepreneurshipSupport: "not_provided",
      employmentData: null,
    },
    admissions: {
      deadline: "2026-08-15",
      deadlineStatus: "exact",
      universityApplicationFee: { amount: 150000, currency: "UZS", status: "provided" },
      kallistoApplicationFee: { amount: 10000, currency: "UZS", status: "provided" },
      canApplyThroughKallisto: true,
      kallistoApplicationStatus: "open",
    },
    ...overrides,
  };
}

describe("ApplicantComparePage", () => {
  beforeEach(() => {
    vi.mocked(fetchCompareList).mockResolvedValue([
      compareUniversity({ id: "uni-1", name: "Bukhara State University", slug: "bukhara-state-university" }),
      compareUniversity({
        id: "uni-2",
        name: "AKFA University",
        slug: "akfa-university",
        region: "tashkent",
        city: "tashkent",
        universityType: "private",
        languagesOfInstruction: ["english"],
        averageContractAmount: null,
        admissions: {
          deadline: null,
          deadlineStatus: "not_provided",
          universityApplicationFee: { amount: null, currency: "UZS", status: "not_provided" },
          kallistoApplicationFee: { amount: 10000, currency: "UZS", status: "provided" },
          canApplyThroughKallisto: false,
          kallistoApplicationStatus: "not_available",
        },
      }),
    ]);
    vi.mocked(clearCompareList).mockResolvedValue(undefined);
    vi.mocked(removeCompareItem).mockResolvedValue(undefined);
  });

  it("renders approved institution-level criteria without program, ranking, or Match Score rows", async () => {
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<ApplicantComparePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findAllByText(/bukhara state university/i)).not.toHaveLength(0);
    expect(screen.getAllByText("Average contract amount")).not.toHaveLength(0);
    expect(screen.getAllByText("Languages of instruction")).not.toHaveLength(0);
    expect(screen.getAllByText("Application availability through Kallisto")).not.toHaveLength(0);
    expect(screen.queryByText(/match score/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/program duration/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ranking/i)).not.toBeInTheDocument();
  });

  it("hides equivalent rows in differences-only mode while keeping rows with missing data", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<ApplicantComparePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findAllByText(/akfa university/i);
    await user.click(screen.getByText("Show differences only"));

    expect(screen.queryByText("Employment and career support")).not.toBeInTheDocument();
    expect(screen.getAllByText("Average contract amount")).not.toHaveLength(0);
  });
});
