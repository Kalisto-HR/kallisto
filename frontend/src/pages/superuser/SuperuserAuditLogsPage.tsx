import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { fetchSuperuserAuditLogs, type SuperuserAuditLogItem } from "../../services/admin/superuserService";

type AuditLogFilters = {
  q: string;
  action: string;
  outcome: string;
  requestId: string;
  actorType: string;
  targetEntity: string;
  from: string;
  to: string;
};

const defaultFilters: AuditLogFilters = {
  q: "",
  action: "",
  outcome: "",
  requestId: "",
  actorType: "",
  targetEntity: "",
  from: "",
  to: "",
};

export function SuperuserAuditLogsPage() {
  const [filters, setFilters] = useState<AuditLogFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<AuditLogFilters>(defaultFilters);
  const [logs, setLogs] = useState<SuperuserAuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    void fetchSuperuserAuditLogs({
      q: appliedFilters.q || undefined,
      action: appliedFilters.action || undefined,
      outcome: appliedFilters.outcome || undefined,
      requestId: appliedFilters.requestId || undefined,
      actorType: appliedFilters.actorType || undefined,
      targetEntity: appliedFilters.targetEntity || undefined,
      from: toISOStringOrUndefined(appliedFilters.from),
      to: toISOStringOrUndefined(appliedFilters.to),
      page: 1,
      limit: 100,
    })
      .then((page) => {
        if (!active) {
          return;
        }
        setLogs(page.items);
      })
      .catch((cause) => {
        if (!active) {
          return;
        }
        setError(cause instanceof Error ? cause.message : "Failed to load audit logs");
        setLogs([]);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [appliedFilters]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Audit Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Immutable records for authentication, privileged platform changes, and access-denied events.
        </p>
      </div>

      <section className="brand-panel p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <LabeledInput label="Search" value={filters.q} onChange={(value) => setFilters((current) => ({ ...current, q: value }))} />
          <LabeledInput label="Request ID" value={filters.requestId} onChange={(value) => setFilters((current) => ({ ...current, requestId: value }))} />
          <LabeledInput label="Action" value={filters.action} onChange={(value) => setFilters((current) => ({ ...current, action: value }))} />
          <LabeledInput label="Target Entity" value={filters.targetEntity} onChange={(value) => setFilters((current) => ({ ...current, targetEntity: value }))} />

          <LabeledSelect label="Actor Type" value={filters.actorType} onChange={(value) => setFilters((current) => ({ ...current, actorType: value }))}>
            <option value="">All</option>
            <option value="anonymous">Anonymous</option>
            <option value="partner">Partner</option>
            <option value="staff">Staff</option>
            <option value="applicant">Applicant</option>
            <option value="system">System</option>
          </LabeledSelect>

          <LabeledSelect label="Outcome" value={filters.outcome} onChange={(value) => setFilters((current) => ({ ...current, outcome: value }))}>
            <option value="">All</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </LabeledSelect>

          <LabeledInput label="From" type="datetime-local" value={filters.from} onChange={(value) => setFilters((current) => ({ ...current, from: value }))} />
          <LabeledInput label="To" type="datetime-local" value={filters.to} onChange={(value) => setFilters((current) => ({ ...current, to: value }))} />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="brand-primary-button" onClick={() => setAppliedFilters(filters)}>
            Apply Filters
          </button>
          <button
            type="button"
            className="brand-secondary-button"
            onClick={() => {
              setFilters(defaultFilters);
              setAppliedFilters(defaultFilters);
            }}
          >
            Reset
          </button>
        </div>
      </section>

      <section className="brand-panel overflow-hidden">
        <div className="border-b border-border/70 px-5 py-4">
          <div className="text-sm font-medium text-foreground">Latest Audit Events</div>
          <div className="mt-1 text-xs text-muted-foreground">Showing {logs.length} rows</div>
        </div>

        {loading ? (
          <div className="p-8 text-sm text-muted-foreground">Loading audit logs...</div>
        ) : error ? (
          <div className="p-8 text-sm text-destructive">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground">No audit logs matched the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/60 text-sm">
              <thead className="bg-secondary/55 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Target</th>
                  <th className="px-5 py-3">Outcome</th>
                  <th className="px-5 py-3">Request</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="px-5 py-4 text-muted-foreground">{formatTimestamp(log.timestamp)}</td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-foreground">{log.actor}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{log.actor_type}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{log.actor_id ?? "No actor ID"}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-foreground">{log.action}</div>
                      <div className="mt-1 max-w-md text-xs text-muted-foreground">{log.action_description}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-foreground">{log.target_entity}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{log.target_id ?? "No target ID"}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${outcomePillClass(log.outcome)}`}>
                        {log.outcome}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">{log.ip_address ?? "Unknown IP"}</div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                      <div>{log.request_id ?? "n/a"}</div>
                      <div className="mt-2 text-muted-foreground/70">{log.id}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium text-foreground">{label}</span>
      <input
        type={type}
        className="brand-input-field w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium text-foreground">{label}</span>
      <select className="brand-input-field w-full" value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function toISOStringOrUndefined(value: string): string | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function outcomePillClass(outcome: string): string {
  switch (outcome) {
    case "failed":
      return "bg-destructive/10 text-destructive";
    case "pending":
      return "bg-warning/12 text-warning";
    default:
      return "bg-success/10 text-success";
  }
}
