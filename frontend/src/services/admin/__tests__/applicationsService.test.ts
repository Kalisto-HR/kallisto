import { describe, expect, it, vi } from "vitest";

vi.mock("../../api/httpClient", () => ({
  adminApi: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

import { adminApi } from "../../api/httpClient";
import { fetchAdminApplications } from "../applicationsService";

describe("admin applications service", () => {
  it("normalizes paginated application list", async () => {
    vi.mocked(adminApi.get).mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        items: [
          {
            id: "a1",
            user_id: "u1",
            university_id: "uni",
            application_cycle: "2026-Fall",
            applicant_info: { email: "x@y.com" },
            application_data: { gpa: 3.9 },
            submitted_at: "2026-01-01T00:00:00Z",
            received_at: "2026-01-01T00:00:01Z",
            status: "pending",
            reviewed_by: null,
            reviewed_at: null,
            notes: null,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        total_pages: 1,
      },
      error: null,
    });

    const result = await fetchAdminApplications();
    expect(result.total).toBe(1);
    expect(result.items[0]?.id).toBe("a1");
    expect(result.items[0]?.applicantInfo.email).toBe("x@y.com");
  });
});
