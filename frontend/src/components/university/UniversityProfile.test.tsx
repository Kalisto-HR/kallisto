import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { UniversityProfile } from "./UniversityProfile";
import { useSession } from "../../hooks/useSession";
import { fetchPartnerUniversityProfile, updatePartnerUniversityProfile } from "../../services/partner/universityService";

vi.mock("../../hooks/useSession", () => ({
  useSession: vi.fn(),
}));

vi.mock("../../services/partner/universityService", () => ({
  fetchPartnerUniversityProfile: vi.fn(),
  updatePartnerUniversityProfile: vi.fn(),
}));

describe("UniversityProfile", () => {
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
    vi.mocked(updatePartnerUniversityProfile).mockResolvedValue(undefined);
  });

  it("fails closed when the live profile fetch fails", async () => {
    vi.mocked(fetchPartnerUniversityProfile).mockRejectedValue(new Error("Profile load failed"));

    render(
      <MemoryRouter initialEntries={["/partner/university/profile/e1f2a3b4-c5d6-7890-4567-901234567890"]}>
        <Routes>
          <Route path="/partner/university/profile/:universityId" element={<UniversityProfile />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/profile load failed/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save changes/i })).not.toBeInTheDocument();
  });
});
