import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, vi } from "vitest";
import { AuthShell } from "./AuthShell";
import { StudentShell } from "./StudentShell";
import { ManagementLiteralLayout } from "./ManagementLiteralLayout";
import { fetchStudentApplications } from "../../services/client/applicationsService";
import { fetchBasketState } from "../../services/client/basketService";

const signOutMock = vi.fn();

let sessionState: any = {
  user: {
    firstName: "Ava",
    lastName: "Li",
    role: "applicant",
    universityLinked: null,
  },
  initialized: true,
  isAuthenticated: true,
  signOut: signOutMock,
};

vi.mock("../../hooks/useSession", () => ({
  useSession: () => sessionState,
}));

vi.mock("../../services/client/applicationsService", () => ({
  fetchStudentApplications: vi.fn(),
}));

vi.mock("../../services/client/basketService", () => ({
  fetchBasketState: vi.fn(),
}));

describe("layout shells", () => {
  beforeEach(() => {
    signOutMock.mockReset();
    sessionState = {
      user: {
        firstName: "Ava",
        lastName: "Li",
        role: "applicant",
        universityLinked: null,
      },
      initialized: true,
      isAuthenticated: true,
      signOut: signOutMock,
    };

    vi.mocked(fetchStudentApplications).mockResolvedValue([]);
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
    render(
      <MemoryRouter initialEntries={["/applicant/dashboard"]}>
        <StudentShell>
          <div>Applicant child</div>
        </StudentShell>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Applicant child")).toBeInTheDocument();
    expect(screen.getByText("Find Universities")).toBeInTheDocument();
  });

  it("renders the management shell and child content", async () => {
    sessionState = {
      user: {
        firstName: "Pat",
        lastName: "Ner",
        role: "partner",
        universityLinked: "11111111-1111-1111-1111-111111111111",
      },
      initialized: true,
      isAuthenticated: true,
      signOut: signOutMock,
    };

    render(
      <MemoryRouter initialEntries={["/partner/11111111-1111-1111-1111-111111111111/dashboard"]}>
        <Routes>
          <Route
            path="/partner/:universityId/dashboard"
            element={(
              <ManagementLiteralLayout>
                <div>Management child</div>
              </ManagementLiteralLayout>
            )}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Management child")).toBeInTheDocument();
    expect(screen.getByText("Management Console")).toBeInTheDocument();
  });
});
