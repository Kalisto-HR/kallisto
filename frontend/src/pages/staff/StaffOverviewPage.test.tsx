import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StaffOverviewPage } from "./StaffOverviewPage";
import { fetchStaffOverview } from "../../services/staff/overviewService";

vi.mock("../../services/staff/overviewService", () => ({
  fetchStaffOverview: vi.fn(),
}));

describe("StaffOverviewPage", () => {
  it("renders an error state instead of fake overview metrics when the fetch fails", async () => {
    vi.mocked(fetchStaffOverview).mockRejectedValue(new Error("Failed to load staff overview"));

    render(
      <MemoryRouter>
        <StaffOverviewPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Failed to load staff overview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText("847")).not.toBeInTheDocument();
    expect(screen.queryByText(/shanghai tech university/i)).not.toBeInTheDocument();
  });
});
