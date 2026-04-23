import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePartnerDashboardData } from "./usePartnerDashboardData";
import { fetchPartnerDashboard } from "../services/partner/dashboardService";
import type { PartnerDashboardPayload } from "../types/domain";

vi.mock("../services/partner/dashboardService", () => ({
  fetchPartnerDashboard: vi.fn(),
}));

function dashboard(overrides?: Partial<PartnerDashboardPayload>): PartnerDashboardPayload {
  return {
    newApplications: 0,
    totalApplicants: 0,
    avgSAT: 0,
    avgIELTS: 0,
    maleCount: 0,
    femaleCount: 0,
    nonBinaryCount: 0,
    preferNotToSayCount: 0,
    suspectsCount: 0,
    prospectsCount: 0,
    studentOriginStats: [],
    recentApplications: [],
    notifications: [],
    ...overrides,
  };
}

describe("usePartnerDashboardData", () => {
  let intervalHandler: (() => void) | null;
  let originalSetInterval: typeof window.setInterval;
  let originalClearInterval: typeof window.clearInterval;

  beforeEach(() => {
    intervalHandler = null;
    originalSetInterval = window.setInterval;
    originalClearInterval = window.clearInterval;
    vi.mocked(fetchPartnerDashboard).mockReset();
    window.setInterval = ((handler: TimerHandler) => {
      if (typeof handler === "function") {
        intervalHandler = handler as () => void;
      }
      return 1;
    }) as unknown as typeof window.setInterval;
    window.clearInterval = (() => undefined) as typeof window.clearInterval;
  });

  afterEach(() => {
    window.setInterval = originalSetInterval;
    window.clearInterval = originalClearInterval;
    vi.restoreAllMocks();
  });

  it("polls without clearing current dashboard data", async () => {
    const firstPayload = dashboard({ suspectsCount: 2 });
    const secondPayload = dashboard({ suspectsCount: 3 });
    let resolveSecond: (value: PartnerDashboardPayload) => void = () => undefined;

    vi.mocked(fetchPartnerDashboard).mockResolvedValue(firstPayload);

    const { result } = renderHook(() => usePartnerDashboardData("uni-1"));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.data).toEqual(firstPayload);
    expect(result.current.loading).toBe(false);

    const callsBeforePoll = vi.mocked(fetchPartnerDashboard).mock.calls.length;
    vi.mocked(fetchPartnerDashboard).mockImplementationOnce(() => new Promise((resolve) => {
      resolveSecond = resolve;
    }));

    act(() => {
      intervalHandler?.();
    });

    await waitFor(() => expect(fetchPartnerDashboard).toHaveBeenCalledTimes(callsBeforePoll + 1));
    expect(result.current.data).toEqual(firstPayload);
    expect(result.current.loading).toBe(false);

    await act(async () => {
      resolveSecond(secondPayload);
    });

    await waitFor(() => expect(result.current.data).toEqual(secondPayload));
  });
});
