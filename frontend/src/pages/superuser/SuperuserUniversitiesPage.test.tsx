import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SuperuserUniversitiesPage } from "./SuperuserUniversitiesPage";
import { fetchSuperuserUniversities } from "../../services/admin/superuserService";

vi.mock("../../services/admin/superuserService", () => ({
  fetchSuperuserUniversities: vi.fn(),
}));

describe("SuperuserUniversitiesPage", () => {
  it("renders an error state instead of hardcoded universities when the fetch fails", async () => {
    vi.mocked(fetchSuperuserUniversities).mockRejectedValue(new Error("Failed to load universities"));

    render(
      <MemoryRouter>
        <SuperuserUniversitiesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Failed to load universities")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/tsinghua university/i)).not.toBeInTheDocument();
  });

  it("renders an empty state when the live fetch succeeds with no universities", async () => {
    vi.mocked(fetchSuperuserUniversities).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      limit: 100,
      totalPages: 0,
    });

    render(
      <MemoryRouter>
        <SuperuserUniversitiesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("No universities available")).toBeInTheDocument();
    expect(screen.getByText(/live university records will appear here/i)).toBeInTheDocument();
  });
});
