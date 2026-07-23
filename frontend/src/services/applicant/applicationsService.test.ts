import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/httpClient";
import {
  createApplicantApplication,
  fetchApplicantApplication,
  fetchApplicantApplications,
  importApplicantProfileTestScoresToApplication,
  submitApplicantApplication,
  updateApplicantApplication,
  uploadApplicantApplicationFiles,
} from "./applicationsService";

vi.mock("../api/httpClient", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    raw: vi.fn(),
  },
}));

describe("applicant applications service", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.put).mockReset();
    vi.mocked(api.raw).mockReset();
  });

  it("loads the canonical application list and detail payloads", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: {
          success: true,
          data: [
            {
              id: "app-1",
              university_id: "uni-1",
              university_name: "Example University",
              application_cycle: "2026",
              status: "draft",
              created_at: "2026-01-01",
            },
          ],
          message: "",
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: {
          success: true,
          data: {
            id: "app-1",
            user_id: "user-1",
            university_id: "uni-1",
            application_cycle: "2026",
            status: "submitted",
            data: { major: "CS" },
            created_at: "2026-01-01",
          },
          message: "",
        },
      });

    await expect(fetchApplicantApplications()).resolves.toEqual([
      {
        id: "app-1",
        universityId: "uni-1",
        universityName: "Example University",
        applicationCycle: "2026",
        status: "draft",
        createdAt: "2026-01-01",
        submittedAt: null,
        statusProgress: 15,
        statusStage: "application_preparation",
        isFinal: false,
        isSuccessfulOutcome: false,
      },
    ]);
    await expect(fetchApplicantApplication("uni-1", "2026")).resolves.toEqual({
      userId: "user-1",
      id: "app-1",
      universityId: "uni-1",
      applicationCycle: "2026",
      status: "submitted",
      data: { major: "CS" },
      submittedAt: null,
      createdAt: "2026-01-01",
      statusProgress: 35,
      statusStage: "application_received",
      isFinal: false,
      isSuccessfulOutcome: false,
      history: [],
      tasks: [],
      decision: null,
    });

    expect(vi.mocked(api.get)).toHaveBeenNthCalledWith(1, "/v1.0/applicant/applications");
    expect(vi.mocked(api.get)).toHaveBeenNthCalledWith(2, "/v1.0/applicant/applications/uni-1/2026");
  });

  it("creates, updates, submits, and imports scores through canonical applicant routes", async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ ok: true, status: 201, error: null, data: { msg: "created" } })
      .mockResolvedValueOnce({ ok: true, status: 200, error: null, data: { msg: "submitted" } })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: {
          success: true,
          data: {
            imported_count: 1,
            test_scores: [{ id: "score-1", test_type: "IELTS", score: 7.5, out_of: 9 }],
          },
          message: "",
        },
      });
    vi.mocked(api.put).mockResolvedValue({ ok: true, status: 200, error: null, data: { msg: "updated" } });

    await createApplicantApplication({ universityId: "uni-1", cycle: "2026", data: { major: "CS" } });
    await updateApplicantApplication("uni-1", "2026", { major: "Math" });
    await submitApplicantApplication("uni-1", "2026");
    await expect(importApplicantProfileTestScoresToApplication("uni-1", "2026", ["score-1"])).resolves.toEqual({
      importedCount: 1,
      testScores: [
        {
          id: "score-1",
          testType: "IELTS",
          otherTestName: null,
          score: 7.5,
          outOf: 9,
          takenOn: null,
          normalized: null,
        },
      ],
    });

    expect(vi.mocked(api.post)).toHaveBeenNthCalledWith(1, "/v1.0/applicant/applications", {
      university_id: "uni-1",
      application_cycle: "2026",
      data: { major: "CS" },
    });
    expect(vi.mocked(api.put)).toHaveBeenCalledWith("/v1.0/applicant/applications/uni-1/2026", {
      data: { major: "Math" },
    });
    expect(vi.mocked(api.post)).toHaveBeenNthCalledWith(2, "/v1.0/applicant/applications/uni-1/2026/submit");
  });

  it("uploads applicant application files and normalizes returned assets", async () => {
    vi.mocked(api.raw).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: [
            { id: "file-1", name: "Transcript.pdf", type: "application/pdf", size: 1234, download_url: "/download/1" },
            { id: "", name: "skip-me" },
          ],
          message: "",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const files = [new File(["hello"], "Transcript.pdf", { type: "application/pdf" })];
    await expect(uploadApplicantApplicationFiles("uni-1", "2026", files, "transcript")).resolves.toEqual([
      {
        id: "file-1",
        name: "Transcript.pdf",
        type: "application/pdf",
        size: 1234,
        storage: "application_file",
        downloadUrl: "/download/1",
      },
    ]);

    const [path, init] = vi.mocked(api.raw).mock.calls[0]!;
    expect(path).toContain("/v1.0/applicant/application-files/upload?");
    expect(path).toContain("university_id=uni-1");
    expect(path).toContain("cycle=2026");
    expect(path).toContain("field_key=transcript");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
  });
});
