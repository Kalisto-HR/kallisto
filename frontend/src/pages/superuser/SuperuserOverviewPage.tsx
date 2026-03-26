import { useCallback, useEffect, useState } from "react";
import { ErrorState, LoadingState } from "../../components/common/PageState";
import SuperuserOverview from "../../components/superuser/SuperuserOverview";
import { fetchSuperuserOverview, type SuperuserOverviewPayload } from "../../services/admin/superuserService";

export function SuperuserOverviewPage() {
  const [data, setData] = useState<SuperuserOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await fetchSuperuserOverview();
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

  return <SuperuserOverview data={data} />;
}
