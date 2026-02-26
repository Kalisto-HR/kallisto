import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, FileText } from "lucide-react";
import { fetchStudentApplication } from "../../services/client/applicationsService";
import type { StudentApplication } from "../../types/domain";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/PageState";
import { routes } from "../../routes/routeConfig";

export function StudentApplicationDetailPage() {
  const { universityId = "", cycle = "" } = useParams();
  const [application, setApplication] = useState<StudentApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchStudentApplication(universityId, cycle);
        setApplication(data);
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
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to applications
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Application Detail</span>
            <Badge variant="secondary" className="capitalize">
              {application.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">University</div>
              <div className="font-medium">{application.universityId}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Cycle</div>
              <div className="font-medium">{application.applicationCycle}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Created</div>
              <div className="flex items-center gap-1.5 font-medium">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {application.createdAt || "N/A"}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Submitted</div>
              <div className="font-medium">{application.submittedAt || "Not submitted"}</div>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              Payload
            </div>
            <pre className="overflow-auto text-xs">{JSON.stringify(application.data ?? {}, null, 2)}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
