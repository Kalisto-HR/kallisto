import { describe, expect, it, vi, beforeEach } from "vitest";
import { adminApi } from "../api/httpClient";
import { fetchSuperuserAuditLogs, fetchSuperuserServiceLogs } from "./superuserService";

vi.mock("../api/httpClient", () => ({
  adminApi: {
    get: vi.fn(),
  },
}));

describe("superuser log services", () => {
  beforeEach(() => {
    vi.mocked(adminApi.get).mockReset();
  });

  it("serializes service log filters into the staff logs query string", async () => {
    vi.mocked(adminApi.get).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      data: { items: [], total: 0, page: 1, limit: 50, total_pages: 0 },
    });

    await fetchSuperuserServiceLogs({
      requestId: "req-123",
      method: "POST",
      statusCode: 403,
      role: "staff",
      from: "2026-03-24T11:00:00.000Z",
      to: "2026-03-24T12:00:00.000Z",
      page: 2,
      limit: 25,
    });

    expect(vi.mocked(adminApi.get)).toHaveBeenCalledWith(
      expect.stringContaining("/v1.0/staff/service-logs?"),
    );

    const [path] = vi.mocked(adminApi.get).mock.calls[0];
    expect(path).toContain("request_id=req-123");
    expect(path).toContain("method=POST");
    expect(path).toContain("status_code=403");
    expect(path).toContain("role=staff");
    expect(path).toContain("page=2");
    expect(path).toContain("limit=25");
  });

  it("serializes audit log filters into the staff audit query string", async () => {
    vi.mocked(adminApi.get).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      data: { items: [], total: 0, page: 1, limit: 50, total_pages: 0 },
    });

    await fetchSuperuserAuditLogs({
      requestId: "req-456",
      actorType: "partner",
      targetEntity: "university",
      from: "2026-03-24T11:00:00.000Z",
      to: "2026-03-24T12:00:00.000Z",
      page: 3,
      limit: 10,
    });

    const [path] = vi.mocked(adminApi.get).mock.calls[0];
    expect(path).toContain("request_id=req-456");
    expect(path).toContain("actor_type=partner");
    expect(path).toContain("target_entity=university");
    expect(path).toContain("page=3");
    expect(path).toContain("limit=10");
  });
});
