import { apiRoutes } from "../api/routes";
import { api } from "../api/httpClient";

export interface StaffOverviewPayload {
  stats: {
    total_universities: number;
    portal_accounts: number;
    total_applications: number;
  };
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
      total_universities?: number;
      portal_accounts?: number;
      management_accounts?: number;
      total_applications?: number;
    };
    recent_activity?: StaffOverviewPayload["recent_activity"];
    system_health?: StaffOverviewPayload["system_health"];
  }>(apiRoutes.staff.dashboard());
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load staff overview");
  }

  return {
    stats: {
      total_universities: Number(result.data.stats?.total_universities ?? 0),
      portal_accounts: Number(result.data.stats?.portal_accounts ?? result.data.stats?.management_accounts ?? 0),
      total_applications: Number(result.data.stats?.total_applications ?? 0),
    },
    recent_activity: Array.isArray(result.data.recent_activity) ? result.data.recent_activity : [],
    system_health: Array.isArray(result.data.system_health) ? result.data.system_health : [],
  };
}
