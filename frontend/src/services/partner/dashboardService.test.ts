import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/httpClient";
import {
  fetchPartnerApplicationStructureHistory,
  fetchPartnerDashboard,
  publishPartnerApplicationStructure,
} from "./dashboardService";

vi.mock("../api/httpClient", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("partner dashboard service", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
  });

  it("normalizes the partner dashboard payload", async () => {
    vi.mocked(api.get).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      data: {
        new_applications: 4,
        total_applicants: 20,
        avg_sat: 1350,
        avg_ielts: 7,
        male_count: 8,
        female_count: 9,
        non_binary_count: 2,
        prefer_not_to_say_count: 1,
        suspects_count: 6,
        prospects_count: 3,
        student_origin_stats: [
          { country: "Kazakhstan", count: 6, percentage: 60 },
          { country: "Uzbekistan", count: 4, percentage: 40 },
        ],
        recent_applications: [
          {
            id: "app-1",
            name: "Vida Test",
            program: "CS",
            citizenship: "UZ",
            status: "submitted",
            submitted_at: "2026-03-01",
          },
        ],
        notifications: [{ id: "note-1", type: "system", message: "Hello", time: "now", read: false }],
      },
    });

    await expect(fetchPartnerDashboard("ignored")).resolves.toEqual({
      newApplications: 4,
      totalApplicants: 20,
      avgSAT: 1350,
      avgIELTS: 7,
      maleCount: 8,
      femaleCount: 9,
      nonBinaryCount: 2,
      preferNotToSayCount: 1,
      suspectsCount: 6,
      prospectsCount: 3,
      studentOriginStats: [
        { country: "Kazakhstan", count: 6, percentage: 60 },
        { country: "Uzbekistan", count: 4, percentage: 40 },
      ],
      recentApplications: [
        {
          id: "app-1",
          name: "Vida Test",
          program: "CS",
          citizenship: "UZ",
          status: "submitted",
          submittedAt: "2026-03-01",
        },
      ],
      notifications: [{ id: "note-1", type: "system", message: "Hello", time: "now", read: false }],
    });
    expect(vi.mocked(api.get)).toHaveBeenCalledWith("/v1.0/partner/dashboard");
  });

  it("loads structure history and publishes via canonical partner endpoints", async () => {
    vi.mocked(api.get).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      data: {
        items: [
          {
            id: "version-1",
            university_id: "uni-1",
            version_no: 2,
            schema: { sections: [] },
            published: true,
            changed_by: "partner-1",
            change_note: "Published",
            created_at: "2026-03-10",
          },
        ],
      },
    });
    vi.mocked(api.post).mockResolvedValue({ ok: true, status: 200, error: null, data: { id: "version-2" } });

    await expect(fetchPartnerApplicationStructureHistory("ignored", 5)).resolves.toEqual([
      {
        id: "version-1",
        universityId: "uni-1",
        versionNo: 2,
        schema: { sections: [] },
        published: true,
        changedBy: "partner-1",
        changeNote: "Published",
        createdAt: "2026-03-10",
      },
    ]);
    await publishPartnerApplicationStructure("ignored", "Ready to publish");

    expect(vi.mocked(api.get)).toHaveBeenCalledWith("/v1.0/partner/university/application-structure/history?limit=5");
    expect(vi.mocked(api.post)).toHaveBeenCalledWith("/v1.0/partner/university/application-structure/publish", {
      change_note: "Ready to publish",
    });
  });
});
