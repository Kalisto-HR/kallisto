import { useCallback, useEffect, useState } from "react";
import { fetchAdminApplications, reviewAdminApplication } from "../services/admin/applicationsService";
import type { AdminSubmittedApplication, ReviewStatus } from "../types/domain";

export function useManagementApplicantsData(universityId?: string) {
  const [items, setItems] = useState<AdminSubmittedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "all">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAdminApplications({
        universityId,
        status: statusFilter === "all" ? undefined : statusFilter,
        page: 1,
        limit: 20,
      });
      setItems(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, universityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (id: string, status: ReviewStatus, notes?: string) => {
    await reviewAdminApplication(id, status, notes);
    await load();
  };

  return {
    items,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    review,
    refresh: load,
  };
}
