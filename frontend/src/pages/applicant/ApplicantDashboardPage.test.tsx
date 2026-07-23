import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ApplicantDashboardPage } from "./ApplicantDashboardPage";
import { useApplicantDashboardData } from "../../hooks/useApplicantDashboardData";

vi.mock("../../hooks/useApplicantDashboardData", () => ({
  useApplicantDashboardData: vi.fn(),
}));

describe("ApplicantDashboardPage", () => {
  it("links to live billing for credits and premium", () => {
    vi.mocked(useApplicantDashboardData).mockReturnValue({
      profile: {
        id: "student-1",
        email: "student@example.com",
        firstName: "Ava",
        lastName: "Li",
        data: null,
        lastSeen: null,
      },
      applications: [],
      favoritesCount: 2,
      testScoresCount: 0,
      billingSummary: {
        creditBalance: 4,
        creditsPurchased: 5,
        creditsUsed: 1,
        draftApplications: 0,
        submittedApplications: 0,
        products: [],
        orders: [],
        creditHistory: [],
        subscription: null,
        hasActivePremium: false,
      },
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ApplicantDashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText("Billing").length).toBeGreaterThan(0);
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Application credits available")).toBeInTheDocument();
    expect(screen.getByText("Buy credits and manage Premium")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^billing$/i })).toBeInTheDocument();
    expect(screen.queryByText("Unavailable")).not.toBeInTheDocument();
  });
});
