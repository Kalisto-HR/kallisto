import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApplicationStructure } from "./ApplicationStructure";
import { useSession } from "../../hooks/useSession";
import { fetchPartnerApplicationStructure, updatePartnerApplicationStructure } from "../../services/partner/universityService";
import {
  fetchPartnerApplicationStructureHistory,
  publishPartnerApplicationStructure,
} from "../../services/partner/dashboardService";

vi.mock("../../hooks/useSession", () => ({
  useSession: vi.fn(),
}));

vi.mock("../../services/partner/universityService", () => ({
  fetchPartnerApplicationStructure: vi.fn(),
  updatePartnerApplicationStructure: vi.fn(),
}));

vi.mock("../../services/partner/dashboardService", () => ({
  fetchPartnerApplicationStructureHistory: vi.fn(),
  publishPartnerApplicationStructure: vi.fn(),
}));

describe("ApplicationStructure", () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({
      user: {
        id: "partner-1",
        firstName: "Partner",
        lastName: "User",
        role: "partner",
        permissions: [],
        universityLinked: "e1f2a3b4-c5d6-7890-4567-901234567890",
      },
      loading: false,
      initialized: true,
      refreshSession: vi.fn(),
      signOut: vi.fn(),
      isAuthenticated: true,
    });
    vi.mocked(updatePartnerApplicationStructure).mockResolvedValue(undefined);
    vi.mocked(publishPartnerApplicationStructure).mockResolvedValue(undefined);
  });

  it("fails closed when the live structure fetch fails", async () => {
    vi.mocked(fetchPartnerApplicationStructure).mockRejectedValue(new Error("Structure load failed"));
    vi.mocked(fetchPartnerApplicationStructureHistory).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={["/partner/university/application-structure/e1f2a3b4-c5d6-7890-4567-901234567890"]}>
        <Routes>
          <Route
            path="/partner/university/application-structure/:universityId"
            element={<ApplicationStructure />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/structure load failed/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /publish changes/i })).not.toBeInTheDocument();
  });

  it("renders an empty builder state instead of sample schema when no structure exists", async () => {
    vi.mocked(fetchPartnerApplicationStructure).mockResolvedValue(null);
    vi.mocked(fetchPartnerApplicationStructureHistory).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={["/partner/university/application-structure/e1f2a3b4-c5d6-7890-4567-901234567890"]}>
        <Routes>
          <Route
            path="/partner/university/application-structure/:universityId"
            element={<ApplicationStructure />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/no sections yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/statement of purpose/i)).not.toBeInTheDocument();
  });
});
