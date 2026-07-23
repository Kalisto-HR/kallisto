import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StaffOverview from "./StaffOverview";
import { routes } from "../../routes/routeConfig";
import type { StaffOverviewPayload } from "../../services/staff/overviewService";

function buildOverview(overrides: Partial<StaffOverviewPayload> = {}): StaffOverviewPayload {
  return {
    stats: {
      total_students: 12,
      new_students_last_7_days: 3,
      total_universities: 3,
      active_programs: 9,
      applications_started: 8,
      applications_submitted: 4,
      applications_under_review: 0,
      accepted_applications: 0,
      rejected_applications: 0,
      pending_document_reviews: 2,
      completed_student_payments: 0,
      total_platform_revenue: 0,
      portal_accounts: 2,
      total_applications: 8,
    },
    application_funnel: [
      { stage: "registered", count: 12 },
      { stage: "application_started", count: 8 },
      { stage: "application_submitted", count: 4 },
    ],
    registrations_by_date: [],
    applications_by_status: [],
    popular_universities: [],
    popular_programs: [],
    students_by_region: [],
    application_conversion: [],
    recent_activity: [],
    system_health: [],
    ...overrides,
  };
}

describe("StaffOverview", () => {
  it("links recent activity to the staff audit logs page", () => {
    render(
      <MemoryRouter>
        <StaffOverview
          data={buildOverview()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "View audit log" })).toHaveAttribute("href", routes.staff.auditLogs);
  });

  it("renders non-good system health statuses distinctly", () => {
    render(
      <MemoryRouter>
        <StaffOverview
          data={buildOverview({
            recent_activity: [],
            system_health: [
              { label: "Observed Response Time (24h)", value: "450 ms", status: "warn" },
              { label: "Database Connections", value: "92 / 100 (92%)", status: "critical" },
              { label: "Observed Requests (24h)", value: "0", status: "neutral" },
            ],
          })}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("450 ms")).toBeInTheDocument();
    expect(screen.getByText("92 / 100 (92%)")).toBeInTheDocument();
    expect(screen.getByText("Observed Requests (24h)").closest("div")).toHaveTextContent("0");
  });
});
