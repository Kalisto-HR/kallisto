import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PortalDashboard } from "./PortalDashboard";
import { usePartnerDashboardData } from "../../hooks/usePartnerDashboardData";
import {
  copyPartnerContactEmails,
  downloadPartnerContactsCsv,
  fetchPartnerAnalyticsContacts,
} from "../../services/partner/analyticsService";

vi.mock("../../hooks/usePartnerDashboardData", () => ({
  usePartnerDashboardData: vi.fn(),
}));

vi.mock("../../services/partner/analyticsService", () => ({
  fetchPartnerAnalyticsContacts: vi.fn(),
  copyPartnerContactEmails: vi.fn(),
  downloadPartnerContactsCsv: vi.fn(),
}));

describe("PortalDashboard", () => {
  beforeAll(() => {
    class ResizeObserverMock {
      observe() {
        return undefined;
      }

      unobserve() {
        return undefined;
      }

      disconnect() {
        return undefined;
      }
    }

    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      value: ResizeObserverMock,
    });
  });

  beforeEach(() => {
    vi.mocked(fetchPartnerAnalyticsContacts).mockReset();
    vi.mocked(copyPartnerContactEmails).mockReset();
    vi.mocked(downloadPartnerContactsCsv).mockReset();
  });

  it("renders gender distribution with the configured applicant gender buckets", () => {
    vi.mocked(usePartnerDashboardData).mockReturnValue({
      data: {
        newApplications: 1,
        totalApplicants: 9,
        avgSAT: 1350,
        avgIELTS: 7.2,
        maleCount: 4,
        femaleCount: 3,
        nonBinaryCount: 1,
        preferNotToSayCount: 1,
        suspectsCount: 2,
        prospectsCount: 1,
        studentOriginStats: [],
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
    expect(screen.getByText(/^non-binary$/i)).toBeInTheDocument();
    expect(screen.getByText(/^prefer not to say$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^unknown$/i)).not.toBeInTheDocument();
    expect(screen.getByText("4 applicants")).toBeInTheDocument();
    expect(screen.getByText("3 applicants")).toBeInTheDocument();
    expect(screen.getByText("44.4%")).toBeInTheDocument();
    expect(screen.getAllByText("11.1%")).toHaveLength(2);
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
        nonBinaryCount: 0,
        preferNotToSayCount: 0,
        suspectsCount: 0,
        prospectsCount: 0,
        studentOriginStats: [],
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

  it("renders origin statistics and stage contact controls", () => {
    vi.mocked(usePartnerDashboardData).mockReturnValue({
      data: {
        newApplications: 1,
        totalApplicants: 2,
        avgSAT: 1320,
        avgIELTS: 7,
        maleCount: 1,
        femaleCount: 1,
        nonBinaryCount: 0,
        preferNotToSayCount: 0,
        suspectsCount: 5,
        prospectsCount: 3,
        studentOriginStats: [
          { regionCode: "tashkent_city", count: 6, percentage: 60 },
          { regionCode: "samarqand", count: 4, percentage: 40 },
          { regionCode: null, count: 1, percentage: 10 },
        ],
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

    expect(screen.getByText(/^suspects$/i)).toBeInTheDocument();
    expect(screen.getByText(/^prospects$/i)).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText(/student origin statistics/i)).toBeInTheDocument();
    expect(screen.getByText("Tashkent City")).toBeInTheDocument();
    expect(screen.getByText("Samarqand Region")).toBeInTheDocument();
    expect(screen.getByText("Unknown region")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /copy emails/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /^csv$/i })).toHaveLength(2);
  });

  it("copies suspect emails on demand", async () => {
    const user = userEvent.setup();
    const contacts = [
      {
        userId: "user-1",
        name: "Jane Doe",
        email: "jane@example.com",
        country: "Kazakhstan",
        stage: "suspect" as const,
        lastActivityAt: "2026-04-20T10:00:00Z",
      },
    ];
    vi.mocked(fetchPartnerAnalyticsContacts).mockResolvedValue(contacts);
    vi.mocked(copyPartnerContactEmails).mockResolvedValue(1);
    vi.mocked(usePartnerDashboardData).mockReturnValue({
      data: {
        newApplications: 0,
        totalApplicants: 0,
        avgSAT: 0,
        avgIELTS: 0,
        maleCount: 0,
        femaleCount: 0,
        nonBinaryCount: 0,
        preferNotToSayCount: 0,
        suspectsCount: 1,
        prospectsCount: 0,
        studentOriginStats: [],
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

    await user.click(screen.getAllByRole("button", { name: /copy emails/i })[0]);

    await waitFor(() => expect(fetchPartnerAnalyticsContacts).toHaveBeenCalledWith("suspect"));
    expect(copyPartnerContactEmails).toHaveBeenCalledWith(contacts);
    expect(screen.getByText(/copied 1 suspect email/i)).toBeInTheDocument();
  });

  it("exports prospect contacts as CSV on demand", async () => {
    const user = userEvent.setup();
    const contacts = [
      {
        userId: "user-2",
        name: "John Prospect",
        email: "john@example.com",
        country: "Uzbekistan",
        stage: "prospect" as const,
        lastActivityAt: null,
      },
    ];
    vi.mocked(fetchPartnerAnalyticsContacts).mockResolvedValue(contacts);
    vi.mocked(usePartnerDashboardData).mockReturnValue({
      data: {
        newApplications: 0,
        totalApplicants: 0,
        avgSAT: 0,
        avgIELTS: 0,
        maleCount: 0,
        femaleCount: 0,
        nonBinaryCount: 0,
        preferNotToSayCount: 0,
        suspectsCount: 0,
        prospectsCount: 1,
        studentOriginStats: [],
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

    await user.click(screen.getAllByRole("button", { name: /^csv$/i })[1]);

    await waitFor(() => expect(fetchPartnerAnalyticsContacts).toHaveBeenCalledWith("prospect"));
    expect(downloadPartnerContactsCsv).toHaveBeenCalledWith("prospect", contacts);
    expect(screen.getByText(/downloaded 1 prospect contact/i)).toBeInTheDocument();
  });
});
