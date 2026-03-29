import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ApplicantDashboardPage } from "./ApplicantDashboardPage";
import { useApplicantDashboardData } from "../../hooks/useApplicantDashboardData";

vi.mock("../../hooks/useApplicantDashboardData", () => ({
  useApplicantDashboardData: vi.fn(),
}));

describe("ApplicantDashboardPage", () => {
  it("shows billing as unavailable instead of implying live credits", () => {
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
      loading: false,
      error: null,
      reload: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ApplicantDashboardPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Billing")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /billing unavailable/i })).toBeInTheDocument();
    expect(screen.queryByText(/get more credits/i)).not.toBeInTheDocument();
  });
});
