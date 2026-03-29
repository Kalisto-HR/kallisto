import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  AlertTriangle,
  Building2,
  CheckCircle,
  FileText,
  MinusCircle,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import type { StaffOverviewPayload } from "../../services/staff/overviewService";
import { routes } from "../../routes/routeConfig";

interface StaffOverviewProps {
  data: StaffOverviewPayload;
}

type StatTone = "primary" | "accent" | "success";

function statToneClass(tone: StatTone): string {
  switch (tone) {
    case "accent":
      return "bg-accent text-accent-foreground";
    case "success":
      return "bg-success/10 text-success";
    default:
      return "bg-primary/10 text-primary";
  }
}

function healthToneClass(status: string): string {
  switch (status) {
    case "warn":
      return "text-warning";
    case "critical":
      return "text-destructive";
    case "neutral":
      return "text-muted-foreground";
    default:
      return "text-success";
  }
}

function HealthIcon({ status }: { status: string }) {
  const className = `h-4 w-4 ${healthToneClass(status)}`;
  switch (status) {
    case "warn":
      return <AlertTriangle className={className} />;
    case "critical":
      return <XCircle className={className} />;
    case "neutral":
      return <MinusCircle className={className} />;
    default:
      return <CheckCircle className={className} />;
  }
}

export default function StaffOverview({ data }: StaffOverviewProps) {
  const stats = [
    {
      label: "Total Universities",
      value: String(data.stats.total_universities ?? 0),
      change: "Live data",
      icon: Building2,
      tone: "primary" as const,
    },
    {
      label: "Portal Accounts",
      value: String(data.stats.portal_accounts ?? 0),
      change: "Live data",
      icon: Users,
      tone: "accent" as const,
    },
    {
      label: "Total Applications",
      value: String(data.stats.total_applications ?? 0),
      change: "Live data",
      icon: FileText,
      tone: "success" as const,
    },
  ];

  return (
    <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-semibold text-foreground">Overview</h1>
        <p className="text-muted-foreground">Monitor platform activity and system health.</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="brand-panel p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${statToneClass(stat.tone)}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mb-1 text-3xl font-semibold text-foreground">{stat.value}</div>
              <div className="mb-2 text-sm text-muted-foreground">{stat.label}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground/80">
                <TrendingUp className="h-3 w-3" />
                {stat.change}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-8">
        <div className="brand-panel overflow-hidden">
          <div className="border-b border-border/70 p-6">
            <h2 className="font-semibold text-foreground">System Health</h2>
            <p className="mt-1 text-sm text-muted-foreground">Real-time metrics</p>
          </div>
          <div className="space-y-4 p-6">
            {data.system_health.length > 0 ? (
              data.system_health.map((metric) => (
                <div key={metric.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{metric.label}</span>
                    <HealthIcon status={metric.status} />
                  </div>
                  <div className="font-medium text-foreground">{metric.value}</div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No system health metrics are available right now.</p>
            )}
          </div>
        </div>
      </div>

      <div className="brand-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/70 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-foreground">Recent Activity</h2>
            <p className="mt-1 text-sm text-muted-foreground">Latest platform actions and events</p>
          </div>
          <Link
            to={routes.staff.auditLogs}
            className="flex items-center gap-1 text-sm text-primary transition-colors hover:text-brand-primary-hover"
          >
            View audit log
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="divide-y divide-border/60">
          {data.recent_activity.length > 0 ? (
            data.recent_activity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 p-6">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle className="h-4 w-4 text-success" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 font-medium text-foreground">{activity.type}</div>
                  <div className="mb-2 text-sm text-muted-foreground">{activity.description}</div>
                  <div className="text-xs text-muted-foreground/80">
                    by {activity.user} | {activity.timestamp}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-sm text-muted-foreground">No recent activity has been recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
