import { act, renderHook } from "@testing-library/react";
import { useApplicationFlowData } from "./useApplicationFlowData";
import {
  createApplicantApplication,
  submitApplicantApplication,
  updateApplicantApplication,
} from "../services/applicant/applicationsService";

vi.mock("../services/applicant/applicationsService", () => ({
  createApplicantApplication: vi.fn(),
  submitApplicantApplication: vi.fn(),
  updateApplicantApplication: vi.fn(),
}));

describe("useApplicationFlowData", () => {
  beforeEach(() => {
    vi.mocked(createApplicantApplication).mockResolvedValue(undefined);
    vi.mocked(updateApplicantApplication).mockResolvedValue(undefined);
    vi.mocked(submitApplicantApplication).mockReset();
  });

  it("surfaces submit failures instead of advancing to success", async () => {
    vi.mocked(submitApplicantApplication).mockRejectedValue(new Error("failed to submit application to staff service"));

    const { result } = renderHook(() => useApplicationFlowData("22222222-2222-2222-2222-222222222222"));

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.step).toBe("draft");
    expect(result.current.error).toBe("failed to submit application to staff service");
  });
});
