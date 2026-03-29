import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApplicantApplicationCreatePage } from "./ApplicantApplicationCreatePage";
import {
  createApplicantApplication,
  fetchApplicantApplication,
  fetchApplicantApplications,
  importApplicantProfileTestScoresToApplication,
  submitApplicantApplication,
  updateApplicantApplication,
  uploadApplicantApplicationFiles,
} from "../../services/applicant/applicationsService";
import { fetchApplicantTestScores } from "../../services/applicant/profileService";
import { fetchUniversityById } from "../../services/applicant/universitiesService";

vi.mock("../../services/applicant/universitiesService", () => ({
  fetchUniversityById: vi.fn(),
}));

vi.mock("../../services/applicant/applicationsService", () => ({
  fetchApplicantApplications: vi.fn(),
  fetchApplicantApplication: vi.fn(),
  createApplicantApplication: vi.fn(),
  updateApplicantApplication: vi.fn(),
  submitApplicantApplication: vi.fn(),
  importApplicantProfileTestScoresToApplication: vi.fn(),
  uploadApplicantApplicationFiles: vi.fn(),
}));

vi.mock("../../services/applicant/profileService", () => ({
  fetchApplicantTestScores: vi.fn(),
}));

describe("ApplicantApplicationCreatePage", () => {
  beforeEach(() => {
    vi.mocked(fetchUniversityById).mockResolvedValue({
      id: "wiut-id",
      managerId: null,
      name: "Westminster International University in Tashkent",
      description: null,
      province: null,
      city: "Tashkent",
      country: "Uzbekistan",
      ranking: 8,
      applicationFee: 150,
      acceptanceRate: null,
      tuitionFee: null,
      applicationDeadline: null,
      ieltsMin: null,
      toeflMin: null,
      scholarshipAvailable: null,
      cityType: null,
      campusVibe: null,
      universityProfile: null,
      metadata: null,
      createdAt: "2026-01-01T00:00:00Z",
      applicationSchema: {
        sections: [
          {
            id: "application-form",
            title: "Application Form",
            order: 1,
            visible: true,
            fields: [
              {
                id: "gpa",
                dataKey: "gpa",
                type: "number",
                label: "GPA",
                required: true,
                order: 1,
                visibility: { applicant: true, partner: true, staff: true },
              },
              {
                id: "ielts_score",
                dataKey: "ielts_score",
                type: "number",
                label: "IELTS Score",
                required: true,
                order: 2,
                visibility: { applicant: true, partner: true, staff: true },
              },
              {
                id: "personal_statement",
                dataKey: "personal_statement",
                type: "essay",
                label: "Personal Statement",
                required: true,
                order: 3,
                visibility: { applicant: true, partner: true, staff: true },
              },
            ],
          },
        ],
      },
    });
    vi.mocked(fetchApplicantApplications).mockResolvedValue([]);
    vi.mocked(fetchApplicantApplication).mockResolvedValue({
      userId: "user-id",
      universityId: "wiut-id",
      applicationCycle: "2026-Fall",
      status: "draft",
      data: {},
      submittedAt: null,
      createdAt: "2026-01-01T00:00:00Z",
    });
    vi.mocked(fetchApplicantTestScores).mockResolvedValue([]);
    vi.mocked(createApplicantApplication).mockResolvedValue(undefined);
    vi.mocked(updateApplicantApplication).mockResolvedValue(undefined);
    vi.mocked(submitApplicantApplication).mockResolvedValue(undefined);
    vi.mocked(importApplicantProfileTestScoresToApplication).mockResolvedValue({
      importedCount: 0,
      testScores: [],
    });
    vi.mocked(uploadApplicantApplicationFiles).mockResolvedValue([]);
  });

  it("renders normalized WIUT fields and submits their values", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/applicant/applications/new/wiut-id"]}>
        <Routes>
          <Route path="/applicant/applications/new/:universityId" element={<ApplicantApplicationCreatePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByText(/application overview/i);

    await user.click(screen.getByRole("button", { name: /^continue$/i }));
    await screen.findByText(/eligibility and requirements/i);

    await user.click(screen.getByRole("button", { name: /^continue$/i }));

    const gpaInput = await screen.findByLabelText(/gpa/i);
    const ieltsInput = screen.getByLabelText(/ielts score/i);
    const personalStatement = screen.getByLabelText(/personal statement/i);

    expect(personalStatement.tagName).toBe("TEXTAREA");

    fireEvent.change(gpaInput, { target: { value: "3.9" } });
    fireEvent.change(ieltsInput, { target: { value: "7.5" } });
    await user.type(personalStatement, "This is my personal statement for WIUT.");
    await waitFor(() => {
      expect(personalStatement).toHaveValue("This is my personal statement for WIUT.");
    });

    await user.click(screen.getByRole("button", { name: /review/i }));
    await screen.findByText(/review and submit/i);

    await user.click(screen.getByRole("button", { name: /submit application/i }));

    await waitFor(() => {
      expect(createApplicantApplication).toHaveBeenCalled();
      expect(updateApplicantApplication).toHaveBeenCalledWith("wiut-id", "2026-Fall", {
        gpa: "3.9",
        ielts_score: "7.5",
        personal_statement: "This is my personal statement for WIUT.",
      });
    });

    expect(submitApplicantApplication).toHaveBeenCalledWith("wiut-id", "2026-Fall");
  });
});
