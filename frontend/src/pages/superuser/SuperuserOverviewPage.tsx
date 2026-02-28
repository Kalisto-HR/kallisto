import SuperuserOverview from "../../components/superuser/SuperuserOverview";
import { useEffect, useState } from "react";
import { fetchSuperuserOverview, type SuperuserOverviewPayload } from "../../services/admin/superuserService";

export function SuperuserOverviewPage() {
  const [data, setData] = useState<SuperuserOverviewPayload | undefined>(undefined);

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

  return <SuperuserOverview data={data} />;
}
