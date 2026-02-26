import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useApplicationFlowData } from "../useApplicationFlowData";

vi.mock("../../services/client/applicationsService", () => ({
  createStudentApplication: vi.fn(),
  updateStudentApplication: vi.fn(),
  submitStudentApplication: vi.fn(),
}));

import {
  createStudentApplication,
  submitStudentApplication,
  updateStudentApplication,
} from "../../services/client/applicationsService";

describe("useApplicationFlowData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves draft then moves to review", async () => {
    vi.mocked(createStudentApplication).mockResolvedValue(undefined);
    vi.mocked(updateStudentApplication).mockResolvedValue(undefined);

    const { result } = renderHook(() => useApplicationFlowData("u-1"));

    act(() => {
      result.current.setFormData({ essay: "content" });
    });

    expect(result.current.canReview).toBe(true);

    await act(async () => {
      await result.current.saveDraft();
    });

    await waitFor(() => {
      expect(result.current.step).toBe("review");
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    expect(createStudentApplication).toHaveBeenCalledWith({
      universityId: "u-1",
      cycle: "2026-Fall",
      data: { essay: "content" },
    });
    expect(updateStudentApplication).toHaveBeenCalledWith("u-1", "2026-Fall", {
      essay: "content",
    });
  });

  it("surfaces submit failures and keeps current step", async () => {
    vi.mocked(submitStudentApplication).mockRejectedValue(new Error("submit failed"));

    const { result } = renderHook(() => useApplicationFlowData("u-2"));

    await act(async () => {
      await result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.step).toBe("draft");
      expect(result.current.error).toBe("submit failed");
      expect(result.current.loading).toBe(false);
    });
  });
});
