import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { fetchStudentApplication } from "../../services/client/applicationsService";
import { fetchUniversityById } from "../../services/client/universitiesService";
import type { StudentApplication } from "../../types/domain";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/PageState";
import { SubmittedApplicationDataView } from "../../components/student/SubmittedApplicationDataView";
import { routes } from "../../routes/routeConfig";

function formatDateTime(value: string | null): string {
  if (!value) {
    return "N/A";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function StudentApplicationDetailPage() {
  const { universityId = "", cycle = "" } = useParams();
  const [application, setApplication] = useState<StudentApplication | null>(null);
  const [universityName, setUniversityName] = useState<string>("University");
  const [applicationSchema, setApplicationSchema] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [appData, university] = await Promise.all([
          fetchStudentApplication(universityId, cycle),
          fetchUniversityById(universityId).catch(() => null),
        ]);
        setApplication(appData);
        if (university?.name) {
          setUniversityName(university.name);
        }
        setApplicationSchema(university?.applicationSchema ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load application");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [universityId, cycle]);

  if (loading) return <LoadingState label="Loading application..." />;
  if (error) return <ErrorState message={error} />;
  if (!application) {
    return <EmptyState title="Not found" description="Application could not be found." />;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to={routes.student.applications}>
        <Button variant="ghost" size="sm" className="w-full justify-start sm:w-auto">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to applications
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{universityName}</span>
            <Badge variant="secondary" className="capitalize">
              {application.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Application Cycle</div>
              <div className="font-medium">{application.applicationCycle}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Created</div>
              <div className="flex items-center gap-1.5 font-medium">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {formatDateTime(application.createdAt)}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Submitted</div>
              <div className="font-medium">{application.submittedAt ? formatDateTime(application.submittedAt) : "Not submitted"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Application Details</CardTitle>
        </CardHeader>
        <CardContent>
          <SubmittedApplicationDataView data={application.data} applicationSchema={applicationSchema} />
        </CardContent>
      </Card>

      {application.status === "submitted" ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-700">Application submitted successfully</p>
                <p className="text-sm text-muted-foreground">Your application is currently in review.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {application.status === "accepted" ? (
        <Card className="border-green-200 bg-green-50/70">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-700">Application accepted</p>
                <p className="text-sm text-muted-foreground">This university has marked your application as accepted.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {application.status === "rejected" ? (
        <Card className="border-red-200 bg-red-50/70">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <XCircle className="mt-0.5 h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-700">Application not accepted</p>
                <p className="text-sm text-muted-foreground">This university has marked your application as rejected.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
