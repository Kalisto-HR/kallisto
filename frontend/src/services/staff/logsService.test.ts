import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/httpClient";
import { fetchStaffAuditLogs, fetchStaffServiceLogs } from "./logsService";

vi.mock("../api/httpClient", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("staff logs service", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("serializes service log filters into the canonical staff endpoint", async () => {
    vi.mocked(api.get).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      data: { items: [], total: 0, page: 1, limit: 50, total_pages: 0 },
    });

    await fetchStaffServiceLogs({
      requestId: "req-123",
      method: "POST",
      statusCode: 403,
      role: "staff",
      from: "2026-03-24T11:00:00.000Z",
      to: "2026-03-24T12:00:00.000Z",
      page: 2,
      limit: 25,
    });

    const [path] = vi.mocked(api.get).mock.calls[0];
    expect(path).toContain("/v1.0/staff/service-logs?");
    expect(path).toContain("request_id=req-123");
    expect(path).toContain("method=POST");
    expect(path).toContain("status_code=403");
    expect(path).toContain("role=staff");
    expect(path).toContain("page=2");
    expect(path).toContain("limit=25");
  });

  it("serializes audit log filters into the canonical staff endpoint", async () => {
    vi.mocked(api.get).mockResolvedValue({
      ok: true,
      status: 200,
      error: null,
      data: { items: [], total: 0, page: 1, limit: 50, total_pages: 0 },
    });

    await fetchStaffAuditLogs({
      requestId: "req-456",
      actorType: "partner",
      targetEntity: "university",
      from: "2026-03-24T11:00:00.000Z",
      to: "2026-03-24T12:00:00.000Z",
      page: 3,
      limit: 10,
    });

    const [path] = vi.mocked(api.get).mock.calls[0];
    expect(path).toContain("/v1.0/staff/audit-logs?");
    expect(path).toContain("request_id=req-456");
    expect(path).toContain("actor_type=partner");
    expect(path).toContain("target_entity=university");
    expect(path).toContain("page=3");
    expect(path).toContain("limit=10");
  });
});
