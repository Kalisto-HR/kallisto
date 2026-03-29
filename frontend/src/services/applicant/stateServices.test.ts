import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/httpClient";
import { dispatchBasketUpdatedEvent } from "../basketEvents";
import {
  addBasketItem,
  clearBasket,
  fetchBasketCheckoutPreview,
  fetchBasketPlans,
  fetchBasketState,
  removeBasketItem,
  setBasketPlan,
} from "./basketService";
import {
  addCompareItem,
  clearCompareList,
  COMPARE_LIMIT_MESSAGE,
  fetchCompareList,
  removeCompareItem,
} from "./compareService";
import { addFavorite, fetchFavorites, removeFavorite } from "./favoritesService";

vi.mock("../api/httpClient", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../basketEvents", () => ({
  dispatchBasketUpdatedEvent: vi.fn(),
}));

describe("applicant basket, compare, and favorites services", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.post).mockReset();
    vi.mocked(api.put).mockReset();
    vi.mocked(api.delete).mockReset();
    vi.mocked(dispatchBasketUpdatedEvent).mockReset();
  });

  it("loads and normalizes basket plans, basket state, and checkout previews", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: {
          success: true,
          data: [{ id: "starter", name: "Starter", capacity: 3, price: 120, per_app: 40 }],
          message: "",
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: {
          success: true,
          data: {
            items: [{ id: "uni-1", name: "Example University" }],
            selected_plan_id: "starter",
            recommended_plan_id: "starter",
            total_universities: 1,
            max_plan_capacity: 3,
          },
          message: "",
        },
      });
    vi.mocked(api.post).mockResolvedValueOnce({
      ok: true,
      status: 200,
      error: null,
      data: {
        success: true,
        data: {
          plan: { id: "starter", name: "Starter", capacity: 3, price: 120 },
          universities: [{ id: "uni-1", name: "Example University" }],
          application_count: 1,
          estimated_total: 120,
          status: "preview",
          ready_for_payment_api: false,
          warnings: ["not live"],
        },
        message: "",
      },
    });

    await expect(fetchBasketPlans()).resolves.toEqual([
      expect.objectContaining({ id: "starter", name: "Starter", capacity: 3, price: 120 }),
    ]);
    await expect(fetchBasketState()).resolves.toEqual(
      expect.objectContaining({ selectedPlanId: "starter", totalUniversities: 1, maxPlanCapacity: 3 }),
    );
    await expect(fetchBasketCheckoutPreview({ planId: "starter", universityIds: ["uni-1"] })).resolves.toEqual(
      expect.objectContaining({ applicationCount: 1, estimatedTotal: 120, readyForPaymentApi: false }),
    );
  });

  it("dispatches basket updates for all basket mutations", async () => {
    vi.mocked(api.post).mockResolvedValue({ ok: true, status: 200, error: null, data: { msg: "ok" } });
    vi.mocked(api.put).mockResolvedValue({ ok: true, status: 200, error: null, data: { msg: "ok" } });
    vi.mocked(api.delete).mockResolvedValue({ ok: true, status: 200, error: null, data: { msg: "ok" } });

    await addBasketItem("uni-1");
    await removeBasketItem("uni-1");
    await clearBasket();
    await setBasketPlan("starter");

    expect(vi.mocked(api.post)).toHaveBeenCalledWith("/v1.0/applicant/basket/uni-1");
    expect(vi.mocked(api.delete)).toHaveBeenNthCalledWith(1, "/v1.0/applicant/basket/uni-1");
    expect(vi.mocked(api.delete)).toHaveBeenNthCalledWith(2, "/v1.0/applicant/basket");
    expect(vi.mocked(api.put)).toHaveBeenCalledWith("/v1.0/applicant/basket/plan", { plan_id: "starter" });
    expect(vi.mocked(dispatchBasketUpdatedEvent)).toHaveBeenCalledTimes(4);
  });

  it("normalizes compare-limit failures and favorite payload variants", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: {
          success: true,
          data: [{ id: "uni-1", name: "Example University" }],
          message: "",
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        error: null,
        data: ["uni-1", { id: "uni-2", name: "Second University" }],
      });
    vi.mocked(api.post)
      .mockResolvedValueOnce({ ok: false, status: 400, error: "Compare supports up to 4 universities", data: null })
      .mockResolvedValueOnce({ ok: true, status: 200, error: null, data: { msg: "ok" } });
    vi.mocked(api.delete).mockResolvedValue({ ok: true, status: 200, error: null, data: { msg: "ok" } });

    await expect(fetchCompareList()).resolves.toEqual([expect.objectContaining({ id: "uni-1" })]);
    await expect(addCompareItem("uni-5")).rejects.toThrow(COMPARE_LIMIT_MESSAGE);
    await removeCompareItem("uni-1");
    await clearCompareList();

    await expect(fetchFavorites()).resolves.toEqual([
      expect.objectContaining({ id: "uni-1", name: "uni-1" }),
      expect.objectContaining({ id: "uni-2", name: "Second University" }),
    ]);
    await addFavorite("uni-1");
    await removeFavorite("uni-1");

    expect(vi.mocked(api.delete)).toHaveBeenNthCalledWith(1, "/v1.0/applicant/compare/uni-1");
    expect(vi.mocked(api.delete)).toHaveBeenNthCalledWith(2, "/v1.0/applicant/compare");
    expect(vi.mocked(api.post)).toHaveBeenNthCalledWith(2, "/v1.0/applicant/universities/uni-1/favorite");
    expect(vi.mocked(api.delete)).toHaveBeenNthCalledWith(3, "/v1.0/applicant/universities/uni-1/favorite");
  });
});
