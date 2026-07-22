import { apiRoutes } from "../api/routes";
import { api } from "../api/httpClient";

export interface StaffOverviewPayload {
  stats: {
    total_students: number;
    new_students_last_7_days: number;
    total_universities: number;
    active_programs: number;
    applications_started: number;
    applications_submitted: number;
    applications_under_review: number;
    accepted_applications: number;
    rejected_applications: number;
    pending_document_reviews: number;
    completed_student_payments: number;
    total_platform_revenue: number;
    portal_accounts: number;
    total_applications: number;
  };
  application_funnel: Array<{ stage: string; count: number }>;
  registrations_by_date: Array<{ label: string; count: number }>;
  applications_by_status: Array<{ status: string; count: number }>;
  popular_universities: Array<{ label: string; count: number }>;
  popular_programs: Array<{ label: string; count: number }>;
  students_by_region: Array<{ label: string; count: number }>;
  application_conversion: Array<{ label: string; count: number }>;
  recent_activity: Array<{
    id: string;
    type: string;
    description: string;
    user: string;
    timestamp: string;
    status: string;
  }>;
  system_health: Array<{
    label: string;
    value: string;
    status: string;
  }>;
}

export async function fetchStaffOverview(): Promise<StaffOverviewPayload> {
  const result = await api.get<{
    stats?: {
      total_students?: number;
      new_students_last_7_days?: number;
      total_universities?: number;
      active_programs?: number;
      applications_started?: number;
      applications_submitted?: number;
      applications_under_review?: number;
      accepted_applications?: number;
      rejected_applications?: number;
      pending_document_reviews?: number;
      completed_student_payments?: number;
      total_platform_revenue?: number;
      portal_accounts?: number;
      management_accounts?: number;
      total_applications?: number;
    };
    application_funnel?: StaffOverviewPayload["application_funnel"];
    registrations_by_date?: StaffOverviewPayload["registrations_by_date"];
    applications_by_status?: StaffOverviewPayload["applications_by_status"];
    popular_universities?: StaffOverviewPayload["popular_universities"];
    popular_programs?: StaffOverviewPayload["popular_programs"];
    students_by_region?: StaffOverviewPayload["students_by_region"];
    application_conversion?: StaffOverviewPayload["application_conversion"];
    recent_activity?: StaffOverviewPayload["recent_activity"];
    system_health?: StaffOverviewPayload["system_health"];
  }>(apiRoutes.staff.dashboard());
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load staff overview");
  }

  return {
    stats: {
      total_students: Number(result.data.stats?.total_students ?? 0),
      new_students_last_7_days: Number(result.data.stats?.new_students_last_7_days ?? 0),
      total_universities: Number(result.data.stats?.total_universities ?? 0),
      active_programs: Number(result.data.stats?.active_programs ?? 0),
      applications_started: Number(result.data.stats?.applications_started ?? 0),
      applications_submitted: Number(result.data.stats?.applications_submitted ?? 0),
      applications_under_review: Number(result.data.stats?.applications_under_review ?? 0),
      accepted_applications: Number(result.data.stats?.accepted_applications ?? 0),
      rejected_applications: Number(result.data.stats?.rejected_applications ?? 0),
      pending_document_reviews: Number(result.data.stats?.pending_document_reviews ?? 0),
      completed_student_payments: Number(result.data.stats?.completed_student_payments ?? 0),
      total_platform_revenue: Number(result.data.stats?.total_platform_revenue ?? 0),
      portal_accounts: Number(result.data.stats?.portal_accounts ?? result.data.stats?.management_accounts ?? 0),
      total_applications: Number(result.data.stats?.total_applications ?? 0),
    },
    application_funnel: Array.isArray(result.data.application_funnel) ? result.data.application_funnel : [],
    registrations_by_date: Array.isArray(result.data.registrations_by_date) ? result.data.registrations_by_date : [],
    applications_by_status: Array.isArray(result.data.applications_by_status) ? result.data.applications_by_status : [],
    popular_universities: Array.isArray(result.data.popular_universities) ? result.data.popular_universities : [],
    popular_programs: Array.isArray(result.data.popular_programs) ? result.data.popular_programs : [],
    students_by_region: Array.isArray(result.data.students_by_region) ? result.data.students_by_region : [],
    application_conversion: Array.isArray(result.data.application_conversion) ? result.data.application_conversion : [],
    recent_activity: Array.isArray(result.data.recent_activity) ? result.data.recent_activity : [],
    system_health: Array.isArray(result.data.system_health) ? result.data.system_health : [],
  };
}
