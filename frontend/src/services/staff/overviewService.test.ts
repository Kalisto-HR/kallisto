import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/httpClient";
import { fetchStaffOverview } from "./overviewService";

vi.mock("../api/httpClient", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("staff overview service", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("loads the canonical staff dashboard payload", async () => {
    vi.mocked(api.get).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      data: {
        stats: { total_universities: 3, management_accounts: 2, total_applications: 9 },
        recent_activity: [{ id: "1", type: "audit", description: "Created", user: "Admin", timestamp: "now", status: "done" }],
        system_health: [{ label: "Observed Requests (24h)", value: "4", status: "neutral" }],
      },
    });

    await expect(fetchStaffOverview()).resolves.toEqual({
      stats: { total_universities: 3, portal_accounts: 2, total_applications: 9 },
      recent_activity: [{ id: "1", type: "audit", description: "Created", user: "Admin", timestamp: "now", status: "done" }],
      system_health: [{ label: "Observed Requests (24h)", value: "4", status: "neutral" }],
    });
    expect(vi.mocked(api.get)).toHaveBeenCalledWith("/v1.0/staff/dashboard");
  });

  it("throws when the staff dashboard call fails", async () => {
    vi.mocked(api.get).mockResolvedValue({ ok: false, status: 500, error: "backend down", data: null });
    await expect(fetchStaffOverview()).rejects.toThrow("backend down");
  });
});
