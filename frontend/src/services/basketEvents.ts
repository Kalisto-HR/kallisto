export const BASKET_UPDATED_EVENT = "kallisto:basket-updated";

export function dispatchBasketUpdatedEvent(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(BASKET_UPDATED_EVENT, {
      detail: { at: Date.now() },
    }),
  );
}

