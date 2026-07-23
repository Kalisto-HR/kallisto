import { api } from "../api/httpClient";
import { apiRoutes } from "../api/routes";
import { normalizeEnvelope } from "../mappers/responseMappers";
import type { BillingOrder, BillingProduct, BillingSummary, CreditLedgerEntry, Subscription } from "../../types/domain";

export async function fetchBillingSummary(): Promise<BillingSummary> {
  const result = await api.get<unknown>(apiRoutes.applicant.billing.summary());
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load billing summary");
  }

  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to load billing summary");
  }

  return normalizeBillingSummary(envelope.data);
}

export async function createBillingOrder(productId: string): Promise<BillingOrder> {
  const result = await api.post<unknown>(apiRoutes.applicant.billing.orders(), { product_id: productId });
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to create billing order");
  }

  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to create billing order");
  }

  return normalizeBillingOrder(envelope.data);
}

export async function completeDevelopmentPayment(orderId: string): Promise<BillingOrder> {
  const result = await api.post<unknown>(apiRoutes.applicant.billing.completeDevelopmentPayment(orderId));
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to confirm development payment");
  }

  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to confirm development payment");
  }

  return normalizeBillingOrder(envelope.data);
}

function normalizeBillingSummary(value: unknown): BillingSummary {
  const source = toRecord(value) ?? {};
  const products = toArray(source.products).map(normalizeBillingProduct);
  const orders = toArray(source.orders).map(normalizeBillingOrder);
  const creditHistory = toArray(source.credit_history ?? source.creditHistory).map(normalizeCreditLedgerEntry);

  return {
    creditBalance: toNumber(source.credit_balance ?? source.creditBalance),
    creditsPurchased: toNumber(source.credits_purchased ?? source.creditsPurchased),
    creditsUsed: toNumber(source.credits_used ?? source.creditsUsed),
    draftApplications: toNumber(source.draft_applications ?? source.draftApplications),
    submittedApplications: toNumber(source.submitted_applications ?? source.submittedApplications),
    products,
    orders,
    creditHistory,
    subscription: source.subscription ? normalizeSubscription(source.subscription) : null,
    hasActivePremium: toBool(source.has_active_premium ?? source.hasActivePremium),
  };
}

function normalizeBillingProduct(value: unknown): BillingProduct {
  const source = toRecord(value) ?? {};
  return {
    id: toString(source.id),
    productType: toString(source.product_type ?? source.productType),
    name: toString(source.name),
    description: toNullableString(source.description),
    credits: toNumber(source.credits),
    priceAmount: toNumber(source.price_amount ?? source.priceAmount),
    currency: toString(source.currency) || "UZS",
    interval: toNullableString(source.interval),
    intervalCount: toNullableNumber(source.interval_count ?? source.intervalCount),
    active: toBool(source.active),
  };
}

function normalizeBillingOrder(value: unknown): BillingOrder {
  const source = toRecord(value) ?? {};
  return {
    id: toString(source.id),
    userId: toString(source.user_id ?? source.userId),
    productId: toString(source.product_id ?? source.productId),
    orderNumber: toString(source.order_number ?? source.orderNumber),
    orderType: toString(source.order_type ?? source.orderType),
    quantity: toNumber(source.quantity),
    unitPrice: toNumber(source.unit_price ?? source.unitPrice),
    totalAmount: toNumber(source.total_amount ?? source.totalAmount),
    currency: toString(source.currency) || "UZS",
    status: toString(source.status),
    paymentProvider: toString(source.payment_provider ?? source.paymentProvider),
    paidAt: toNullableString(source.paid_at ?? source.paidAt),
    createdAt: toString(source.created_at ?? source.createdAt),
    updatedAt: toString(source.updated_at ?? source.updatedAt),
  };
}

function normalizeCreditLedgerEntry(value: unknown): CreditLedgerEntry {
  const source = toRecord(value) ?? {};
  return {
    id: toString(source.id),
    userId: toString(source.user_id ?? source.userId),
    transactionType: toString(source.transaction_type ?? source.transactionType),
    creditChange: toNumber(source.credit_change ?? source.creditChange),
    balanceAfter: toNumber(source.balance_after ?? source.balanceAfter),
    sourceType: toString(source.source_type ?? source.sourceType),
    sourceId: toNullableString(source.source_id ?? source.sourceId),
    applicationId: toNullableString(source.application_id ?? source.applicationId),
    description: toString(source.description),
    createdAt: toString(source.created_at ?? source.createdAt),
  };
}

function normalizeSubscription(value: unknown): Subscription {
  const source = toRecord(value) ?? {};
  return {
    id: toString(source.id),
    userId: toString(source.user_id ?? source.userId),
    planId: toString(source.plan_id ?? source.planId),
    status: toString(source.status),
    startsAt: toString(source.starts_at ?? source.startsAt),
    currentPeriodStart: toString(source.current_period_start ?? source.currentPeriodStart),
    currentPeriodEnd: toString(source.current_period_end ?? source.currentPeriodEnd),
    cancelAtPeriodEnd: toBool(source.cancel_at_period_end ?? source.cancelAtPeriodEnd),
    cancelledAt: toNullableString(source.cancelled_at ?? source.cancelledAt),
    paymentProvider: toString(source.payment_provider ?? source.paymentProvider),
    createdAt: toString(source.created_at ?? source.createdAt),
    updatedAt: toString(source.updated_at ?? source.updatedAt),
  };
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toBool(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}
