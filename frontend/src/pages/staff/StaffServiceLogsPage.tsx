import type { InputHTMLAttributes, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { fetchStaffServiceLogs, type StaffServiceLogItem } from "../../services/staff/logsService";

type ServiceLogFilters = {
  level: string;
  microservice: string;
  handler: string;
  userId: string;
  timeRange: string;
  requestId: string;
  method: string;
  statusCode: string;
  role: string;
  from: string;
  to: string;
};

const defaultFilters: ServiceLogFilters = {
  level: "",
  microservice: "",
  handler: "",
  userId: "",
  timeRange: "24h",
  requestId: "",
  method: "",
  statusCode: "",
  role: "",
  from: "",
  to: "",
};

export function StaffServiceLogsPage() {
  const [filters, setFilters] = useState<ServiceLogFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<ServiceLogFilters>(defaultFilters);
  const [logs, setLogs] = useState<StaffServiceLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchStaffServiceLogs({
        level: appliedFilters.level || undefined,
        microservice: appliedFilters.microservice || undefined,
        handler: appliedFilters.handler || undefined,
        userId: appliedFilters.userId || undefined,
        timeRange: appliedFilters.timeRange || undefined,
        requestId: appliedFilters.requestId || undefined,
        method: appliedFilters.method || undefined,
        statusCode: appliedFilters.statusCode || undefined,
        role: appliedFilters.role || undefined,
        from: toISOStringOrUndefined(appliedFilters.from),
        to: toISOStringOrUndefined(appliedFilters.to),
        page: 1,
        limit: 100,
      });
      setLogs(page.items);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to load service logs");
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Service Logs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Structured request logs for auth, applicant, partner, and staff traffic. Sensitive request payloads and cookies are excluded.
        </p>
      </div>

      <section className="brand-panel p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <LabeledInput label="Request ID" value={filters.requestId} onChange={(value) => setFilters((current) => ({ ...current, requestId: value }))} />
          <LabeledInput label="Handler" value={filters.handler} onChange={(value) => setFilters((current) => ({ ...current, handler: value }))} />
          <LabeledInput label="User ID" value={filters.userId} onChange={(value) => setFilters((current) => ({ ...current, userId: value }))} />
          <LabeledInput label="Status Code" value={filters.statusCode} inputMode="numeric" onChange={(value) => setFilters((current) => ({ ...current, statusCode: value }))} />

          <LabeledSelect label="Scope" value={filters.microservice} onChange={(value) => setFilters((current) => ({ ...current, microservice: value }))}>
            <option value="">All</option>
            <option value="auth">Auth</option>
            <option value="partner">Partner</option>
            <option value="staff">Staff</option>
          </LabeledSelect>

          <LabeledSelect label="Method" value={filters.method} onChange={(value) => setFilters((current) => ({ ...current, method: value }))}>
            <option value="">All</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </LabeledSelect>

          <LabeledSelect label="Role" value={filters.role} onChange={(value) => setFilters((current) => ({ ...current, role: value }))}>
            <option value="">All</option>
            <option value="anonymous">Anonymous</option>
            <option value="partner">Partner</option>
            <option value="staff">Staff</option>
            <option value="applicant">Applicant</option>
          </LabeledSelect>

          <LabeledSelect label="Level" value={filters.level} onChange={(value) => setFilters((current) => ({ ...current, level: value }))}>
            <option value="">All</option>
            <option value="info">Info</option>
            <option value="warn">Warn</option>
            <option value="error">Error</option>
          </LabeledSelect>

          <LabeledSelect label="Time Range" value={filters.timeRange} onChange={(value) => setFilters((current) => ({ ...current, timeRange: value }))}>
            <option value="">Any</option>
            <option value="15m">Last 15 minutes</option>
            <option value="1h">Last 1 hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
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
          <div className="text-sm font-medium text-foreground">Latest Requests</div>
          <div className="mt-1 text-xs text-muted-foreground">Showing {logs.length} rows</div>
        </div>

        {loading ? (
          <div className="p-8 text-sm text-muted-foreground">Loading service logs...</div>
        ) : error ? (
          <div className="p-8 text-sm text-destructive">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground">No service logs matched the selected filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/60 text-sm">
              <thead className="bg-secondary/55 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Time</th>
                  <th className="px-5 py-3">Request</th>
                  <th className="px-5 py-3">Result</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Request ID</th>
                  <th className="px-5 py-3">Client</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top">
                    <td className="px-5 py-4 text-muted-foreground">{formatTimestamp(log.timestamp)}</td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-foreground">
                        {log.method} {log.handler}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">{log.microservice}</div>
                      <div className="mt-2 max-w-xl text-xs text-muted-foreground">{log.message}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${levelPillClass(log.level)}`}>
                        {log.level.toUpperCase()}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">HTTP {log.status_code}</div>
                      <div className="text-xs text-muted-foreground">{log.duration_ms} ms</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium text-foreground">{log.role ?? "anonymous"}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{log.user_id ?? "No user ID"}</div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{log.request_id ?? "n/a"}</td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      <div>{log.ip_address ?? "Unknown IP"}</div>
                      <div className="mt-1 max-w-xs truncate">{log.user_agent ?? "Unknown agent"}</div>
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
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 block font-medium text-foreground">{label}</span>
      <input
        type={type}
        inputMode={inputMode}
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

function levelPillClass(level: string): string {
  switch (level) {
    case "error":
      return "bg-destructive/10 text-destructive";
    case "warn":
      return "bg-warning/12 text-warning";
    default:
      return "bg-accent text-accent-foreground";
  }
}
