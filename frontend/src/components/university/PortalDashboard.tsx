import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Award, Bell, Copy, Download, FileText, Mail, PieChart as PieChartIcon, TrendingUp, UserPlus, Users } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "../ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { routes } from "../../routes/routeConfig";
import { usePartnerDashboardData } from "../../hooks/usePartnerDashboardData";
import {
  copyPartnerContactEmails,
  downloadPartnerContactsCsv,
  fetchPartnerAnalyticsContacts,
} from "../../services/partner/analyticsService";
import type { PartnerAnalyticsStage, PartnerStudentOriginStat } from "../../types/domain";
import { formatLocaleDate, formatLocalePercentage } from "../../i18n/format";
import { translateRegionCode } from "../../i18n/regions";

interface PortalDashboardProps {
  onNavigate?: (page: string) => void;
}

type ContactAction = "copy" | "csv";

const originColors = ["#2563eb", "#16a34a", "#f97316", "#9333ea", "#dc2626", "#0f766e", "#64748b"];
const genderColors = ["#2563eb", "#e11d48", "#9333ea", "#64748b"];

function buildOriginChartRows(
  stats: PartnerStudentOriginStat[],
  translateRegion: (regionCode: string | null) => string,
  otherLabel: string,
) {
  const filtered = stats.filter((item) => item.count > 0);
  const total = filtered.reduce((sum, item) => sum + item.count, 0);
  const sorted = [...filtered].sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return translateRegion(a.regionCode).localeCompare(translateRegion(b.regionCode));
  });
  const topRows = sorted.slice(0, 6);
  const overflow = sorted.slice(6);

  const rows = topRows.map((item, index) => ({
    ...item,
    label: translateRegion(item.regionCode),
    fill: originColors[index % originColors.length],
  }));

  if (overflow.length > 0) {
    const otherCount = overflow.reduce((sum, item) => sum + item.count, 0);
    rows.push({
      regionCode: "other",
      label: otherLabel,
      count: otherCount,
      percentage: total > 0 ? Math.round((otherCount / total) * 1000) / 10 : 0,
      fill: originColors[originColors.length - 1],
    });
  }

  return rows;
}

