import SuperuserAuditLogs from "../../components/superuser/SuperuserAuditLogs";
import { useEffect, useState } from "react";
import { fetchSuperuserAuditLogs, type SuperuserAuditLogItem } from "../../services/admin/superuserService";

export function SuperuserAuditLogsPage() {
  const [logs, setLogs] = useState<SuperuserAuditLogItem[]>([]);

  useEffect(() => {
    let active = true;
    void fetchSuperuserAuditLogs({ page: 1, limit: 200 })
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
    actor: log.actor,
    actorId: log.actor_id ?? undefined,
    actorType: log.actor_type,
    action: log.action,
    actionDescription: log.action_description,
    targetEntity: log.target_entity,
    targetId: log.target_id ?? undefined,
    outcome: log.outcome,
    ipAddress: log.ip_address ?? undefined,
    metadata: log.metadata ?? undefined,
  }));

  return <SuperuserAuditLogs logsData={mapped.length > 0 ? (mapped as any) : undefined} />;
}
