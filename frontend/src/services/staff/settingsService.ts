import { apiRoutes } from "../api/routes";
import { api } from "../api/httpClient";

export interface GlobalSettingItem {
  setting_key: string;
  setting_value: Record<string, unknown> | null;
  updated_at: string;
  updated_by?: string | null;
}

export async function fetchStaffSettings(): Promise<GlobalSettingItem[]> {
  const result = await api.get<{ settings?: GlobalSettingItem[] }>(apiRoutes.staff.settings.base());
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load global settings");
  }
  return result.data.settings ?? [];
}

export async function updateStaffSettings(settings: Record<string, Record<string, unknown>>): Promise<void> {
  const result = await api.put<{ msg: string }>(apiRoutes.staff.settings.base(), { settings });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to update global settings");
  }
}
