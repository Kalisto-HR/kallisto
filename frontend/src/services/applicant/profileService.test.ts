import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/httpClient";
import {
  createApplicantTestScore,
  deleteApplicantTestScore,
  fetchApplicantPhotoUrl,
  fetchApplicantProfile,
  fetchApplicantTestScores,
  updateApplicantPassword,
  updateApplicantProfile,
  uploadApplicantPhoto,
} from "./profileService";

vi.mock("../api/httpClient", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    raw: vi.fn(),
  },
}));

describe("applicant profile service", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.put).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.delete).mockReset();
    vi.mocked(api.raw).mockReset();
  });

  it("loads and updates the applicant profile through canonical applicant routes", async () => {
    vi.mocked(api.get).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      data: {
        success: true,
        data: {
          id: "user-1",
          email: "vida@example.com",
          first_name: "Vida",
          last_name: "Test",
          data: { bio: "hello" },
        },
        message: "",
      },
    });
    vi.mocked(api.put).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      data: { msg: "updated" },
    });

    await expect(fetchApplicantProfile()).resolves.toEqual({
      id: "user-1",
      email: "vida@example.com",
      firstName: "Vida",
      lastName: "Test",
      data: { bio: "hello" },
      lastSeen: null,
    });

    await updateApplicantProfile({ firstName: "Vida", lastName: "Updated", data: { bio: "updated" } });
    expect(vi.mocked(api.put)).toHaveBeenCalledWith("/v1.0/applicant/profile", {
      first_name: "Vida",
      last_name: "Updated",
      data: { bio: "updated" },
    });
  });

  it("returns reauth metadata for password updates", async () => {
    vi.mocked(api.put).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      data: { msg: "updated", reauth_required: true, reason: "password-changed" },
    });

    await expect(
      updateApplicantPassword({ currentPassword: "old-password", newPassword: "new-password" }),
    ).resolves.toEqual({
      reauthRequired: true,
      reason: "password-changed",
    });
  });

  it("uploads and fetches profile photos through raw requests", async () => {
    const createObjectURL = vi.fn().mockReturnValue("blob:photo-url");
    vi.stubGlobal("URL", { ...URL, createObjectURL });
    vi.mocked(api.raw)
      .mockResolvedValueOnce(new Response(JSON.stringify({ msg: "too large" }), { status: 400 }))
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockResolvedValueOnce(new Response(new Blob(["image-bytes"]), { status: 200 }));

    await expect(uploadApplicantPhoto(new File(["image"], "photo.png", { type: "image/png" }))).rejects.toThrow(
      "too large",
    );
    await expect(fetchApplicantPhotoUrl()).resolves.toBeNull();
    await expect(fetchApplicantPhotoUrl()).resolves.toBe("blob:photo-url");

    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });

  it("normalizes test score CRUD payloads", async () => {
    vi.mocked(api.get).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      data: {
        success: true,
        data: [{ id: "score-1", user_id: "user-1", test_type: "IELTS", score: 7.5, out_of: 9 }],
        message: "",
      },
    });
    vi.mocked(api.post).mockResolvedValue({
      ok: true,
      status: 201,
      error: null,
      data: {
        success: true,
        data: { id: "score-2", user_id: "user-1", test_type: "SAT", score: 1450, out_of: 1600 },
        message: "",
      },
    });
    vi.mocked(api.delete).mockResolvedValue({ ok: true, status: 204, error: null, data: null });

    await expect(fetchApplicantTestScores()).resolves.toEqual([
      {
        id: "score-1",
        userId: "user-1",
        testType: "IELTS",
        otherTestName: null,
        score: 7.5,
        outOf: 9,
        takenOn: null,
        createdAt: "",
        updatedAt: "",
      },
    ]);
    await expect(
      createApplicantTestScore({ testType: "SAT", score: 1450, outOf: 1600, otherTestName: null, takenOn: null }),
    ).resolves.toEqual({
      id: "score-2",
      userId: "user-1",
      testType: "SAT",
      otherTestName: null,
      score: 1450,
      outOf: 1600,
      takenOn: null,
      createdAt: "",
      updatedAt: "",
    });
    await deleteApplicantTestScore("score-2");

    expect(vi.mocked(api.delete)).toHaveBeenCalledWith("/v1.0/applicant/profile/test-scores/score-2");
  });
});
