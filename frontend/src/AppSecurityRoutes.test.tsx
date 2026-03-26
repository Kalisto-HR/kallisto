import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

vi.mock("./hooks/useSession", () => ({
  useSession: () => ({
    user: {
      id: "staff-1",
      firstName: "Staff",
      lastName: "User",
      role: "staff",
      permissions: ["staff.settings"],
    },
    loading: false,
    initialized: true,
    isAuthenticated: true,
    refreshSession: vi.fn(),
    signOut: vi.fn(),
  }),
}));

describe("security route cleanup", () => {
  it("renders not found for the removed staff drafts route", () => {
    render(
      <MemoryRouter initialEntries={["/staff/drafts"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText(/page not found/i)).toBeInTheDocument();
    expect(screen.queryByText(/drafts/i)).not.toBeInTheDocument();
  });
});
