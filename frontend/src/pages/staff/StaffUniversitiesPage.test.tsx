import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { StaffUniversitiesPage } from "./StaffUniversitiesPage";
import { fetchStaffUniversities } from "../../services/staff/universitiesService";

vi.mock("../../services/staff/universitiesService", () => ({
  fetchStaffUniversities: vi.fn(),
}));

describe("StaffUniversitiesPage", () => {
  it("renders an error state instead of hardcoded universities when the fetch fails", async () => {
    vi.mocked(fetchStaffUniversities).mockRejectedValue(new Error("Failed to load universities"));

    render(
      <MemoryRouter>
        <StaffUniversitiesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Failed to load universities")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/tsinghua university/i)).not.toBeInTheDocument();
  });

  it("renders an empty state when the live fetch succeeds with no universities", async () => {
    vi.mocked(fetchStaffUniversities).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 100,
      totalPages: 0,
    });

    render(
      <MemoryRouter>
        <StaffUniversitiesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("No universities available")).toBeInTheDocument();
    expect(screen.getByText(/live university records will appear here/i)).toBeInTheDocument();
  });
});
