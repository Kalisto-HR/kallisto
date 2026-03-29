import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/httpClient";
import { fetchPartnerApplicationStructure, fetchPartnerUniversityProfile, updatePartnerApplicationStructure } from "./universityService";

vi.mock("../api/httpClient", () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe("partner university service", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.put).mockReset();
  });

  it("uses the canonical partner university profile endpoint", async () => {
    vi.mocked(api.get).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      data: { id: "uni-1", name: "Example University" },
    });

    await fetchPartnerUniversityProfile();

    expect(vi.mocked(api.get)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(api.get)).toHaveBeenCalledWith("/v1.0/partner/university/profile");
  });

  it("uses the canonical partner application structure endpoint without staff fallback", async () => {
    vi.mocked(api.get).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      data: { application_schema: { sections: [] } },
    });
    vi.mocked(api.put).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      data: { msg: "ok" },
    });

    await fetchPartnerApplicationStructure();
    await updatePartnerApplicationStructure({ sections: [] });

    expect(vi.mocked(api.get)).toHaveBeenCalledWith("/v1.0/partner/university/application-structure");
    expect(vi.mocked(api.put)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(api.put)).toHaveBeenCalledWith("/v1.0/partner/university/application-structure", {
      application_schema: { sections: [] },
    });
  });
});
