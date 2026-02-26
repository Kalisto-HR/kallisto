import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../api/httpClient", () => ({
  clientApi: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

import { clientApi } from "../../api/httpClient";
import {
  fetchStudentPhotoUrl,
  updateStudentPassword,
  uploadStudentPhoto,
} from "../profileService";

describe("profileService", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends password update payload to profile password endpoint", async () => {
    vi.mocked(clientApi.put).mockResolvedValue({
      ok: true,
      status: 200,
      data: { msg: "ok" },
      error: null,
    });

    await updateStudentPassword({
      currentPassword: "current-password",
      newPassword: "new-password-123",
    });

    expect(clientApi.put).toHaveBeenCalledWith("/v1.0/profile/password", {
      current_password: "current-password",
      new_password: "new-password-123",
    });
  });

  it("returns null when profile photo is not found", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => null,
    } as Response);

    const result = await fetchStudentPhotoUrl();
    expect(result).toBeNull();
  });

  it("surfaces upload API errors for profile photo", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ msg: "unsupported image type" }),
    } as Response);

    await expect(
      uploadStudentPhoto(new File(["fake"], "avatar.txt", { type: "text/plain" })),
    ).rejects.toThrow("unsupported image type");
  });
});
