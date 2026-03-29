import StaffSettings from "../../components/staff/StaffSettings";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorState, LoadingState } from "../../components/common/PageState";
import { fetchStaffSettings, updateStaffSettings, type GlobalSettingItem } from "../../services/staff/settingsService";

export function StaffSettingsPage() {
  const [settings, setSettings] = useState<GlobalSettingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStaffSettings();
      setSettings(data);
    } catch (cause) {
      setSettings([]);
      setError(cause instanceof Error ? cause.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const settingsMap = useMemo(() => {
    const map: Record<string, Record<string, unknown>> = {};
    settings.forEach((item) => {
      map[item.setting_key] = item.setting_value ?? {};
    });
    return map;
  }, [settings]);

  if (loading) {
    return <LoadingState label="Loading settings..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <StaffSettings
      key={settings.map((item) => `${item.setting_key}:${item.updated_at}`).join("|")}
      settings={settingsMap}
      onSave={async (payload) => {
        await updateStaffSettings(payload);
        const latest = await fetchStaffSettings();
        setSettings(latest);
      }}
    />
  );
}