export function PortalDashboard({ onNavigate }: PortalDashboardProps) {
  const { t } = useTranslation(["common", "dashboard"]);
  const { universityId } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = usePartnerDashboardData(universityId);
  const [contactLoading, setContactLoading] = useState<string | null>(null);
  const [contactMessage, setContactMessage] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const submissionsRoute = universityId ? routes.partner.applications(universityId) : null;
  const isInitialLoading = loading && !data;

  const openSubmissions = (applicationId?: string) => {
    if (submissionsRoute) {
      const suffix = applicationId ? `?applicationId=${encodeURIComponent(applicationId)}` : "";
      void navigate(`${submissionsRoute}${suffix}`);
      return;
    }
    onNavigate?.("partner-applications");
  };

  const handleContactAction = async (stage: PartnerAnalyticsStage, action: ContactAction) => {
    const actionKey = `${stage}:${action}`;
    setContactLoading(actionKey);
    setContactMessage(null);
    setContactError(null);

    try {
      const contacts = await fetchPartnerAnalyticsContacts(stage);
      if (action === "copy") {
        const copiedCount = await copyPartnerContactEmails(contacts);
        setContactMessage(
          copiedCount === 0
            ? t("dashboard:partner.contacts.none", { stage })
            : t("dashboard:partner.contacts.copied", { count: copiedCount, stage }),
        );
      } else {
        downloadPartnerContactsCsv(stage, contacts);
        setContactMessage(t("dashboard:partner.contacts.downloaded", { count: contacts.length, stage }));
      }
    } catch (err) {
      setContactError(err instanceof Error ? err.message : t("dashboard:partner.contacts.failed", { stage }));
    } finally {
      setContactLoading(null);
    }
  };

  const stats = [
    {
      title: t("dashboard:partner.stats.newSubmissions"),
      value: String(data?.newApplications ?? 0),
      caption: t("dashboard:partner.stats.last7Days"),
      icon: FileText,
    },
    {
      title: t("dashboard:partner.stats.totalSubmissions"),
      value: String(data?.totalApplicants ?? 0),
      caption: t("dashboard:partner.stats.allSubmitted"),
      icon: Users,
    },
    {
      title: t("dashboard:partner.stats.suspects"),
      value: String(data?.suspectsCount ?? 0),
      caption: t("dashboard:partner.stats.basketOnly"),
      icon: UserPlus,
      contactStage: "suspect" as const,
    },
    {
      title: t("dashboard:partner.stats.prospects"),
      value: String(data?.prospectsCount ?? 0),
      caption: t("dashboard:partner.stats.draftApplications"),
      icon: Mail,
      contactStage: "prospect" as const,
    },
    {
      title: t("dashboard:partner.stats.averageSat"),
      value: String(data?.avgSAT ?? 0),
      caption: t("dashboard:partner.stats.reportedScore"),
      icon: Award,
    },
    {
      title: t("dashboard:partner.stats.averageIelts"),
      value: (data?.avgIELTS ?? 0).toFixed(1),
      caption: t("dashboard:partner.stats.reportedScore"),
      icon: TrendingUp,
    },
  ];

  const recentApplications = data?.recentApplications ?? [];
  const notifications = data?.notifications ?? [];
  const maleCount = data?.maleCount ?? 0;
  const femaleCount = data?.femaleCount ?? 0;
  const nonBinaryCount = data?.nonBinaryCount ?? 0;
  const preferNotToSayCount = data?.preferNotToSayCount ?? 0;
  const totalApplicants = data?.totalApplicants ?? 0;
  const genderDistribution = useMemo(() => [
    {
      label: t("dashboard:partner.gender.male"),
      count: maleCount,
      percentage: totalApplicants > 0 ? Math.round((maleCount / totalApplicants) * 1000) / 10 : 0,
      fill: genderColors[0],
    },
    {
      label: t("dashboard:partner.gender.female"),
      count: femaleCount,
      percentage: totalApplicants > 0 ? Math.round((femaleCount / totalApplicants) * 1000) / 10 : 0,
      fill: genderColors[1],
    },
    {
      label: t("dashboard:partner.gender.nonBinary"),
      count: nonBinaryCount,
      percentage: totalApplicants > 0 ? Math.round((nonBinaryCount / totalApplicants) * 1000) / 10 : 0,
      fill: genderColors[2],
    },
    {
      label: t("dashboard:partner.gender.preferNotToSay"),
      count: preferNotToSayCount,
      percentage: totalApplicants > 0 ? Math.round((preferNotToSayCount / totalApplicants) * 1000) / 10 : 0,
      fill: genderColors[3],
    },
  ], [femaleCount, maleCount, nonBinaryCount, preferNotToSayCount, t, totalApplicants]);
  const genderChartRows = useMemo(
    () => genderDistribution.filter((item) => item.count > 0),
    [genderDistribution],
  );
  const originRows = useMemo(
    () => buildOriginChartRows(
      data?.studentOriginStats ?? [],
      (regionCode) => translateRegionCode(t, regionCode),
      t("dashboard:partner.studentOrigin.other"),
    ),
    [data?.studentOriginStats, t],
  );
  const originChartConfig = useMemo<ChartConfig>(() => {
    return originRows.reduce<ChartConfig>((config, row) => {
      config[row.label] = { label: row.label, color: row.fill };
      return config;
    }, {});
  }, [originRows]);
  const genderChartConfig = useMemo<ChartConfig>(() => {
    return genderDistribution.reduce<ChartConfig>((config, row) => {
      config[row.label] = { label: row.label, color: row.fill };
      return config;
    }, {});
  }, [genderDistribution]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">{t("dashboard:partner.title")}</h1>
            <p className="mt-1 text-muted-foreground">
              {t("dashboard:partner.subtitle")}
            </p>
          </div>
          <Button className="w-full md:w-auto" onClick={() => openSubmissions()}>
            {t("actions.openSubmissions")}
          </Button>
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {contactError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {contactError}
          </div>
        ) : null}

        {contactMessage ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {contactMessage}
          </div>
        ) : null}

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const contactStage = stat.contactStage;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold" data-i18n-dynamic="true">
                    {isInitialLoading ? "..." : stat.value}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.caption}</p>
                  {contactStage ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={contactLoading === `${contactStage}:copy`}
                        onClick={() => void handleContactAction(contactStage, "copy")}
                      >
                        <Copy className="h-4 w-4" />
                        {contactLoading === `${contactStage}:copy` ? t("actions.copying") : t("actions.copyEmails")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={contactLoading === `${contactStage}:csv`}
                        onClick={() => void handleContactAction(contactStage, "csv")}
                      >
                        <Download className="h-4 w-4" />
                        {contactLoading === `${contactStage}:csv` ? t("actions.exporting") : t("actions.csv")}
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-muted-foreground" />
                <CardTitle>{t("dashboard:partner.studentOrigin.title")}</CardTitle>
              </div>
              <CardDescription>{t("dashboard:partner.studentOrigin.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isInitialLoading ? (
                <p className="text-sm text-muted-foreground">{t("dashboard:partner.studentOrigin.loading")}</p>
              ) : originRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("dashboard:partner.studentOrigin.empty")}</p>
              ) : (
                <div className="grid gap-6 min-[1180px]:grid-cols-[minmax(200px,0.9fr)_minmax(0,1fr)] min-[1180px]:items-center">
                  <ChartContainer config={originChartConfig} className="h-[280px] w-full aspect-auto">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel />} />
                      <Pie
                        data={originRows}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={58}
                        outerRadius={96}
                        paddingAngle={0}
                        stroke="none"
                      >
                        {originRows.map((row) => (
                          <Cell key={row.label} fill={row.fill} stroke="none" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="max-h-[280px] min-w-0 space-y-4 overflow-y-auto pr-2">
                    {originRows.map((row) => (
                      <div key={row.label} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                        <div className="min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: row.fill }} />
                            <p className="truncate text-sm font-medium">{row.label}</p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("dashboard:partner.studentOrigin.student", { count: row.count })}
                          </p>
                        </div>
                        <p className="whitespace-nowrap text-right text-sm font-semibold">{formatLocalePercentage(row.percentage)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-muted-foreground" />
                <CardTitle>{t("dashboard:partner.gender.title")}</CardTitle>
              </div>
              <CardDescription>{t("dashboard:partner.gender.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isInitialLoading ? (
                <p className="text-sm text-muted-foreground">{t("dashboard:partner.gender.loading")}</p>
              ) : totalApplicants === 0 ? (
                <p className="text-sm text-muted-foreground">{t("dashboard:partner.gender.empty")}</p>
              ) : (
                <div className="grid gap-6 min-[1180px]:grid-cols-[minmax(200px,0.9fr)_minmax(0,1fr)] min-[1180px]:items-center">
                  <ChartContainer config={genderChartConfig} className="h-[280px] w-full aspect-auto">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel />} />
                      <Pie
                        data={genderChartRows}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={44}
                        outerRadius={78}
                        paddingAngle={0}
                        stroke="none"
                      >
                        {genderChartRows.map((row) => (
                          <Cell key={row.label} fill={row.fill} stroke="none" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="min-w-0 space-y-4">
                    {genderDistribution.map((item) => {
                      return (
                        <div key={item.label} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                          <div className="min-w-0 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.fill }} />
                              <p className="truncate text-sm font-medium">{item.label}</p>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {t("dashboard:partner.gender.applicant", { count: item.count })}
                            </p>
                          </div>
                          <p className="whitespace-nowrap text-right text-sm font-semibold">{formatLocalePercentage(item.percentage)}%</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>{t("dashboard:partner.recent.title")}</CardTitle>
                  <CardDescription>{t("dashboard:partner.recent.description")}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => openSubmissions()}>
                  {t("actions.openSubmissions")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentApplications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {isInitialLoading ? t("dashboard:partner.recent.loading") : t("dashboard:partner.recent.empty")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("dashboard:partner.recent.applicant")}</TableHead>
                      <TableHead>{t("dashboard:partner.recent.program")}</TableHead>
                      <TableHead>{t("dashboard:partner.recent.citizenship")}</TableHead>
                      <TableHead>{t("dashboard:partner.recent.submitted")}</TableHead>
                      <TableHead className="text-right">{t("dashboard:partner.recent.action")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentApplications.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.program}</TableCell>
                        <TableCell>{item.citizenship || t("labels.unknown")}</TableCell>
                        <TableCell>
                          {item.submittedAt
                            ? formatLocaleDate(item.submittedAt)
                            : t("labels.unknown")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openSubmissions(item.id)}>
                            {t("actions.view")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard:partner.alerts.title")}</CardTitle>
              <CardDescription>{t("dashboard:partner.alerts.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  {isInitialLoading ? t("dashboard:partner.alerts.loading") : t("dashboard:partner.alerts.empty")}
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-lg border p-3 ${notification.read ? "bg-background" : "bg-accent/40"}`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{notification.type || t("dashboard:partner.alerts.alert")}</span>
                      </div>
                      {!notification.read ? <Badge variant="secondary">{t("dashboard:partner.alerts.new")}</Badge> : null}
                    </div>
                    <p className="text-sm">{notification.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{notification.time}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
