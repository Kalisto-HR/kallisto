import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/httpClient";
import { fetchUniversities, fetchUniversityById, fetchUniversityFilterOptions, searchUniversities } from "./universitiesService";

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
      minPrice: 12000000,
      maxPrice: 135000000,
      region: "tashkent",
      studyFormats: ["full-time", "evening"],
      languages: ["english", "russian"],
      page: 2,
      limit: 5,
    });

    const [path] = vi.mocked(api.get).mock.calls[0]!;
    expect(path).toContain("/v1.0/applicant/universities/search?");
    expect(path).toContain("q=computer+science");
    expect(path).toContain("minPrice=12000000");
    expect(path).toContain("maxPrice=135000000");
    expect(path).toContain("region=tashkent");
    expect(path).toContain("studyFormats=full-time%2Cevening");
    expect(path).toContain("languages=english%2Crussian");
    expect(path).toContain("page=2");
    expect(path).toContain("limit=5");
  });

  it("loads dynamic university filter options", async () => {
    vi.mocked(api.get).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      data: {
        success: true,
        data: {
          price_range: { min: 12000000, max: 135000000 },
          regions: [{ value: "tashkent", label: "Toshkent" }],
          study_formats: [{ value: "full-time", label: "Kunduzgi" }],
          languages: [{ value: "english", label: "Ingliz" }],
        },
        message: "",
      },
    });

    await expect(fetchUniversityFilterOptions()).resolves.toEqual({
      priceRange: { min: 12000000, max: 135000000 },
      regions: [{ value: "tashkent", label: "Toshkent" }],
      studyFormats: [{ value: "full-time", label: "Kunduzgi" }],
      languages: [{ value: "english", label: "Ingliz" }],
    });
    expect(vi.mocked(api.get)).toHaveBeenCalledWith("/v1.0/applicant/universities/filter-options");
  });
});
