import { apiRoutes } from "../api/routes";
import { api } from "../api/httpClient";
import { normalizePagination } from "../mappers/responseMappers";
import type { Pagination } from "../../types/domain";

export interface StaffStudentItem {
  student_id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  region_code?: string;
  interface_language: string;
  profile_completion_percent: number;
  applications_count: number;
  submitted_applications_count: number;
  payment_status: string;
  account_status: string;
  registration_date: string;
  last_activity?: string;
}

export interface StaffStudentsQuery {
  q?: string;
  region?: string;
  status?: string;
  completion?: string;
  payment_status?: string;
  registered_from?: string;
  registered_to?: string;
  page?: number;
  limit?: number;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeStudent(value: unknown): StaffStudentItem {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    student_id: toString(source.student_id),
    full_name: toString(source.full_name) || "Unnamed student",
    email: toString(source.email),
    phone_number: toString(source.phone_number) || undefined,
    region_code: toString(source.region_code) || undefined,
    interface_language: toString(source.interface_language) || "en",
    profile_completion_percent: toNumber(source.profile_completion_percent),
    applications_count: toNumber(source.applications_count),
    submitted_applications_count: toNumber(source.submitted_applications_count),
    payment_status: toString(source.payment_status) || "unpaid",
    account_status: toString(source.account_status) || "active",
    registration_date: toString(source.registration_date),
    last_activity: toString(source.last_activity) || undefined,
  };
}

export async function fetchStaffStudents(params: StaffStudentsQuery): Promise<Pagination<StaffStudentItem>> {
  const result = await api.get<unknown>(apiRoutes.staff.students.list({
    q: params.q,
    region: params.region,
    status: params.status,
    completion: params.completion,
    payment_status: params.payment_status,
    registered_from: params.registered_from,
    registered_to: params.registered_to,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  }));

  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load students");
  }

  const page = normalizePagination<unknown>(result.data);
  return {
    ...page,
    items: page.items.map(normalizeStudent),
  };
}
