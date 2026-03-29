import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/httpClient";
import { fetchStaffUniversities, normalizeStaffUniversityItem } from "./universitiesService";

vi.mock("../api/httpClient", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("staff universities service", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("uses the canonical staff universities endpoint", async () => {
    vi.mocked(api.get).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      data: { items: [], total: 0, page: 1, limit: 20, total_pages: 0 },
    });

    await fetchStaffUniversities({ q: "test", page: 2, limit: 10, status: "active" });

    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(1);
    const [path] = vi.mocked(api.get).mock.calls[0];
    expect(path).toContain("/v1.0/staff/universities?");
    expect(path).toContain("q=test");
    expect(path).toContain("status=active");
    expect(path).toContain("page=2");
    expect(path).toContain("limit=10");
  });

  it("normalizes the staff university payload", () => {
    expect(
      normalizeStaffUniversityItem({
        id: "u-1",
        name: "Westminster International University in Tashkent",
        city: "Tashkent",
        country: "Uzbekistan",
        acceptance_rate: 14.5,
        created_at: "2026-03-24T12:00:00Z",
      }),
    ).toEqual({
      id: "u-1",
      name: "Westminster International University in Tashkent",
      name_en: "Westminster International University in Tashkent",
      type: "public",
      location: "Tashkent, Uzbekistan",
      status: "active",
      admins: 0,
      applications: 0,
      acceptance_rate: "14.5%",
      joined_date: "2026-03-24T12:00:00Z",
      last_active: "Unknown",
    });
  });
});
