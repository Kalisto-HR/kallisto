import { useCallback, useEffect, useState } from "react";
import { fetchPartnerDashboard } from "../services/partner/dashboardService";
import type { PartnerDashboardPayload } from "../types/domain";

export function usePartnerDashboardData(universityId?: string) {
  const [data, setData] = useState<PartnerDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!universityId) {
      setData(null);
      setLoading(false);
      return;
    }
    if (!options.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const payload = await fetchPartnerDashboard(universityId);
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }, [universityId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!universityId) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      void load({ silent: true });
    }, 30000);

    return () => window.clearInterval(timer);
  }, [load, universityId]);

  const refresh = useCallback(() => load(), [load]);

  return { data, loading, error, refresh };
}
