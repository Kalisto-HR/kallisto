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
import { translateRegionCode } from "../../i18n/regions";

interface PortalDashboardProps {
  onNavigate?: (page: string) => void;
}

type ContactAction = "copy" | "csv";

const originColors = ["#2563eb", "#16a34a", "#f97316", "#9333ea", "#dc2626", "#0f766e", "#64748b"];
const genderColors = ["#2563eb", "#e11d48", "#9333ea", "#64748b"];

function formatPercentage(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

function buildOriginChartRows(stats: PartnerStudentOriginStat[]) {
  const filtered = stats.filter((item) => item.count > 0);
  return filtered.map((item, index) => ({
    ...item,
    fill: originColors[index % originColors.length],
  }));
}

export function PortalDashboard({ onNavigate }: PortalDashboardProps) {
  const { t } = useTranslation(["dashboard", "common"]);
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
            ? `No ${stage} emails are available yet.`
            : `Copied ${copiedCount} ${stage} ${copiedCount === 1 ? "email" : "emails"}.`,
        );
      } else {
        downloadPartnerContactsCsv(stage, contacts);
        setContactMessage(`Downloaded ${contacts.length} ${stage} ${contacts.length === 1 ? "contact" : "contacts"}.`);
      }
    } catch (err) {
      setContactError(err instanceof Error ? err.message : `Failed to load ${stage} contacts`);
    } finally {
      setContactLoading(null);
    }
  };

  const stats = [
    {
      title: "New Submissions",
      value: String(data?.newApplications ?? 0),
      caption: "Last 7 days",
      icon: FileText,
    },
    {
      title: "Total Submissions",
      value: String(data?.totalApplicants ?? 0),
      caption: "All submitted applications",
      icon: Users,
    },
    {
      title: "Suspects",
      value: String(data?.suspectsCount ?? 0),
      caption: "Basket-only interest",
      icon: UserPlus,
      contactStage: "suspect" as const,
    },
    {
      title: "Prospects",
      value: String(data?.prospectsCount ?? 0),
      caption: "Draft applications",
      icon: Mail,
      contactStage: "prospect" as const,
    },
    {
      title: "Average SAT",
      value: String(data?.avgSAT ?? 0),
      caption: "Applicant-reported score",
      icon: Award,
    },
    {
      title: "Average IELTS",
      value: (data?.avgIELTS ?? 0).toFixed(1),
      caption: "Applicant-reported score",
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
      label: "Male",
      count: maleCount,
      percentage: totalApplicants > 0 ? Math.round((maleCount / totalApplicants) * 1000) / 10 : 0,
      fill: genderColors[0],
    },
    {
      label: "Female",
      count: femaleCount,
      percentage: totalApplicants > 0 ? Math.round((femaleCount / totalApplicants) * 1000) / 10 : 0,
      fill: genderColors[1],
    },
    {
      label: "Non-binary",
      count: nonBinaryCount,
      percentage: totalApplicants > 0 ? Math.round((nonBinaryCount / totalApplicants) * 1000) / 10 : 0,
      fill: genderColors[2],
    },
    {
      label: "Prefer not to say",
      count: preferNotToSayCount,
      percentage: totalApplicants > 0 ? Math.round((preferNotToSayCount / totalApplicants) * 1000) / 10 : 0,
      fill: genderColors[3],
    },
  ], [femaleCount, maleCount, nonBinaryCount, preferNotToSayCount, totalApplicants]);
  const genderChartRows = useMemo(
    () => genderDistribution.filter((item) => item.count > 0),
    [genderDistribution],
  );
  const originRows = useMemo(
    () => buildOriginChartRows(data?.studentOriginStats ?? []).map((row) => ({
      ...row,
      country: translateRegionCode(t, row.country),
    })),
    [data?.studentOriginStats, t],
  );
  const originChartConfig = useMemo<ChartConfig>(() => {
    return originRows.reduce<ChartConfig>((config, row) => {
      config[row.country] = { label: row.country, color: row.fill };
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
            <h1 className="text-3xl font-semibold">Partner Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              Monitor submitted applications, applicant mix, and early-stage student interest.
            </p>
          </div>
          <Button className="w-full md:w-auto" onClick={() => openSubmissions()}>
            View submissions
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
                  <div className="text-3xl font-semibold">{isInitialLoading ? "..." : stat.value}</div>
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
                        {contactLoading === `${contactStage}:copy` ? "Copying" : "Copy emails"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        disabled={contactLoading === `${contactStage}:csv`}
                        onClick={() => void handleContactAction(contactStage, "csv")}
                      >
                        <Download className="h-4 w-4" />
                        {contactLoading === `${contactStage}:csv` ? "Exporting" : "CSV"}
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
                <CardTitle>{t("partner.studentOrigin.title")}</CardTitle>
              </div>
              <CardDescription>{t("partner.studentOrigin.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isInitialLoading ? (
                <p className="text-sm text-muted-foreground">{t("partner.studentOrigin.loading")}</p>
              ) : originRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("partner.studentOrigin.empty")}</p>
              ) : (
                <div className="grid gap-6 min-[1180px]:grid-cols-[minmax(200px,0.9fr)_minmax(0,1fr)] min-[1180px]:items-center">
                  <ChartContainer config={originChartConfig} className="h-[280px] w-full aspect-auto">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="country" hideLabel />} />
                      <Pie
                        data={originRows}
                        dataKey="count"
                        nameKey="country"
                        innerRadius={58}
                        outerRadius={96}
                        paddingAngle={0}
                        stroke="none"
                      >
                        {originRows.map((row) => (
                          <Cell key={row.country} fill={row.fill} stroke="none" />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="max-h-[280px] min-w-0 space-y-4 overflow-y-auto pr-2">
                    {originRows.map((row) => (
                      <div key={row.country} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                        <div className="min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: row.fill }} />
                            <p className="truncate text-sm font-medium">{row.country}</p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t("partner.studentOrigin.student", { count: row.count })}
                          </p>
                        </div>
                        <p className="whitespace-nowrap text-right text-sm font-semibold">{formatPercentage(row.percentage)}%</p>
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
                <CardTitle>Gender Distribution</CardTitle>
              </div>
              <CardDescription>Based on submitted applicant profiles for this university.</CardDescription>
            </CardHeader>
            <CardContent>
              {isInitialLoading ? (
                <p className="text-sm text-muted-foreground">Loading gender distribution...</p>
              ) : totalApplicants === 0 ? (
                <p className="text-sm text-muted-foreground">No submitted applicants are available yet.</p>
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
                              {item.count} {item.count === 1 ? "applicant" : "applicants"}
                            </p>
                          </div>
                          <p className="whitespace-nowrap text-right text-sm font-semibold">{formatPercentage(item.percentage)}%</p>
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
                  <CardTitle>Recent Submissions</CardTitle>
                  <CardDescription>Read-only visibility into the latest submitted applications.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => openSubmissions()}>
                  Open submissions
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentApplications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {isInitialLoading ? "Loading submission activity..." : "No submissions available yet."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Citizenship</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentApplications.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.program}</TableCell>
                        <TableCell>{item.citizenship || "Unknown"}</TableCell>
                        <TableCell>
                          {item.submittedAt
                            ? new Date(item.submittedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                            : "Unknown"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openSubmissions(item.id)}>
                            View
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
              <CardTitle>Submission Alerts</CardTitle>
              <CardDescription>Recent automated notifications from submission activity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.length === 0 ? (
                <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  {isInitialLoading ? "Loading alerts..." : "No alerts right now."}
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
                        <span className="text-sm font-medium">{notification.type || "Alert"}</span>
                      </div>
                      {!notification.read ? <Badge variant="secondary">New</Badge> : null}
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
