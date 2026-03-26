import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SuperuserOverviewPage } from "./SuperuserOverviewPage";
import { fetchSuperuserOverview } from "../../services/admin/superuserService";

vi.mock("../../services/admin/superuserService", () => ({
  fetchSuperuserOverview: vi.fn(),
}));

describe("SuperuserOverviewPage", () => {
  it("renders an error state instead of fake overview metrics when the fetch fails", async () => {
    vi.mocked(fetchSuperuserOverview).mockRejectedValue(new Error("Failed to load staff overview"));

    render(
      <MemoryRouter>
        <SuperuserOverviewPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Failed to load staff overview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText("847")).not.toBeInTheDocument();
    expect(screen.queryByText(/shanghai tech university/i)).not.toBeInTheDocument();
  });
});
