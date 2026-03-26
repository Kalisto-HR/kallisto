import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SuperuserOverview from "./SuperuserOverview";
import { routes } from "../../routes/routeConfig";

describe("SuperuserOverview", () => {
  it("links recent activity to the staff audit logs page", () => {
    render(
      <MemoryRouter>
        <SuperuserOverview
          data={{
            stats: {
              total_universities: 3,
              management_accounts: 2,
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
});
