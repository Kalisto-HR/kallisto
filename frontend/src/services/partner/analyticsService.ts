import { api } from "../api/httpClient";
import { apiRoutes } from "../api/routes";
import type { PartnerAnalyticsContact, PartnerAnalyticsStage } from "../../types/domain";

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function toStage(value: unknown): PartnerAnalyticsStage {
  return value === "prospect" ? "prospect" : "suspect";
}

function normalizeContact(value: unknown): PartnerAnalyticsContact {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    userId: toString(source.user_id ?? source.userId),
    name: toString(source.name) || "Applicant",
    email: toString(source.email),
    country: toString(source.country) || "Unknown",
    stage: toStage(source.stage),
    lastActivityAt: toNullableString(source.last_activity_at ?? source.lastActivityAt),
  };
}

export async function fetchPartnerAnalyticsContacts(stage: PartnerAnalyticsStage): Promise<PartnerAnalyticsContact[]> {
  const result = await api.get<{ items?: unknown[] }>(apiRoutes.partner.analytics.contacts(stage));
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load analytics contacts");
  }

  const items = Array.isArray(result.data.items) ? result.data.items : [];
  return items.map(normalizeContact).filter((item) => item.email.trim().length > 0);
}

export function buildPartnerContactEmailList(items: PartnerAnalyticsContact[]): string {
  return items
    .map((item) => item.email.trim())
    .filter(Boolean)
    .join(", ");
}

export async function copyPartnerContactEmails(items: PartnerAnalyticsContact[]): Promise<number> {
  const emailList = buildPartnerContactEmailList(items);
  if (!emailList) {
    return 0;
  }

  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard is unavailable");
  }

  await navigator.clipboard.writeText(emailList);
  return items.filter((item) => item.email.trim()).length;
}

function escapeCsvCell(value: string): string {
  if (!/[",\r\n]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, "\"\"")}"`;
}

export function buildPartnerContactsCsv(items: PartnerAnalyticsContact[]): string {
  const headers = ["name", "email", "country", "stage", "last_activity_at"];
  const rows = items.map((item) => [
    item.name,
    item.email,
    item.country,
    item.stage,
    item.lastActivityAt ?? "",
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\r\n");
}

export function downloadPartnerContactsCsv(stage: PartnerAnalyticsStage, items: PartnerAnalyticsContact[]): void {
  const csv = buildPartnerContactsCsv(items);
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${stage}-contacts.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
