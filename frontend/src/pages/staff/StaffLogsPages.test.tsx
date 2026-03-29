import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StaffAuditLogsPage } from "./StaffAuditLogsPage";
import { StaffServiceLogsPage } from "./StaffServiceLogsPage";
import { fetchStaffAuditLogs, fetchStaffServiceLogs } from "../../services/staff/logsService";

vi.mock("../../services/staff/logsService", () => ({
  fetchStaffServiceLogs: vi.fn(),
  fetchStaffAuditLogs: vi.fn(),
}));

describe("staff log pages", () => {
  beforeEach(() => {
  vi.mocked(fetchStaffServiceLogs).mockResolvedValue({
      items: [
        {
          id: "svc-1",
          timestamp: "2026-03-24T12:00:00Z",
          level: "warn",
          microservice: "staff",
          handler: "/v1.0/staff/universities",
          message: "GET /v1.0/staff/universities -> 403",
          method: "GET",
          status_code: 403,
          duration_ms: 18,
          role: "staff",
          user_id: "user-1",
          request_id: "req-123",
          ip_address: "127.0.0.1",
          user_agent: "Vitest",
          metadata: {},
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    });

  vi.mocked(fetchStaffAuditLogs).mockResolvedValue({
      items: [
        {
          id: "aud-1",
          timestamp: "2026-03-24T12:00:00Z",
          actor: "Platform Staff",
          actor_id: "user-1",
          actor_type: "staff",
          action: "security.access-denied",
          action_description: "Permission access denied",
          target_entity: "/v1.0/staff/universities",
          target_id: null,
          outcome: "failed",
          ip_address: "127.0.0.1",
          request_id: "req-123",
          metadata: {},
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
  });

  it("renders structured service log fields without crashing", async () => {
    render(<StaffServiceLogsPage />);

    expect(await screen.findByText("GET /v1.0/staff/universities")).toBeInTheDocument();
    expect(screen.getByText("HTTP 403")).toBeInTheDocument();
    expect(screen.getByText("req-123")).toBeInTheDocument();
    expect(screen.getByText("127.0.0.1")).toBeInTheDocument();
  });

  it("applies service log filters through the page fetch call", async () => {
    const user = userEvent.setup();
    render(<StaffServiceLogsPage />);

    await screen.findByText("GET /v1.0/staff/universities");

    await user.type(screen.getByLabelText("Request ID"), "req-filter");
    await user.selectOptions(screen.getByLabelText("Method"), "POST");
    await user.type(screen.getByLabelText("Status Code"), "401");
    await user.click(screen.getByRole("button", { name: "Apply Filters" }));

    await waitFor(() => {
    expect(vi.mocked(fetchStaffServiceLogs)).toHaveBeenLastCalledWith(
        expect.objectContaining({
          requestId: "req-filter",
          method: "POST",
          statusCode: "401",
          page: 1,
          limit: 100,
        }),
      );
    });
  });

  it("renders audit request IDs and normalized actor types", async () => {
    render(<StaffAuditLogsPage />);

    expect(await screen.findByText("security.access-denied")).toBeInTheDocument();
    expect(screen.getByText("staff")).toBeInTheDocument();
    expect(screen.getByText("req-123")).toBeInTheDocument();
  });
});
