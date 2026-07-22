import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, CheckCircle2, CircleAlert, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchApplicantApplication } from "../../services/applicant/applicationsService";
import { fetchUniversityById } from "../../services/applicant/universitiesService";
import type { ApplicantApplication } from "../../types/domain";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/PageState";
import { SubmittedApplicationDataView } from "../../components/applicant/SubmittedApplicationDataView";
import { routes } from "../../routes/routeConfig";
import { getApplicationStageLabel, getApplicationStatusBadgeVariant, getApplicationStatusLabel } from "../../utils/applicationStatus";

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

export function ApplicantApplicationDetailPage() {
  const { t } = useTranslation(["common", "applications"]);
  const { universityId = "", cycle = "" } = useParams();
  const [application, setApplication] = useState<ApplicantApplication | null>(null);
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
          fetchApplicantApplication(universityId, cycle),
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
      <Link to={routes.applicant.applications}>
        <Button variant="ghost" size="sm" className="w-full justify-start sm:w-auto">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to applications
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{universityName}</span>
            <Badge variant={getApplicationStatusBadgeVariant(application.status)}>
              {getApplicationStatusLabel(t, application.status)}
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
          <CardTitle className="text-base">{t("applications:tracking.progressTitle", { defaultValue: "Application Status" })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium">{getApplicationStageLabel(t, application.statusStage)}</p>
              <p className="text-sm text-muted-foreground">
                {getApplicationStatusLabel(t, application.status)}
              </p>
            </div>
            <div className="text-sm font-semibold">{application.statusProgress}%</div>
          </div>
          <Progress value={application.statusProgress} className="h-2" />
          {application.status === "additional_information_required" ? (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <CircleAlert className="mt-0.5 h-4 w-4" />
              <span>{t("applications:tracking.additionalInfo", { defaultValue: "The university needs additional information. Check your requested tasks and documents." })}</span>
            </div>
          ) : application.isFinal ? (
            <div className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${application.isSuccessfulOutcome ? "border-green-200 bg-green-50 text-green-800" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
              <CheckCircle2 className="mt-0.5 h-4 w-4" />
              <span>{t("applications:tracking.finalDecision", { defaultValue: "The university has recorded a final decision for this application." })}</span>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border p-3 text-sm text-muted-foreground">
              <Clock className="mt-0.5 h-4 w-4" />
              <span>{t("applications:tracking.inProgress", { defaultValue: "Your application is moving through the university review process." })}</span>
            </div>
          )}
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
                <p className="text-sm text-muted-foreground">
                  Your application has been locked for editing and shared with the university.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
