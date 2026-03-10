import type { BasketCheckoutPreview, BasketPlan, StudentBasketState } from "../../types/domain";
import { dispatchBasketUpdatedEvent } from "../basketEvents";
import { clientApi } from "../api/httpClient";
import {
  normalizeBasketCheckoutPreview,
  normalizeBasketPlan,
  normalizeEnvelope,
  normalizeStudentBasketState,
} from "../mappers/responseMappers";

interface BasketCheckoutPreviewRequest {
  planId: string;
  universityIds: string[];
}

export async function fetchBasketPlans(): Promise<BasketPlan[]> {
  const result = await clientApi.get<unknown>("/v1.0/basket/plans");
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load basket plans");
  }

  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to load basket plans");
  }

  if (!Array.isArray(envelope.data)) {
    return [];
  }

  return envelope.data.map(normalizeBasketPlan).filter((plan) => plan.id.length > 0);
}

export async function fetchBasketState(): Promise<StudentBasketState> {
  const result = await clientApi.get<unknown>("/v1.0/basket");
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load basket");
  }

  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to load basket");
  }

  return normalizeStudentBasketState(envelope.data);
}

export async function addBasketItem(universityId: string): Promise<void> {
  const result = await clientApi.post(`/v1.0/basket/${universityId}`);
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to add basket item");
  }
  dispatchBasketUpdatedEvent();
}

export async function removeBasketItem(universityId: string): Promise<void> {
  const result = await clientApi.delete(`/v1.0/basket/${universityId}`);
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to remove basket item");
  }
  dispatchBasketUpdatedEvent();
}

export async function clearBasket(): Promise<void> {
  const result = await clientApi.delete("/v1.0/basket");
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to clear basket");
  }
  dispatchBasketUpdatedEvent();
}

export async function setBasketPlan(planId: string | null): Promise<void> {
  const result = await clientApi.put("/v1.0/basket/plan", {
    plan_id: planId,
  });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to set basket plan");
  }
  dispatchBasketUpdatedEvent();
}

export async function fetchBasketCheckoutPreview(payload: BasketCheckoutPreviewRequest): Promise<BasketCheckoutPreview> {
  const result = await clientApi.post<unknown>("/v1.0/basket/checkout-preview", {
    plan_id: payload.planId,
    university_ids: payload.universityIds,
  });
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to preview checkout");
  }

  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to preview checkout");
  }

  return normalizeBasketCheckoutPreview(envelope.data);
}

