import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowUpRight,
  BadgeCheck,
  Ban,
  Building2,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  GraduationCap,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StaffOverviewPayload } from "../../services/staff/overviewService";
import { routes } from "../../routes/routeConfig";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { EmptyState } from "../common/PageState";
import { translateRegionCode } from "../../i18n/regions";

interface StaffOverviewProps {
  data: StaffOverviewPayload;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function formatUzs(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value) + " UZS";
}

function normalizeStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function SimpleBarSummary({
  title,
  description,
  data,
  labelKey = "label",
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  description: string;
  data: Array<Record<string, string | number>>;
  labelKey?: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  const hasData = data.some((item) => Number(item.count) > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 8, bottom: 18, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey={labelKey} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0f766e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        )}
      </CardContent>
    </Card>
  );
}

export default function StaffOverview({ data }: StaffOverviewProps) {
  const { t } = useTranslation(["common", "dashboard"]);
  const stats = data.stats;
  const maxFunnelCount = Math.max(...data.application_funnel.map((step) => step.count), 1);

  const kpis = [
    { label: t("dashboard:staff.kpis.totalStudents"), value: stats.total_students, icon: Users },
    { label: t("dashboard:staff.kpis.newStudents"), value: stats.new_students_last_7_days, icon: TrendingUp },
    { label: t("dashboard:staff.kpis.totalUniversities"), value: stats.total_universities, icon: Building2 },
    { label: t("dashboard:staff.kpis.activePrograms"), value: stats.active_programs, icon: GraduationCap },
    { label: t("dashboard:staff.kpis.applicationsStarted"), value: stats.applications_started, icon: FileText },
    { label: t("dashboard:staff.kpis.applicationsSubmitted"), value: stats.applications_submitted, icon: ClipboardCheck },
    { label: t("dashboard:staff.kpis.underReview"), value: stats.applications_under_review, icon: ShieldCheck },
    { label: t("dashboard:staff.kpis.accepted"), value: stats.accepted_applications, icon: BadgeCheck },
    { label: t("dashboard:staff.kpis.rejected"), value: stats.rejected_applications, icon: Ban },
    { label: t("dashboard:staff.kpis.pendingDocuments"), value: stats.pending_document_reviews, icon: ClipboardCheck },
    { label: t("dashboard:staff.kpis.completedPayments"), value: stats.completed_student_payments, icon: CircleDollarSign },
    { label: t("dashboard:staff.kpis.revenue"), value: formatUzs(stats.total_platform_revenue), icon: CircleDollarSign, formatted: true },
  ];

  const regionRows = data.students_by_region.map((row) => ({
    ...row,
    label: row.label === "unknown" ? t("labels.unknown") : translateRegionCode(t, row.label),
  }));
  const statusRows = data.applications_by_status.map((row) => ({
    label: normalizeStatusLabel(row.status),
    count: row.count,
  }));

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("dashboard:staff.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("dashboard:staff.subtitle")}</p>
        </div>
        <Link to={routes.staff.auditLogs} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-brand-primary-hover">
          {t("dashboard:staff.viewAudit")}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold" data-i18n-dynamic="true">
                  {item.formatted ? item.value : formatNumber(Number(item.value))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard:staff.funnel.title")}</CardTitle>
          <CardDescription>{t("dashboard:staff.funnel.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.application_funnel.map((step) => {
            const width = `${Math.max((step.count / maxFunnelCount) * 100, step.count > 0 ? 8 : 0)}%`;
            return (
              <div key={step.stage} className="grid gap-2 md:grid-cols-[220px_1fr_72px] md:items-center">
                <div className="text-sm font-medium">{t(`dashboard:staff.funnel.steps.${step.stage}`)}</div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width }} />
                </div>
                <div className="text-right text-sm font-semibold" data-i18n-dynamic="true">{formatNumber(step.count)}</div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <SimpleBarSummary
          title={t("dashboard:staff.charts.registrations")}
          description={t("dashboard:staff.charts.registrationsDescription")}
          data={data.registrations_by_date}
          emptyTitle={t("dashboard:staff.charts.emptyTitle")}
          emptyDescription={t("dashboard:staff.charts.emptyDescription")}
        />
        <SimpleBarSummary
          title={t("dashboard:staff.charts.applicationStatuses")}
          description={t("dashboard:staff.charts.applicationStatusesDescription")}
          data={statusRows}
          emptyTitle={t("dashboard:staff.charts.emptyTitle")}
          emptyDescription={t("dashboard:staff.charts.emptyDescription")}
        />
        <SimpleBarSummary
          title={t("dashboard:staff.charts.popularUniversities")}
          description={t("dashboard:staff.charts.popularUniversitiesDescription")}
          data={data.popular_universities}
          emptyTitle={t("dashboard:staff.charts.emptyTitle")}
          emptyDescription={t("dashboard:staff.charts.emptyDescription")}
        />
        <SimpleBarSummary
          title={t("dashboard:staff.charts.studentsByRegion")}
          description={t("dashboard:staff.charts.studentsByRegionDescription")}
          data={regionRows}
          emptyTitle={t("dashboard:staff.charts.emptyTitle")}
          emptyDescription={t("dashboard:staff.charts.emptyDescription")}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard:staff.health.title")}</CardTitle>
            <CardDescription>{t("dashboard:staff.health.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.system_health.length > 0 ? (
              data.system_health.map((metric) => (
                <div key={metric.label} className="flex items-center justify-between gap-4 rounded-lg border p-3">
                  <span className="text-sm text-muted-foreground">{metric.label}</span>
                  <span className="text-sm font-semibold">{metric.value}</span>
                </div>
              ))
            ) : (
              <EmptyState title={t("dashboard:staff.health.emptyTitle")} description={t("dashboard:staff.health.emptyDescription")} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard:staff.activity.title")}</CardTitle>
            <CardDescription>{t("dashboard:staff.activity.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recent_activity.length > 0 ? (
              data.recent_activity.map((activity) => (
                <div key={activity.id} className="rounded-lg border p-3">
                  <div className="font-medium">{activity.type}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{activity.description}</div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {activity.user} | {activity.timestamp}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title={t("dashboard:staff.activity.emptyTitle")} description={t("dashboard:staff.activity.emptyDescription")} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
