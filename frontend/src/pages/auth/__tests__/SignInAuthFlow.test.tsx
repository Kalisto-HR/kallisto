import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInManagementPage } from "../SignInManagementPage";
import { SignInPortalPage } from "../SignInPortalPage";
import { SignInStudentPage } from "../SignInStudentPage";

vi.mock("../../../hooks/useSession", () => ({
  useSession: vi.fn(),
}));

vi.mock("../../../services/client/authService", () => ({
  signInStudent: vi.fn(),
}));

vi.mock("../../../services/admin/authService", () => ({
  signInManagement: vi.fn(),
  getManagementSessionUser: vi.fn(),
}));

import { useSession } from "../../../hooks/useSession";
import { getManagementSessionUser, signInManagement } from "../../../services/admin/authService";
import { signInStudent } from "../../../services/client/authService";

function mockSession(refreshSession: ReturnType<typeof vi.fn>) {
  vi.mocked(useSession).mockReturnValue({
    user: null,
    loading: false,
    initialized: true,
    isAuthenticated: false,
    refreshSession,
    signOut: vi.fn(),
    setSuperuserMode: vi.fn(),
  });
}

describe("Auth sign in flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("routes portal cards to student and management forms", async () => {
    render(
      <MemoryRouter initialEntries={["/auth/sign-in"]}>
        <Routes>
          <Route path="/auth/sign-in" element={<SignInPortalPage />} />
          <Route path="/auth/sign-in/student" element={<div>student-form</div>} />
          <Route path="/auth/sign-in/management" element={<div>management-form</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue as Student" }));
    await waitFor(() => expect(screen.getByText("student-form")).toBeInTheDocument());

    render(
      <MemoryRouter initialEntries={["/auth/sign-in"]}>
        <Routes>
          <Route path="/auth/sign-in" element={<SignInPortalPage />} />
          <Route path="/auth/sign-in/management" element={<div>management-form</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue as Manager" }));
    await waitFor(() => expect(screen.getByText("management-form")).toBeInTheDocument());
  });

  it("submits student sign in and refreshes session", async () => {
    const refreshSession = vi.fn().mockResolvedValue(undefined);
    mockSession(refreshSession);
    vi.mocked(signInStudent).mockResolvedValue({ ok: true });

    render(
      <MemoryRouter>
        <SignInStudentPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "student@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in as Student" }));

    await waitFor(() => {
      expect(signInStudent).toHaveBeenCalledWith("student@example.com", "password123");
      expect(refreshSession).toHaveBeenCalled();
    });
  });

  it("supports superuser intent on management sign in", async () => {
    const refreshSession = vi.fn().mockResolvedValue(undefined);
    mockSession(refreshSession);
    vi.mocked(signInManagement).mockResolvedValue({ ok: true });
    vi.mocked(getManagementSessionUser).mockResolvedValue({
      id: "staff-1",
      firstName: "Admin",
      lastName: "User",
      role: "staff",
      area: "management",
      universityLinked: null,
    });

    render(
      <MemoryRouter initialEntries={["/auth/sign-in/management?intent=superuser"]}>
        <Routes>
          <Route path="/auth/sign-in/management" element={<SignInManagementPage />} />
          <Route path="/management/global/overview" element={<div>superuser-overview</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "staff@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in as Superuser" }));

    await waitFor(() => {
      expect(signInManagement).toHaveBeenCalledWith("staff@example.com", "password123");
      expect(refreshSession).toHaveBeenCalled();
    });
    expect(screen.getByText("superuser-overview")).toBeInTheDocument();
  });
});
