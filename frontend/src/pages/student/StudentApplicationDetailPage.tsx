import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, CheckCircle2 } from "lucide-react";
import { fetchStudentApplication } from "../../services/client/applicationsService";
import { fetchUniversityById } from "../../services/client/universitiesService";
import type { StudentApplication } from "../../types/domain";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/PageState";
import { routes } from "../../routes/routeConfig";

function prettyLabel(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">Not provided</span>;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <span>{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground">No items</span>;
    }

    const isPrimitive = value.every(
      (item) => item === null || ["string", "number", "boolean"].includes(typeof item),
    );

    if (isPrimitive) {
      return (
        <div className="flex flex-wrap gap-2">
          {value.map((item, index) => (
            <Badge key={`item-${index}`} variant="secondary">
              {String(item)}
            </Badge>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={`obj-${index}`} className="rounded-md border p-3">
            {renderValue(item)}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length) {
      return <span className="text-muted-foreground">No data</span>;
    }

    return (
      <div className="space-y-3 rounded-md border p-3 bg-muted/10">
        {entries.map(([key, nested]) => (
          <div key={key}>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{prettyLabel(key)}</div>
            <div className="text-sm">{renderValue(nested)}</div>
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(value)}</span>;
}

export function StudentApplicationDetailPage() {
  const { universityId = "", cycle = "" } = useParams();
  const [application, setApplication] = useState<StudentApplication | null>(null);
  const [universityName, setUniversityName] = useState<string>("University");
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load application");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [universityId, cycle]);

  const entries = useMemo(() => Object.entries(application?.data ?? {}), [application?.data]);

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
            <span>{universityName}</span>
            <Badge variant="secondary" className="capitalize">
              {application.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Application Cycle</div>
              <div className="font-medium">{application.applicationCycle}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">University ID</div>
              <div className="font-medium break-all">{application.universityId}</div>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submitted Information</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submitted information available.</p>
          ) : (
            <div className="space-y-4">
              {entries.map(([key, value]) => (
                <div key={key} className="rounded-lg border p-4">
                  <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{prettyLabel(key)}</div>
                  <div className="text-sm">{renderValue(value)}</div>
                </div>
              ))}
            </div>
          )}
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
    </div>
  );
}
