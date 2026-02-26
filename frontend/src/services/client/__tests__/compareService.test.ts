import { describe, expect, it, vi } from "vitest";

vi.mock("../../api/httpClient", () => ({
  clientApi: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import { clientApi } from "../../api/httpClient";
import { addCompareItem, fetchCompareList, removeCompareItem } from "../compareService";

describe("compareService", () => {
  it("normalizes compare envelope response", async () => {
    vi.mocked(clientApi.get).mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        success: true,
        data: [
          {
            id: "uni-1",
            name: "Example University",
            country: "Canada",
            city: "Toronto",
            ranking: 10,
            application_fee: 50,
          },
        ],
      },
      error: null,
    });

    const items = await fetchCompareList();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("uni-1");
    expect(items[0].country).toBe("Canada");
  });

  it("posts add compare endpoint", async () => {
    vi.mocked(clientApi.post).mockResolvedValue({
      ok: true,
      status: 200,
      data: { msg: "ok" },
      error: null,
    });

    await addCompareItem("uni-1");
    expect(clientApi.post).toHaveBeenCalledWith("/v1.0/compare/uni-1");
  });

  it("deletes compare endpoint", async () => {
    vi.mocked(clientApi.delete).mockResolvedValue({
      ok: true,
      status: 200,
      data: { msg: "ok" },
      error: null,
    });

    await removeCompareItem("uni-1");
    expect(clientApi.delete).toHaveBeenCalledWith("/v1.0/compare/uni-1");
  });
});
