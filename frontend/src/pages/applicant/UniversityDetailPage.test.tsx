import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { UniversityDetailPage } from "./UniversityDetailPage";
import { fetchApplicantApplications } from "../../services/applicant/applicationsService";
import { addBasketItem, fetchBasketState, removeBasketItem } from "../../services/applicant/basketService";
import { fetchCompareList } from "../../services/applicant/compareService";
import { calculateFitScore } from "../../services/applicant/fitScoreService";
import { fetchApplicantProfile, fetchApplicantTestScores } from "../../services/applicant/profileService";
import { fetchUniversityById } from "../../services/applicant/universitiesService";

vi.mock("../../services/applicant/applicationsService", () => ({
  fetchApplicantApplications: vi.fn(),
}));

vi.mock("../../services/applicant/basketService", () => ({
  addBasketItem: vi.fn(),
  fetchBasketState: vi.fn(),
  removeBasketItem: vi.fn(),
}));

vi.mock("../../services/applicant/compareService", () => ({
  fetchCompareList: vi.fn(),
  addCompareItem: vi.fn(),
  removeCompareItem: vi.fn(),
  MAX_COMPARE_ITEMS: 4,
  COMPARE_LIMIT_MESSAGE: "You already have 4 universities in Compare. Remove one to add this university.",
}));

vi.mock("../../services/applicant/fitScoreService", () => ({
  calculateFitScore: vi.fn(),
}));

vi.mock("../../services/applicant/profileService", () => ({
  fetchApplicantProfile: vi.fn(),
  fetchApplicantTestScores: vi.fn(),
}));

vi.mock("../../services/applicant/universitiesService", () => ({
  fetchUniversityById: vi.fn(),
}));

describe("UniversityDetailPage", () => {
  beforeEach(() => {
    vi.mocked(fetchUniversityById).mockResolvedValue({
      id: "uni-1",
      managerId: null,
      name: "Bukhara State University",
      description: "A public university in Bukhara.",
      province: "Bukhara Region",
      city: "Bukhara",
      country: "Uzbekistan",
      applicationFee: 120,
      acceptanceRate: 0.32,
      tuitionFee: 18000,
      applicationDeadline: null,
      ieltsMin: 6,
      toeflMin: 80,
      scholarshipAvailable: true,
      cityType: "urban",
      campusVibe: "historic",
      applicationStructurePublished: true,
      universityProfile: {
        website: "https://bsu.uz",
        contactEmail: "admissions@bsu.uz",
        foundedYear: 1930,
        studentCount: 18000,
        facultyCount: 1200,
        accreditations: ["Ministry of Higher Education", { name: "ISO 9001" }],
      },
      metadata: null,
      createdAt: "2026-01-01T00:00:00Z",
      applicationSchema: {
        sections: [
          {
            id: "main",
            title: "Main",
            fields: [
              {
                id: "full_name",
                type: "short-text",
                label: "Full Name",
                required: true,
                visibility: { applicant: true, partner: true, staff: true },
              },
            ],
          },
        ],
      },
    });
    vi.mocked(fetchCompareList).mockResolvedValue([]);
    vi.mocked(fetchBasketState).mockResolvedValue({
      items: [],
      selectedPlanId: null,
      recommendedPlanId: null,
      totalUniversities: 0,
      maxPlanCapacity: 4,
    });
    vi.mocked(fetchApplicantApplications).mockResolvedValue([]);
    vi.mocked(fetchApplicantProfile).mockRejectedValue(new Error("profile unavailable"));
    vi.mocked(fetchApplicantTestScores).mockResolvedValue([]);
    vi.mocked(calculateFitScore).mockResolvedValue({
      finalScore: 78,
      label: "Strong Fit",
      breakdown: {
        academicScore: 80,
        languageScore: 90,
        majorScore: 75,
        budgetScore: 70,
        documentScore: 60,
        deadlineScore: 95,
      },
      reasons: ["Intended major is related to the program major."],
      recommendations: ["Prepare missing documents."],
    });
    vi.mocked(addBasketItem).mockResolvedValue(undefined);
    vi.mocked(removeBasketItem).mockResolvedValue(undefined);
  });

  it("renders university profile details and shows basket errors", async () => {
    const user = userEvent.setup();

    vi.mocked(addBasketItem).mockRejectedValueOnce(new Error("basket service unavailable"));

    render(
      <MemoryRouter initialEntries={["/applicant/universities/uni-1"]}>
        <Routes>
          <Route path="/applicant/universities/:id" element={<UniversityDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/bukhara state university/i)).toBeInTheDocument();
    expect(screen.getByText("bsu.uz")).toBeInTheDocument();
    expect(screen.getAllByText(/match score/i).length).toBeGreaterThan(0);
    expect(screen.queryByText("78%")).not.toBeInTheDocument();
    expect(screen.getByText("78")).toBeInTheDocument();
    expect(screen.getAllByText(/strong fit/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/admissions@bsu\.uz/i)).toBeInTheDocument();
    expect(screen.getByText(/kallisto match score/i)).toBeInTheDocument();
    expect(screen.getByText(/academic fit/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /add to basket/i }));

    await waitFor(() => {
      expect(addBasketItem).toHaveBeenCalledWith("uni-1");
    });
    expect(await screen.findByText(/basket update failed/i)).toBeInTheDocument();
    expect(screen.getByText(/unable to update your basket right now/i)).toBeInTheDocument();
  });
});


