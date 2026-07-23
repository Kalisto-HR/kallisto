import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const universityId = "e1f2a3b4-c5d6-7890-4567-901234567890";

function renderBuilder(initialPath = `/partner/${universityId}/application-builder`) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/partner/:universityId/application-builder" element={<ApplicationStructure />} />
        <Route path="/partner/:universityId/application-structure" element={<ApplicationStructure />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ApplicationBuilder", () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({
      user: {
        id: "partner-1",
        firstName: "Partner",
        lastName: "User",
        role: "partner",
        permissions: [],
        universityLinked: universityId,
      },
      loading: false,
      initialized: true,
      refreshSession: vi.fn(),
      signOut: vi.fn(),
      isAuthenticated: true,
    });
    vi.mocked(updatePartnerApplicationStructure).mockResolvedValue(undefined);
    vi.mocked(publishPartnerApplicationStructure).mockResolvedValue(undefined);
    vi.mocked(fetchPartnerApplicationStructureHistory).mockResolvedValue([]);
  });

  it("fails closed when the live builder fetch fails", async () => {
    vi.mocked(fetchPartnerApplicationStructure).mockRejectedValue(new Error("Builder load failed"));

    renderBuilder();

    expect(await screen.findByText(/builder load failed/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /publish/i })).not.toBeInTheDocument();
  });

  it("shows the empty application state instead of sample schema when no builder exists", async () => {
    vi.mocked(fetchPartnerApplicationStructure).mockResolvedValue(null);

    renderBuilder();

    expect(await screen.findByText(/no applications created yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create first application/i })).toBeInTheDocument();
  });

  it("creates a guided application from a template and saves the draft", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchPartnerApplicationStructure).mockResolvedValue(null);

    renderBuilder();

    await user.click(await screen.findByRole("button", { name: /create first application/i }));
    const templateButtons = await screen.findAllByRole("button", { name: /^use template$/i });
    await user.click(templateButtons[0]);

    expect(await screen.findByRole("heading", { name: /application builder/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /preview as student/i }).length).toBeGreaterThan(0);
    expect(screen.getByText(/applicant information/i)).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /save draft/i })[0]);

    await waitFor(() => {
      expect(updatePartnerApplicationStructure).toHaveBeenCalledWith(
        expect.objectContaining({ schemaType: "application_builder_v1" }),
      );
    });
  });

  it("maps legacy schema fields into the new guided builder for manual review", async () => {
    vi.mocked(fetchPartnerApplicationStructure).mockResolvedValue({
      sections: [
        {
          title: "Legacy form",
          fields: [
            { label: "Passport upload", type: "file-upload", required: true },
            { label: "School name", type: "short-text", required: true },
            { label: "Motivation", type: "textarea", required: false },
          ],
        },
      ],
    });

    renderBuilder();

    expect(await screen.findByRole("heading", { name: /application builder/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue(/migrated application/i)).toBeInTheDocument();
    expect(screen.getByText(/of 8 steps/i)).toBeInTheDocument();
  });
});
