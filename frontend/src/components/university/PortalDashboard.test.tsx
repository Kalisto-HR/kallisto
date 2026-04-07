import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PortalDashboard } from "./PortalDashboard";
import { usePartnerDashboardData } from "../../hooks/usePartnerDashboardData";

vi.mock("../../hooks/usePartnerDashboardData", () => ({
  usePartnerDashboardData: vi.fn(),
}));

describe("PortalDashboard", () => {
  it("renders gender distribution including the unknown bucket", () => {
    vi.mocked(usePartnerDashboardData).mockReturnValue({
      data: {
        newApplications: 1,
        totalApplicants: 9,
        avgSAT: 1350,
        avgIELTS: 7.2,
        maleCount: 4,
        femaleCount: 3,
        recentApplications: [],
        notifications: [],
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/partner/universities/uni-1/dashboard"]}>
        <Routes>
          <Route path="/partner/universities/:universityId/dashboard" element={<PortalDashboard />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/gender distribution/i)).toBeInTheDocument();
    expect(screen.getByText(/^male$/i)).toBeInTheDocument();
    expect(screen.getByText(/^female$/i)).toBeInTheDocument();
    expect(screen.getByText(/^unknown$/i)).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/22% of submitted applicants/i)).toBeInTheDocument();
  });

  it("renders an explicit empty state when no applicants have been submitted", () => {
    vi.mocked(usePartnerDashboardData).mockReturnValue({
      data: {
        newApplications: 0,
        totalApplicants: 0,
        avgSAT: 0,
        avgIELTS: 0,
        maleCount: 0,
        femaleCount: 0,
        recentApplications: [],
        notifications: [],
      },
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/partner/universities/uni-1/dashboard"]}>
        <Routes>
          <Route path="/partner/universities/:universityId/dashboard" element={<PortalDashboard />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/no submitted applicants are available yet/i)).toBeInTheDocument();
  });
});
