import { describe, expect, it, vi, beforeEach } from "vitest";
import { clientApi } from "../httpClient";

describe("httpClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends requests with credentials and parses JSON", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    } as Response);

    const response = await clientApi.get<{ success: boolean }>("/v1.0/me");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1.0/me",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      }),
    );
    expect(response.ok).toBe(true);
    expect(response.data?.success).toBe(true);
  });

  it("returns structured network errors", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    const response = await clientApi.get("/v1.0/me");
    expect(response.ok).toBe(false);
    expect(response.error).toContain("offline");
  });
});
