import { describe, expect, it, vi } from "vitest";

vi.mock("../../api/httpClient", () => ({
  clientApi: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import { clientApi } from "../../api/httpClient";
import { fetchFavorites } from "../favoritesService";

describe("favoritesService", () => {
  it("normalizes string-id favorites safely", async () => {
    vi.mocked(clientApi.get).mockResolvedValue({
      ok: true,
      status: 200,
      data: ["uni-1", "uni-2"],
      error: null,
    });

    const result = await fetchFavorites();
    expect(result).toEqual([
      {
        id: "uni-1",
        name: "uni-1",
        province: null,
        city: null,
        country: null,
        ranking: null,
        applicationFee: null,
        acceptanceRate: null,
        tuitionFee: null,
        livingCost: null,
        totalCost: null,
        applicationDeadline: null,
        ieltsMin: null,
        toeflMin: null,
        scholarshipAvailable: null,
        competitiveness: null,
        cityType: null,
        safetyLevel: null,
        campusVibe: null,
        visaRequired: null,
      },
      {
        id: "uni-2",
        name: "uni-2",
        province: null,
        city: null,
        country: null,
        ranking: null,
        applicationFee: null,
        acceptanceRate: null,
        tuitionFee: null,
        livingCost: null,
        totalCost: null,
        applicationDeadline: null,
        ieltsMin: null,
        toeflMin: null,
        scholarshipAvailable: null,
        competitiveness: null,
        cityType: null,
        safetyLevel: null,
        campusVibe: null,
        visaRequired: null,
      },
    ]);
  });

  it("normalizes envelope favorites with api field names", async () => {
    vi.mocked(clientApi.get).mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        success: true,
        data: [
          {
            id: "u-1",
            name: "Alpha University",
            province: "Tashkent",
            ranking: 10,
            application_fee: 50,
          },
        ],
      },
      error: null,
    });

    const result = await fetchFavorites();
    expect(result[0]).toEqual({
      id: "u-1",
      name: "Alpha University",
      province: "Tashkent",
      city: null,
      country: null,
      ranking: 10,
      applicationFee: 50,
      acceptanceRate: null,
      tuitionFee: null,
      livingCost: null,
      totalCost: null,
      applicationDeadline: null,
      ieltsMin: null,
      toeflMin: null,
      scholarshipAvailable: null,
      competitiveness: null,
      cityType: null,
      safetyLevel: null,
      campusVibe: null,
      visaRequired: null,
    });
  });
});
