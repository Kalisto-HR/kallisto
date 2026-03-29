import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/httpClient";
import { fetchUniversities, fetchUniversityById, searchUniversities } from "./universitiesService";

vi.mock("../api/httpClient", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("applicant universities service", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("loads the canonical universities list and detail endpoints", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: {
          success: true,
          data: {
            items: [{ id: "uni-1", name: "Example University" }],
            total: 1,
            page: 1,
            limit: 10,
            total_pages: 1,
          },
          message: "",
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: {
          success: true,
          data: { id: "uni-1", name: "Example University", created_at: "2026-01-01" },
          message: "",
        },
      });

    await expect(fetchUniversities(1, 10)).resolves.toEqual(
      expect.objectContaining({
        items: [expect.objectContaining({ id: "uni-1", name: "Example University" })],
        total: 1,
      }),
    );
    await expect(fetchUniversityById("uni-1")).resolves.toEqual(
      expect.objectContaining({ id: "uni-1", name: "Example University", createdAt: "2026-01-01" }),
    );

    expect(vi.mocked(api.get)).toHaveBeenNthCalledWith(1, "/v1.0/applicant/universities?page=1&limit=10");
    expect(vi.mocked(api.get)).toHaveBeenNthCalledWith(2, "/v1.0/applicant/universities/uni-1");
  });

  it("serializes search filters into the canonical applicant search endpoint", async () => {
    vi.mocked(api.get).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      data: {
        success: true,
        data: { items: [], total: 0, page: 2, limit: 5, total_pages: 0 },
        message: "",
      },
    });

    await searchUniversities({
      q: "computer science",
      country: "Uzbekistan",
      minRanking: 1,
      maxRanking: 100,
      scholarshipAvailable: true,
      page: 2,
      limit: 5,
    });

    const [path] = vi.mocked(api.get).mock.calls[0]!;
    expect(path).toContain("/v1.0/applicant/universities/search?");
    expect(path).toContain("q=computer+science");
    expect(path).toContain("country=Uzbekistan");
    expect(path).toContain("min_ranking=1");
    expect(path).toContain("max_ranking=100");
    expect(path).toContain("scholarship_available=true");
    expect(path).toContain("page=2");
    expect(path).toContain("limit=5");
  });
});
