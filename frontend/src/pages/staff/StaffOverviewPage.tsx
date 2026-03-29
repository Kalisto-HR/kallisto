import { useCallback, useEffect, useState } from "react";
import { ErrorState, LoadingState } from "../../components/common/PageState";
import StaffOverview from "../../components/staff/StaffOverview";
import { fetchStaffOverview, type StaffOverviewPayload } from "../../services/staff/overviewService";

export function StaffOverviewPage() {
  const [data, setData] = useState<StaffOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
        const payload = await fetchStaffOverview();
      setData(payload);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load staff overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <LoadingState label="Loading overview..." />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? "Failed to load staff overview"} onRetry={() => void load()} />;
  }

  return <StaffOverview data={data} />;
}
