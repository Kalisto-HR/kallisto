import { useCallback, useEffect, useState } from "react";
import { fetchAdminUniversities, fetchAdminUniversity } from "../services/admin/universitiesService";
import type { UniversityListItem } from "../types/domain";

export function useManagementUniversityData(universityId?: string) {
  const [items, setItems] = useState<UniversityListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (universityId) {
        const item = await fetchAdminUniversity(universityId);
        setItems([item]);
        return;
      }
      const page = await fetchAdminUniversities(1, 20);
      setItems(page.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load universities");
    } finally {
      setLoading(false);
    }
  }, [universityId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, loading, error, refresh: load };
}
