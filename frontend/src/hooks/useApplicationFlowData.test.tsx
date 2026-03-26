import { act, renderHook } from "@testing-library/react";
import { useApplicationFlowData } from "./useApplicationFlowData";
import {
  createStudentApplication,
  submitStudentApplication,
  updateStudentApplication,
} from "../services/client/applicationsService";

vi.mock("../services/client/applicationsService", () => ({
  createStudentApplication: vi.fn(),
  submitStudentApplication: vi.fn(),
  updateStudentApplication: vi.fn(),
}));

describe("useApplicationFlowData", () => {
  beforeEach(() => {
    vi.mocked(createStudentApplication).mockResolvedValue(undefined);
    vi.mocked(updateStudentApplication).mockResolvedValue(undefined);
    vi.mocked(submitStudentApplication).mockReset();
  });

  it("surfaces submit failures instead of advancing to success", async () => {
    vi.mocked(submitStudentApplication).mockRejectedValue(new Error("failed to submit application to admin service"));

    const { result } = renderHook(() => useApplicationFlowData("22222222-2222-2222-2222-222222222222"));

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.step).toBe("draft");
    expect(result.current.error).toBe("failed to submit application to admin service");
  });
});
