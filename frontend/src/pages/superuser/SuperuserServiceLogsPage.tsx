import { ServiceLogs } from "../../components/superuser/ServiceLogs";
import { useEffect, useState } from "react";
import { fetchSuperuserServiceLogs, type SuperuserServiceLogItem } from "../../services/admin/superuserService";

export function SuperuserServiceLogsPage() {
  const [logs, setLogs] = useState<SuperuserServiceLogItem[]>([]);

  useEffect(() => {
    let active = true;
    void fetchSuperuserServiceLogs({ page: 1, limit: 200 })
      .then((page) => {
        if (active) {
          setLogs(page.items);
        }
      })
      .catch(() => {
        // Keep literal fallback UI if request fails.
      });
    return () => {
      active = false;
    };
  }, []);

  const mapped = logs.map((log) => ({
    id: log.id,
    timestamp: log.timestamp,
    level: log.level,
    microservice: log.microservice,
    handler: log.handler,
    message: log.message,
    userId: log.user_id ?? undefined,
    requestId: log.request_id ?? undefined,
    metadata: log.metadata ?? undefined,
  }));

  return <ServiceLogs logsData={mapped as any} />;
}
