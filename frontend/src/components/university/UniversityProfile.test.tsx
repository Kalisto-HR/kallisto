import { render, screen } from "@testing-library/react";
import { UniversityProfile } from "./UniversityProfile";
import type { University } from "../../types/domain";

const university: University = {
  id: "uni-1",
  managerId: null,
  name: "Example University",
  description: "A test university",
  province: null,
  city: "Tashkent",
  country: "Uzbekistan",
  applicationFee: 100,
  acceptanceRate: 45,
  tuitionFee: 12000,
  applicationDeadline: null,
  ieltsMin: 6.5,
  toeflMin: 80,
  scholarshipAvailable: true,
  cityType: null,
  campusVibe: null,
  applicationSchema: null,
  applicationStructurePublished: true,
  universityProfile: null,
  metadata: null,
  createdAt: "2026-01-01T00:00:00Z",
};

describe("UniversityProfile", () => {
  it("fails closed when the live profile fetch fails", async () => {
    render(
      <UniversityProfile
        universityId="uni-1"
        loadUniversity={async () => {
          throw new Error("Profile load failed");
        }}
      />,
    );

    expect(await screen.findByText(/profile load failed/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save all changes/i })).not.toBeInTheDocument();
  });

  it("renders a single page-level save action in edit mode", async () => {
    render(
      <UniversityProfile
        universityId="uni-1"
        mode="edit"
        loadUniversity={async () => university}
        saveUniversity={async () => undefined}
      />,
    );

    expect(await screen.findByRole("button", { name: /save all changes/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /save all changes/i })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /^save changes$/i })).not.toBeInTheDocument();
  });
});


