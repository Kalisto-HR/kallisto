import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StaffOverview from "./StaffOverview";
import { routes } from "../../routes/routeConfig";

describe("StaffOverview", () => {
  it("links recent activity to the staff audit logs page", () => {
    render(
      <MemoryRouter>
        <StaffOverview
          data={{
            stats: {
              total_universities: 3,
              portal_accounts: 2,
              total_applications: 8,
            },
            recent_activity: [],
            system_health: [],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /view audit log/i })).toHaveAttribute("href", routes.staff.auditLogs);
  });

  it("renders non-good system health statuses distinctly", () => {
    render(
      <MemoryRouter>
        <StaffOverview
          data={{
            stats: {
              total_universities: 3,
              portal_accounts: 2,
              total_applications: 8,
            },
            recent_activity: [],
            system_health: [
              { label: "Observed Response Time (24h)", value: "450 ms", status: "warn" },
              { label: "Database Connections", value: "92 / 100 (92%)", status: "critical" },
              { label: "Observed Requests (24h)", value: "0", status: "neutral" },
            ],
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("450 ms")).toBeInTheDocument();
    expect(screen.getByText("92 / 100 (92%)")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
