import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SessionContextValue } from "../types/session";
import { useSession } from "./useSession";

let mockedContextValue: SessionContextValue;

vi.mock("../context/SessionContext", () => ({
  useSessionContext: () => mockedContextValue,
}));

function createSessionValue(overrides?: Partial<SessionContextValue>): SessionContextValue {
  return {
    user: null,
    loading: false,
    initialized: false,
    signOut: vi.fn(),
    refreshSession: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("useSession", () => {
  it("refreshes the session when context is idle but not initialized", async () => {
    const value = createSessionValue();
    mockedContextValue = value;

    const { result } = renderHook(() => useSession());

    await waitFor(() => expect(value.refreshSession).toHaveBeenCalledTimes(1));
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("exposes authenticated state when a user is present", () => {
    mockedContextValue = createSessionValue({
      initialized: true,
      user: {
        id: "user-1",
        email: "vida@example.com",
        firstName: "Vida",
        lastName: "Test",
        role: "applicant",
        permissions: [],
        universityLinked: null,
      },
    });

    const { result } = renderHook(() => useSession());
    expect(result.current.isAuthenticated).toBe(true);
  });
});
