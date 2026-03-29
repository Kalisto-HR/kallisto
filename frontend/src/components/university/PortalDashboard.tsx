import { Award, Bell, FileText, TrendingUp, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { routes } from "../../routes/routeConfig";
import { usePartnerDashboardData } from "../../hooks/usePartnerDashboardData";

interface PortalDashboardProps {
  onNavigate?: (page: string) => void;
}

export function PortalDashboard({ onNavigate }: PortalDashboardProps) {
  const { universityId } = useParams();
  const navigate = useNavigate();
  const { data, loading, error } = usePartnerDashboardData(universityId);
  const submissionsRoute = universityId ? routes.partner.applications(universityId) : null;

  const openSubmissions = (applicationId?: string) => {
    if (submissionsRoute) {
      const suffix = applicationId ? `?applicationId=${encodeURIComponent(applicationId)}` : "";
      void navigate(`${submissionsRoute}${suffix}`);
      return;
    }
    onNavigate?.("partner-applications");
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Partner Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              Monitor submitted applications, applicant mix, and your university profile activity.
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

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-semibold">{loading ? "..." : stat.value}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.caption}</p>
                </CardContent>
              </Card>
            );
          })}
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
                  {loading ? "Loading submission activity..." : "No submissions available yet."}
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
                  {loading ? "Loading alerts..." : "No alerts right now."}
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
