import { apiRoutes } from "../api/routes";
import { api } from "../api/httpClient";
import { normalizePagination, normalizeUniversity } from "../mappers/responseMappers";
import { buildUniversityProfileUpdateBody, type UniversityProfileUpdatePayload } from "../universityProfileUpdate";
import type { Pagination, University } from "../../types/domain";

export interface StaffUniversityItem {
  id: string;
  name: string;
  name_en: string;
  type: "public" | "private" | "international";
  location: string;
  status: "active" | "inactive" | "pending" | "suspended";
  admins: number;
  applications: number;
  acceptance_rate: string;
  joined_date: string;
  last_active: string;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function normalizeUniversityType(value: unknown): StaffUniversityItem["type"] {
  const normalized = toString(value).trim().toLowerCase();
  if (normalized === "private" || normalized === "international") {
    return normalized;
  }
  return "public";
}

function normalizeUniversityStatus(value: unknown): StaffUniversityItem["status"] {
  const normalized = toString(value).trim().toLowerCase();
  if (normalized === "inactive" || normalized === "pending" || normalized === "suspended") {
    return normalized;
  }
  return "active";
}

function buildUniversityLocation(source: Record<string, unknown>): string {
  const explicit = toString(source.location).trim();
  if (explicit) {
    return explicit;
  }

  const parts = [
    toString(source.city).trim(),
    toString(source.province).trim(),
    toString(source.country).trim(),
  ].filter(Boolean);

  return parts.join(", ");
}

function buildAcceptanceRate(source: Record<string, unknown>): string {
  const explicit = toString(source.acceptance_rate).trim();
  if (explicit) {
    return explicit;
  }

  const numeric = toNullableNumber(source.acceptance_rate ?? source.acceptanceRate);
  if (numeric !== null) {
    return `${numeric}%`;
  }

  return "N/A";
}

export function normalizeStaffUniversityItem(value: unknown): StaffUniversityItem {
  const source = (value ?? {}) as Record<string, unknown>;
  const metadata = toRecord(source.metadata);
  const universityProfile = toRecord(source.university_profile ?? source.universityProfile);

  const fallbackType =
    metadata?.type ??
    metadata?.university_type ??
    universityProfile?.type ??
    universityProfile?.universityType;

  const fallbackStatus =
    metadata?.status ??
    universityProfile?.status ??
    universityProfile?.publicationStatus;

  const fallbackNameEn =
    metadata?.name_en ??
    metadata?.nameEn ??
    universityProfile?.name_en ??
    universityProfile?.nameEn;

  const fallbackApplications =
    metadata?.applications ??
    metadata?.application_count ??
    universityProfile?.applications ??
    universityProfile?.applicationCount;

  const fallbackAdmins =
    metadata?.admins ??
    metadata?.admin_count ??
    universityProfile?.admins ??
    universityProfile?.adminCount;

  const joinedDate = toString(source.joined_date).trim() || toString(source.created_at ?? source.createdAt).trim();

  return {
    id: toString(source.id),
    name: toString(source.name),
    name_en: toString(source.name_en ?? fallbackNameEn).trim() || toString(source.name),
    type: normalizeUniversityType(source.type ?? fallbackType),
    location: buildUniversityLocation(source),
    status: normalizeUniversityStatus(source.status ?? fallbackStatus),
    admins: toNumber(source.admins ?? fallbackAdmins),
    applications: toNumber(source.applications ?? fallbackApplications),
    acceptance_rate: buildAcceptanceRate(source),
    joined_date: joinedDate,
    last_active: toString(source.last_active ?? source.lastActive).trim() || "Unknown",
  };
}

export async function fetchStaffUniversities(params?: {
  q?: string;
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}): Promise<Pagination<StaffUniversityItem>> {
  const result = await api.get<unknown>(apiRoutes.staff.universities.list({
    q: params?.q,
    status: params?.status,
    type: params?.type,
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
  }));
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load global universities");
  }

  const page = normalizePagination<unknown>(result.data);
  return {
    ...page,
    items: page.items.map(normalizeStaffUniversityItem),
  };
}

export async function fetchStaffUniversityById(id: string): Promise<University> {
  const result = await api.get<unknown>(apiRoutes.staff.universities.detail(id));
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load university");
  }
  return normalizeUniversity(result.data);
}

export async function updateStaffUniversity(id: string, payload: UniversityProfileUpdatePayload): Promise<void> {
  const result = await api.put<{ msg: string }>(
    apiRoutes.staff.universities.detail(id),
    buildUniversityProfileUpdateBody(payload),
  );
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to update university");
  }
}
