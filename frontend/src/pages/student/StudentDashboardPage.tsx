import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Target,
  TrendingUp,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/PageState";
import { useStudentDashboardData } from "../../hooks/useStudentDashboardData";
import { routes } from "../../routes/routeConfig";

function calculateReadiness(completedSteps: number): number {
  if (completedSteps >= 3) {
    return 100;
  }
  return Math.round((completedSteps / 3) * 100);
}

export function StudentDashboardPage() {
  const { profile, applications, favoritesCount, testScoresCount, loading, error, reload } = useStudentDashboardData();

  if (loading) {
    return <LoadingState label="Loading student dashboard..." />;
  }
  if (error) {
    return <ErrorState message={error} onRetry={() => void reload()} />;
  }
  if (!profile) {
    return (
      <EmptyState
        title="No profile found"
        description="Sign in again to load your student profile."
      />
    );
  }

  const draftCount = applications.filter((item) => item.status === "draft").length;
  const submittedCount = applications.filter((item) => item.status !== "draft").length;
  const basicInfoComplete = Boolean(profile.firstName && profile.lastName);
  const applicationProfileComplete = applications.length > 0;
  const testScoresComplete = testScoresCount > 0;
  const completedSteps = [basicInfoComplete, applicationProfileComplete, testScoresComplete].filter(Boolean).length;
  const readiness = calculateReadiness(completedSteps);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section>
        <h1 className="text-3xl font-semibold sm:text-4xl">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back! Here&apos;s your application overview
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 flex items-start justify-between">
              <div className="rounded-lg bg-accent p-2">
                <Target className="h-4 w-4 text-accent-foreground" />
              </div>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-3xl font-semibold">{favoritesCount}</div>
            <p className="text-xs text-muted-foreground">Universities Shortlisted</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 rounded-lg bg-accent p-2 w-fit">
              <FileText className="h-4 w-4 text-accent-foreground" />
            </div>
            <div className="text-3xl font-semibold">{draftCount}</div>
            <p className="text-xs text-muted-foreground">Applications In Progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 rounded-lg bg-accent p-2 w-fit">
              <CheckCircle2 className="h-4 w-4 text-accent-foreground" />
            </div>
            <div className="text-3xl font-semibold">{submittedCount}</div>
            <p className="text-xs text-muted-foreground">Applications Submitted</p>
          </CardContent>
        </Card>

        <Card className="border-[#4F46E5]/20 bg-gradient-to-br from-[#4F46E5]/5 to-background">
          <CardContent className="pt-6">
            <Badge className="mb-3 bg-[#4F46E5]/10 text-[#4F46E5]" variant="secondary">
              Credits
            </Badge>
            <div className="text-3xl font-semibold">N/A</div>
            <p className="text-xs text-muted-foreground">Application Credits</p>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Profile Readiness</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Complete your profile for better matches
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-semibold text-[#4F46E5]">{readiness}%</div>
                <div className="text-xs text-muted-foreground">Complete</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {readiness < 100 ? (
              <Progress value={readiness} className="h-2" />
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                <span>Profile complete</span>
              </div>
            )}
            <div className="space-y-2">
              <div className={`flex flex-wrap items-center gap-3 rounded-lg p-3 ${basicInfoComplete ? "bg-accent/50" : "border-2 border-dashed"}`}>
                {basicInfoComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="flex-1 text-sm font-medium">Basic Information</div>
                <Badge variant="secondary">{basicInfoComplete ? "Complete" : "Pending"}</Badge>
              </div>
              <div className={`flex flex-wrap items-center gap-3 rounded-lg p-3 ${applicationProfileComplete ? "bg-accent/50" : "border-2 border-dashed"}`}>
                {applicationProfileComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="flex-1 text-sm font-medium">Application Profile</div>
                <Badge variant="secondary">{applicationProfileComplete ? "Complete" : "Pending"}</Badge>
              </div>
              <div className={`flex flex-wrap items-center gap-3 rounded-lg p-3 ${testScoresComplete ? "bg-accent/50" : "border-2 border-dashed"}`}>
                {testScoresComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Test Scores</p>
                  {!testScoresComplete ? (
                    <p className="text-xs text-muted-foreground">Add IELTS, TOEFL, or GRE scores</p>
                  ) : null}
                </div>
                {testScoresComplete ? (
                  <Badge variant="secondary">Complete</Badge>
                ) : (
                  <Link to={routes.student.settings}>
                    <Button size="sm" variant="ghost">
                      Add <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to={routes.student.universities} className="block">
              <Button className="w-full justify-start" variant="outline">
                <Target className="mr-2 h-4 w-4" />
                Find More Universities
              </Button>
            </Link>
            <Link to={routes.student.compare} className="block">
              <Button className="w-full justify-start" variant="outline">
                <TrendingUp className="mr-2 h-4 w-4" />
                Compare Options
              </Button>
            </Link>
            <Link to={routes.student.applications} className="block">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                View Applications
              </Button>
            </Link>
            <Link to={routes.student.billing} className="block">
              <Button className="w-full justify-start" variant="outline">
                Get More Credits
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {applications.length === 0 ? (
            <EmptyState
              title="No applications yet"
              description="Start by choosing a university and creating your first draft."
            />
          ) : (
            applications.slice(0, 6).map((item) => {
              const draftHref =
                `${routes.student.applicationCreate(item.universityId)}?mode=draft&cycle=${encodeURIComponent(item.applicationCycle)}`;
              const openHref =
                item.status === "draft"
                  ? draftHref
                  : routes.student.applicationDetail(item.universityId, item.applicationCycle);
              return (
              <div
                key={`${item.universityId}-${item.applicationCycle}`}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium">{item.universityName}</div>
                  <div className="text-xs text-muted-foreground">
                    Cycle {item.applicationCycle}
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <Badge variant="secondary" className="capitalize">
                    {item.status}
                  </Badge>
                  <Link to={openHref}>
                    <Button size="sm" variant="outline" className="w-full sm:w-auto">
                      {item.status === "draft" ? "Open draft" : "Open"}
                    </Button>
                  </Link>
                </div>
              </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
