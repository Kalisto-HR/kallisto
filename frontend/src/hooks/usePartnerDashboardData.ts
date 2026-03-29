import { useCallback, useEffect, useState } from "react";
import { fetchPartnerDashboard } from "../services/partner/dashboardService";
import type { PartnerDashboardPayload } from "../types/domain";

export function usePartnerDashboardData(universityId?: string) {
  const [data, setData] = useState<PartnerDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!universityId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchPartnerDashboard(universityId);
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [universityId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, error, refresh: load };
}
