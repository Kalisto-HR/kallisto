import { describe, expect, it, vi } from "vitest";

vi.mock("../../api/httpClient", () => ({
  clientApi: {
    get: vi.fn(),
  },
}));

import { clientApi } from "../../api/httpClient";
import { searchUniversities } from "../universitiesService";

function mockSearchResponse() {
  vi.mocked(clientApi.get).mockResolvedValue({
    ok: true,
    status: 200,
    data: {
      success: true,
      message: "ok",
      data: {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        total_pages: 1,
      },
    },
    error: null,
  });
}

describe("universitiesService.searchUniversities", () => {
  it("serializes full advanced filter payload to query string", async () => {
    mockSearchResponse();

    await searchUniversities({
      q: "engineering",
      province: "Gauteng",
      city: "Johannesburg",
      country: "South Africa",
      minRanking: 10,
      maxRanking: 200,
      maxFee: 120,
      maxTuition: 25000,
      maxLivingCost: 12000,
      maxTotalCost: 36000,
      minAcceptanceRate: 20,
      maxAcceptanceRate: 80,
      minIelts: 6.5,
      minToefl: 90,
      scholarshipAvailable: true,
      competitiveness: "match",
      cityType: "urban",
      safetyLevel: "high",
      campusVibe: "collaborative",
      visaRequired: false,
      page: 2,
      limit: 20,
    });

    expect(clientApi.get).toHaveBeenCalled();
    const calledPath = vi.mocked(clientApi.get).mock.calls[0][0];
    const query = new URL(calledPath, "http://localhost").searchParams;

    expect(query.get("q")).toBe("engineering");
    expect(query.get("province")).toBe("Gauteng");
    expect(query.get("city")).toBe("Johannesburg");
    expect(query.get("country")).toBe("South Africa");
    expect(query.get("min_ranking")).toBe("10");
    expect(query.get("max_ranking")).toBe("200");
    expect(query.get("max_fee")).toBe("120");
    expect(query.get("max_tuition")).toBe("25000");
    expect(query.get("max_living_cost")).toBe("12000");
    expect(query.get("max_total_cost")).toBe("36000");
    expect(query.get("min_acceptance_rate")).toBe("20");
    expect(query.get("max_acceptance_rate")).toBe("80");
    expect(query.get("min_ielts")).toBe("6.5");
    expect(query.get("min_toefl")).toBe("90");
    expect(query.get("scholarship_available")).toBe("true");
    expect(query.get("competitiveness")).toBe("match");
    expect(query.get("city_type")).toBe("urban");
    expect(query.get("safety_level")).toBe("high");
    expect(query.get("campus_vibe")).toBe("collaborative");
    expect(query.get("visa_required")).toBe("false");
    expect(query.get("page")).toBe("2");
    expect(query.get("limit")).toBe("20");
  });

  it("omits unset params and keeps defaults for page and limit", async () => {
    mockSearchResponse();

    await searchUniversities({
      q: "",
    });

    const calledPath = vi.mocked(clientApi.get).mock.calls.at(-1)?.[0] ?? "";
    const query = new URL(calledPath, "http://localhost").searchParams;

    expect(query.get("q")).toBeNull();
    expect(query.get("country")).toBeNull();
    expect(query.get("max_ranking")).toBeNull();
    expect(query.get("page")).toBe("1");
    expect(query.get("limit")).toBe("10");
  });
});
