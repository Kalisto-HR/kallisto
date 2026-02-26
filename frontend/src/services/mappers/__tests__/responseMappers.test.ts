import { describe, expect, it } from "vitest";
import {
  normalizeEnvelope,
  normalizePagination,
  normalizeStudentApplication,
  normalizeUniversityListItem,
  toPortalRole,
} from "../responseMappers";

describe("responseMappers", () => {
  it("maps backend roles to portal roles", () => {
    expect(toPortalRole("applicant")).toBe("student");
    expect(toPortalRole("partner")).toBe("partner");
    expect(toPortalRole("staff")).toBe("staff");
  });

  it("normalizes API envelope", () => {
    const value = normalizeEnvelope<{ id: string }>({
      success: true,
      data: { id: "abc" },
      message: "ok",
      timestamp: 123,
    });

    expect(value.success).toBe(true);
    expect(value.data.id).toBe("abc");
    expect(value.message).toBe("ok");
    expect(value.timestamp).toBe(123);
  });

  it("normalizes pagination with snake_case total_pages", () => {
    const value = normalizePagination<{ id: string }>({
      items: [{ id: "1" }],
      total: 20,
      page: 2,
      limit: 10,
      total_pages: 2,
    });

    expect(value.items).toHaveLength(1);
    expect(value.totalPages).toBe(2);
  });

  it("normalizes university list item and application payload", () => {
    const uni = normalizeUniversityListItem({
      id: "u1",
      name: "Test",
      province: "Tashkent",
      ranking: 1,
      application_fee: 25,
    });
    expect(uni.applicationFee).toBe(25);
    expect(uni.country).toBeNull();
    expect(uni.scholarshipAvailable).toBeNull();

    const app = normalizeStudentApplication({
      user_id: "x",
      university_id: "u1",
      application_cycle: "2026-Fall",
      status: "draft",
      data: { essay: "ok" },
      created_at: "2026-01-01T00:00:00Z",
      submitted_at: null,
    });
    expect(app.universityId).toBe("u1");
    expect(app.data?.essay).toBe("ok");
  });
});
