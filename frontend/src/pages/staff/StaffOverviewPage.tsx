import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ErrorState, LoadingState } from "../../components/common/PageState";
import StaffOverview from "../../components/staff/StaffOverview";
import { fetchStaffOverview, type StaffOverviewPayload } from "../../services/staff/overviewService";

export function StaffOverviewPage() {
  const { t } = useTranslation("dashboard");
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
      setError(err instanceof Error ? err.message : t("staff.errors.load"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <LoadingState label={t("staff.loading")} />;
  }

  if (error || !data) {
    return <ErrorState message={error ?? t("staff.errors.load")} onRetry={() => void load()} />;
  }

  return <StaffOverview data={data} />;
}
