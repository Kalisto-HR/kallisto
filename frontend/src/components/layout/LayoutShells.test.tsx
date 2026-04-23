import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, vi } from "vitest";
import { AuthShell } from "./AuthShell";
import { ApplicantShell } from "./ApplicantShell";
import { PortalShell } from "./PortalShell";
import { fetchApplicantApplications } from "../../services/applicant/applicationsService";
import { fetchBasketState } from "../../services/applicant/basketService";
import type { SessionContextValue } from "../../types/session";

const signOutMock = vi.fn();

let sessionState: SessionContextValue = {
  user: {
    id: "user-1",
    firstName: "Ava",
    lastName: "Li",
    permissions: [],
    role: "applicant",
    universityLinked: null,
  },
  loading: false,
  initialized: true,
  signOut: signOutMock,
  refreshSession: vi.fn(),
};

vi.mock("../../hooks/useSession", () => ({
  useSession: () => sessionState,
}));

vi.mock("../../services/applicant/applicationsService", () => ({
  fetchApplicantApplications: vi.fn(),
}));

vi.mock("../../services/applicant/basketService", () => ({
  fetchBasketState: vi.fn(),
}));

describe("layout shells", () => {
  beforeEach(() => {
    signOutMock.mockReset();
    sessionState = {
      user: {
        id: "user-1",
        firstName: "Ava",
        lastName: "Li",
        permissions: [],
        role: "applicant",
        universityLinked: null,
      },
      loading: false,
      initialized: true,
      signOut: signOutMock,
      refreshSession: vi.fn(),
    };

    vi.mocked(fetchApplicantApplications).mockResolvedValue([]);
    vi.mocked(fetchBasketState).mockResolvedValue({
      items: [],
      selectedPlanId: null,
      recommendedPlanId: null,
      totalUniversities: 0,
      maxPlanCapacity: 20,
    });
  });

  it("renders the auth shell wrapper", () => {
    render(
      <MemoryRouter>
        <AuthShell title="Sign In" subtitle="Access your Kallisto workspace">
          <div>Auth content</div>
        </AuthShell>
      </MemoryRouter>,
    );

    expect(screen.getByText("Kallisto")).toBeInTheDocument();
    expect(screen.getByText("Auth content")).toBeInTheDocument();
  });

  it("renders the applicant shell and child content", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/applicant/dashboard"]}>
        <ApplicantShell>
          <div>Applicant child</div>
        </ApplicantShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Applicant child")).toBeInTheDocument();
    expect(screen.getByText("Find Universities")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /collapse sidebar/i }));

    expect(screen.queryByText("Find Universities")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /expand sidebar/i })).toBeInTheDocument();
  });

  it("renders the portal shell and child content", async () => {
    const user = userEvent.setup();

    sessionState = {
      user: {
        id: "partner-1",
        firstName: "Pat",
        lastName: "Ner",
        permissions: [],
        role: "partner",
        universityLinked: "11111111-1111-1111-1111-111111111111",
      },
      loading: false,
      initialized: true,
      signOut: signOutMock,
      refreshSession: vi.fn(),
    };

    render(
      <MemoryRouter initialEntries={["/partner/11111111-1111-1111-1111-111111111111/dashboard"]}>
        <Routes>
          <Route
            path="/partner/:universityId/dashboard"
            element={(
              <PortalShell>
                <div>Portal child</div>
              </PortalShell>
            )}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Portal child")).toBeInTheDocument();
    expect(screen.getByText("Portal Console")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /collapse sidebar/i }));

    expect(screen.queryByText("Portal Console")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /expand sidebar/i })).toBeInTheDocument();
  });

  it("renders collapsible staff portal navigation", async () => {
    const user = userEvent.setup();
    sessionState = {
      user: {
        id: "staff-1",
        firstName: "Sam",
        lastName: "Staff",
        permissions: [],
        role: "staff",
        universityLinked: null,
      },
      loading: false,
      initialized: true,
      signOut: signOutMock,
      refreshSession: vi.fn(),
    };

    render(
      <MemoryRouter initialEntries={["/staff/dashboard"]}>
        <Routes>
          <Route
            path="/staff/dashboard"
            element={(
              <PortalShell>
                <div>Staff child</div>
              </PortalShell>
            )}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Staff child")).toBeInTheDocument();
    expect(screen.getByText("Staff Workspace")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /collapse sidebar/i }));

    expect(screen.queryByText("Staff Workspace")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /expand sidebar/i })).toBeInTheDocument();
  });
});
