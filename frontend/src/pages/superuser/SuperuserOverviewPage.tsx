import SuperuserOverview from "../../components/superuser/SuperuserOverview";
import { useEffect, useState } from "react";
import { fetchSuperuserOverview, type SuperuserOverviewPayload } from "../../services/admin/superuserService";

export function SuperuserOverviewPage() {
  const [data, setData] = useState<SuperuserOverviewPayload | undefined>(undefined);
  const emptyOverview: SuperuserOverviewPayload = {
    stats: {
      total_universities: 0,
      management_accounts: 0,
      total_applications: 0,
      pending_drafts: 0,
    },
    recent_activity: [],
    pending_drafts: [],
    system_health: [],
  };

  useEffect(() => {
    let active = true;
    void fetchSuperuserOverview()
      .then((payload) => {
        if (active) {
          setData(payload);
        }
      })
      .catch(() => {
        // Keep literal fallback UI if request fails.
      });
    return () => {
      active = false;
    };
  }, []);

  return <SuperuserOverview data={data ?? emptyOverview} />;
}
