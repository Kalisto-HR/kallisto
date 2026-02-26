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

function calculateReadiness(firstName: string, lastName: string, applicationsCount: number): number {
  let score = 25;
  if (firstName) score += 25;
  if (lastName) score += 25;
  if (applicationsCount > 0) score += 25;
  return Math.min(score, 100);
}

export function StudentDashboardPage() {
  const { profile, applications, favoritesCount, loading, error, reload } = useStudentDashboardData();

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
  const submittedCount = applications.filter((item) => item.status === "submitted").length;
  const readiness = calculateReadiness(profile.firstName, profile.lastName, applications.length);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section>
        <h1 className="text-4xl font-semibold">Dashboard</h1>
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
            <div className="flex items-start justify-between">
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
            <Progress value={readiness} className="h-2" />
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-lg bg-accent/50 p-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div className="flex-1 text-sm font-medium">Basic Information</div>
                <Badge variant="secondary">Complete</Badge>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-accent/50 p-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div className="flex-1 text-sm font-medium">Application Profile</div>
                <Badge variant="secondary">{applications.length > 0 ? "Complete" : "Pending"}</Badge>
              </div>
              <div className="flex items-center gap-3 rounded-lg border-2 border-dashed p-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Test Scores</p>
                  <p className="text-xs text-muted-foreground">Add IELTS, TOEFL, or GRE scores</p>
                </div>
                <Link to={routes.student.settings}>
                  <Button size="sm" variant="ghost">
                    Add <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
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
            applications.slice(0, 6).map((item) => (
              <div
                key={`${item.universityId}-${item.applicationCycle}`}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <div className="font-medium">{item.universityName}</div>
                  <div className="text-xs text-muted-foreground">
                    Cycle {item.applicationCycle}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {item.status}
                  </Badge>
                  <Link to={routes.student.applicationDetail(item.universityId, item.applicationCycle)}>
                    <Button size="sm" variant="outline">
                      Open
                    </Button>
                  </Link>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
