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

const baseSchema = {
  sections: [
    {
      id: "section-1",
      name: "Section 1",
      title: "Section 1",
      description: "Section description",
      order: 1,
      visible: true,
      fields: [
        {
          id: "field-1",
          type: "short-text",
          label: "Full Name",
          required: true,
          order: 1,
          visibility: {
            applicant: true,
            partner: true,
            staff: true,
          },
        },
      ],
    },
  ],
};

function renderStructure() {
  return render(
    <MemoryRouter initialEntries={["/partner/e1f2a3b4-c5d6-7890-4567-901234567890/application-structure"]}>
      <Routes>
        <Route
          path="/partner/:universityId/application-structure"
          element={<ApplicationStructure />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

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

    renderStructure();

    expect(await screen.findByText(/structure load failed/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /publish changes/i })).not.toBeInTheDocument();
  });

  it("renders an empty builder state instead of sample schema when no structure exists", async () => {
    vi.mocked(fetchPartnerApplicationStructure).mockResolvedValue(null);
    vi.mocked(fetchPartnerApplicationStructureHistory).mockResolvedValue([]);

    renderStructure();

    expect(await screen.findByText(/no sections yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/statement of purpose/i)).not.toBeInTheDocument();
    expect(screen.getByText(/never published/i)).toBeInTheDocument();
    expect(screen.getByText(/fallback baseline/i)).toBeInTheDocument();
  });

  it("shows published when the live draft matches the latest published version", async () => {
    vi.mocked(fetchPartnerApplicationStructure).mockResolvedValue(baseSchema);
    vi.mocked(fetchPartnerApplicationStructureHistory).mockResolvedValue([
      {
        id: "version-2",
        universityId: "e1f2a3b4-c5d6-7890-4567-901234567890",
        versionNo: 2,
        schema: baseSchema,
        published: true,
        changedBy: "Partner User",
        changeNote: "Published",
        createdAt: "2026-04-02T00:00:00Z",
      },
      {
        id: "version-1",
        universityId: "e1f2a3b4-c5d6-7890-4567-901234567890",
        versionNo: 1,
        schema: baseSchema,
        published: false,
        changedBy: "Partner User",
        changeNote: "Draft",
        createdAt: "2026-04-01T00:00:00Z",
      },
    ]);

    renderStructure();

    expect(await screen.findByText(/^Published$/i)).toBeInTheDocument();
    expect(screen.getByText(/Applicants see the current published structure/i)).toBeInTheDocument();
  });

  it("shows draft changes not published when the draft differs from the latest published version", async () => {
    vi.mocked(fetchPartnerApplicationStructure).mockResolvedValue({
      ...baseSchema,
      sections: [
        {
          ...baseSchema.sections[0],
          title: "Section 1 Updated",
        },
      ],
    });
    vi.mocked(fetchPartnerApplicationStructureHistory).mockResolvedValue([
      {
        id: "version-2",
        universityId: "e1f2a3b4-c5d6-7890-4567-901234567890",
        versionNo: 2,
        schema: baseSchema,
        published: true,
        changedBy: "Partner User",
        changeNote: "Published",
        createdAt: "2026-04-02T00:00:00Z",
      },
    ]);

    renderStructure();

    expect(await screen.findByText(/^Draft changes not published$/i)).toBeInTheDocument();
    expect(screen.getByText(/Applicants still see the last published structure/i)).toBeInTheDocument();
  });

  it("normalizes legacy textarea fields so saved schemas do not crash the page", async () => {
    vi.mocked(fetchPartnerApplicationStructure).mockResolvedValue({
      sections: [
        {
          id: "section-1",
          name: "Application Form",
          title: "Application Form",
          order: 1,
          visible: true,
          fields: [
            {
              id: "personal_statement",
              type: "textarea",
              label: "Personal Statement",
              required: true,
              order: 1,
            },
          ],
        },
      ],
    });
    vi.mocked(fetchPartnerApplicationStructureHistory).mockResolvedValue([]);

    renderStructure();

    expect(await screen.findByText("Personal Statement")).toBeInTheDocument();
    expect(screen.getByText("Long Text")).toBeInTheDocument();
  });
});
