import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/httpClient";
import { fetchStaffSettings, updateStaffSettings } from "./settingsService";

vi.mock("../api/httpClient", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe("staff settings service", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.put).mockReset();
  });

  it("loads the canonical staff settings payload", async () => {
    vi.mocked(api.get).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      data: {
        settings: [
          {
            setting_key: "application_rules",
            setting_value: { applications_open: true },
            updated_at: "2026-03-01",
            updated_by: "staff",
          },
        ],
      },
    });

    await expect(fetchStaffSettings()).resolves.toEqual([
      {
        setting_key: "application_rules",
        setting_value: { applications_open: true },
        updated_at: "2026-03-01",
        updated_by: "staff",
      },
    ]);
    expect(vi.mocked(api.get)).toHaveBeenCalledWith("/v1.0/staff/settings");
  });

  it("updates supported settings through the canonical staff settings endpoint", async () => {
    vi.mocked(api.put).mockResolvedValue({ ok: true, status: 200, error: null, data: { msg: "ok" } });

    await updateStaffSettings({ application_rules: { applications_open: false } });

    expect(vi.mocked(api.put)).toHaveBeenCalledWith("/v1.0/staff/settings", {
      settings: { application_rules: { applications_open: false } },
    });
  });
});
