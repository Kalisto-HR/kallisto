import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/httpClient";
import { getSessionUser, signIn, signOut, signUpApplicant } from "./service";

vi.mock("../api/httpClient", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("auth service", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
  });

  it("posts canonical sign-in and sign-up requests", async () => {
    vi.mocked(api.post)
      .mockResolvedValueOnce({ ok: true, status: 200, error: null, data: { msg: "ok" } })
      .mockResolvedValueOnce({ ok: false, status: 400, error: "duplicate email", data: null });

    await expect(signIn("user@example.com", "secret")).resolves.toEqual({ ok: true, error: undefined });
    await expect(signUpApplicant("user@example.com", "Vida", "Test", "secret")).resolves.toEqual({
      ok: false,
      error: "duplicate email",
    });

    expect(vi.mocked(api.post)).toHaveBeenNthCalledWith(1, "/v1.0/auth/sign-in", {
      email: "user@example.com",
      password: "secret",
    });
    expect(vi.mocked(api.post)).toHaveBeenNthCalledWith(2, "/v1.0/auth/sign-up", {
      email: "user@example.com",
      first_name: "Vida",
      last_name: "Test",
      password: "secret",
    });
  });

  it("posts canonical sign-out requests", async () => {
    vi.mocked(api.post).mockResolvedValue({ ok: true, status: 200, error: null, data: { msg: "ok" } });

    await signOut();

    expect(vi.mocked(api.post)).toHaveBeenCalledWith("/v1.0/auth/sign-out");
  });

  it("normalizes the authenticated session user payload", async () => {
    vi.mocked(api.get).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      data: {
        user: {
          id: "user-1",
          email: "partner@example.com",
          first_name: "Partner",
          last_name: "Owner",
          role: "partner",
          permissions: ["partner.dashboard", "", 12],
          university_linked: "uni-123",
        },
      },
    });

    await expect(getSessionUser()).resolves.toEqual({
      id: "user-1",
      email: "partner@example.com",
      firstName: "Partner",
      lastName: "Owner",
      role: "partner",
      permissions: ["partner.dashboard"],
      universityLinked: "uni-123",
    });
  });

  it("returns null for unauthenticated sessions and throws on backend failures", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ ok: false, status: 401, error: "unauthorized", data: null })
      .mockResolvedValueOnce({ ok: false, status: 500, error: "backend down", data: null });

    await expect(getSessionUser()).resolves.toBeNull();
    await expect(getSessionUser()).rejects.toThrow("backend down");
  });
});
