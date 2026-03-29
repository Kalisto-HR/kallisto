import { useCallback, useEffect, useState } from "react";
import { fetchPartnerApplications } from "../services/partner/submissionsService";
import type { SubmittedApplication } from "../types/domain";

export function usePartnerApplicantsData(universityId?: string) {
  const [items, setItems] = useState<SubmittedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchPartnerApplications({
        universityId,
        page: 1,
        limit: 20,
      });
      setItems(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, [universityId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    items,
    loading,
    error,
    refresh: load,
  };
}
