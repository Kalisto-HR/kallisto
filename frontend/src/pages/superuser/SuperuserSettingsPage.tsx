import SuperuserSettings from "../../components/superuser/SuperuserSettings";
import { useEffect, useMemo, useState } from "react";
import { fetchGlobalSettings, updateGlobalSettings, type GlobalSettingItem } from "../../services/admin/superuserService";

export function SuperuserSettingsPage() {
  const [settings, setSettings] = useState<GlobalSettingItem[]>([]);

  useEffect(() => {
    let active = true;
    void fetchGlobalSettings()
      .then((data) => {
        if (active) {
          setSettings(data);
        }
      })
      .catch(() => {
        // Keep literal fallback UI if request fails.
      });
    return () => {
      active = false;
    };
  }, []);

  const settingsMap = useMemo(() => {
    const map: Record<string, Record<string, unknown>> = {};
    settings.forEach((item) => {
      map[item.setting_key] = item.setting_value ?? {};
    });
    return map;
  }, [settings]);

  return (
    <SuperuserSettings
      settings={Object.keys(settingsMap).length > 0 ? settingsMap : undefined}
      onSave={async (payload) => {
        await updateGlobalSettings(payload);
        const latest = await fetchGlobalSettings();
        setSettings(latest);
      }}
    />
  );
}
