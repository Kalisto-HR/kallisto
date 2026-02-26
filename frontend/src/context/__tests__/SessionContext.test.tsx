import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { SessionProvider, useSessionContext } from "../SessionContext";

vi.mock("../../services/client/authService", () => ({
  getStudentSessionUser: vi.fn(),
  signOutStudent: vi.fn(),
}));

vi.mock("../../services/admin/authService", () => ({
  getManagementSessionUser: vi.fn(),
  signOutManagement: vi.fn(),
}));

import {
  getStudentSessionUser,
  signOutStudent,
} from "../../services/client/authService";
import {
  getManagementSessionUser,
  signOutManagement,
} from "../../services/admin/authService";

function wrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

describe("SessionContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("loads student session first when both services are available", async () => {
    vi.mocked(getStudentSessionUser).mockResolvedValue({
      id: "student-1",
      firstName: "Stu",
      lastName: "Dent",
      role: "student",
      area: "student",
    });
    vi.mocked(getManagementSessionUser).mockResolvedValue({
      id: "staff-1",
      firstName: "Admin",
      lastName: "User",
      role: "staff",
      area: "management",
    });

    const { result } = renderHook(() => useSessionContext(), { wrapper });

    await act(async () => {
      await result.current.refreshSession();
    });

    await waitFor(() => {
      expect(result.current.user?.role).toBe("student");
    });
    expect(getManagementSessionUser).not.toHaveBeenCalled();
  });

  it("keeps management roles in management area and signs out from both services", async () => {
    vi.mocked(getStudentSessionUser).mockResolvedValue(null);
    vi.mocked(getManagementSessionUser).mockResolvedValue({
      id: "staff-1",
      firstName: "Admin",
      lastName: "User",
      role: "staff",
      area: "management",
      universityLinked: null,
    });

    const { result } = renderHook(() => useSessionContext(), { wrapper });

    await act(async () => {
      await result.current.refreshSession();
    });

    await waitFor(() => {
      expect(result.current.user?.role).toBe("staff");
      expect(result.current.user?.area).toBe("management");
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(signOutStudent).toHaveBeenCalledTimes(1);
    expect(signOutManagement).toHaveBeenCalledTimes(1);
    expect(result.current.user).toBeNull();
  });
});
