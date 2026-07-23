import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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
    expect(screen.queryByText(/example university/i)).not.toBeInTheDocument();
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

  it("navigates to the staff university detail route from the modal action", async () => {
    const user = userEvent.setup();

    vi.mocked(fetchStaffUniversities).mockResolvedValue({
      items: [
        {
          id: "uni-1",
          name: "Example University",
          name_en: "Example University",
          type: "public",
          location: "Tashkent, Uzbekistan",
          status: "active",
          admins: 2,
          applications: 120,
          acceptance_rate: "45%",
          joined_date: "2026-01-01",
          last_active: "Today",
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    });

    render(
      <MemoryRouter initialEntries={["/staff/universities"]}>
        <Routes>
          <Route path="/staff/universities" element={<StaffUniversitiesPage />} />
          <Route path="/staff/universities/:id" element={<div>University Detail Route</div>} />
          <Route path="/staff/universities/:id/edit" element={<div>University Edit Route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect((await screen.findAllByText("Example University")).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: /^view$/i })[0]);
    await user.click(screen.getByRole("button", { name: /view full details/i }));

    expect(await screen.findByText("University Detail Route")).toBeInTheDocument();
  });

  it("navigates to the staff university edit route from the modal action", async () => {
    const user = userEvent.setup();

    vi.mocked(fetchStaffUniversities).mockResolvedValue({
      items: [
        {
          id: "uni-1",
          name: "Example University",
          name_en: "Example University",
          type: "public",
          location: "Tashkent, Uzbekistan",
          status: "active",
          admins: 2,
          applications: 120,
          acceptance_rate: "45%",
          joined_date: "2026-01-01",
          last_active: "Today",
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
      totalPages: 1,
    });

    render(
      <MemoryRouter initialEntries={["/staff/universities"]}>
        <Routes>
          <Route path="/staff/universities" element={<StaffUniversitiesPage />} />
          <Route path="/staff/universities/:id" element={<div>University Detail Route</div>} />
          <Route path="/staff/universities/:id/edit" element={<div>University Edit Route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect((await screen.findAllByText("Example University")).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole("button", { name: /^view$/i })[0]);
    await user.click(screen.getByRole("button", { name: /request profile edit/i }));

    expect(await screen.findByText("University Edit Route")).toBeInTheDocument();
  });
});
