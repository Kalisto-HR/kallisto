import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { RoleProtectedRoute } from "../RoleProtectedRoute";

vi.mock("../../../hooks/useSession", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "../../../hooks/useSession";

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={["/student/dashboard"]}>
      <Routes>
        <Route element={<RoleProtectedRoute allowedRoles={["student"]} />}>
          <Route path="/student/dashboard" element={<div>Protected Student</div>} />
        </Route>
        <Route path="/auth/sign-in" element={<div>Sign In Screen</div>} />
        <Route path="/management/u-1/dashboard" element={<div>Management Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RoleProtectedRoute", () => {
  it("renders loading before session init", () => {
    vi.mocked(useSession).mockReturnValue({
      user: null,
      loading: true,
      initialized: false,
      isAuthenticated: false,
      refreshSession: vi.fn(),
      signOut: vi.fn(),
      setSuperuserMode: vi.fn(),
    });

    renderRoute();
    expect(screen.getByText("Loading session...")).toBeInTheDocument();
  });

  it("redirects unauthenticated user to sign in", () => {
    vi.mocked(useSession).mockReturnValue({
      user: null,
      loading: false,
      initialized: true,
      isAuthenticated: false,
      refreshSession: vi.fn(),
      signOut: vi.fn(),
      setSuperuserMode: vi.fn(),
    });

    renderRoute();
    expect(screen.getByText("Sign In Screen")).toBeInTheDocument();
  });

  it("allows authorized role", () => {
    vi.mocked(useSession).mockReturnValue({
      user: {
        id: "1",
        firstName: "A",
        lastName: "B",
        role: "student",
        area: "student",
      },
      loading: false,
      initialized: true,
      isAuthenticated: true,
      refreshSession: vi.fn(),
      signOut: vi.fn(),
      setSuperuserMode: vi.fn(),
    });

    renderRoute();
    expect(screen.getByText("Protected Student")).toBeInTheDocument();
  });

  it("redirects unauthorized role", () => {
    vi.mocked(useSession).mockReturnValue({
      user: {
        id: "2",
        firstName: "M",
        lastName: "N",
        role: "partner",
        area: "management",
        universityLinked: "u-1",
      },
      loading: false,
      initialized: true,
      isAuthenticated: true,
      refreshSession: vi.fn(),
      signOut: vi.fn(),
      setSuperuserMode: vi.fn(),
    });

    renderRoute();
    expect(screen.getByText("Management Home")).toBeInTheDocument();
  });
});
