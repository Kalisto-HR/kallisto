import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, FileText, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { deleteApplicantApplicationDraft, fetchApplicantApplications } from "../../services/applicant/applicationsService";
import type { ApplicantApplicationListItem } from "../../types/domain";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/PageState";
import { routes } from "../../routes/routeConfig";
import { getApplicationStatusBadgeVariant, getApplicationStatusLabel } from "../../utils/applicationStatus";

export function ApplicantApplicationsPage() {
  const { t } = useTranslation(["common", "applications"]);
  const [items, setItems] = useState<ApplicantApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftToDelete, setDraftToDelete] = useState<ApplicantApplicationListItem | null>(null);
  const [deletingDraft, setDeletingDraft] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchApplicantApplications());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("applicantFlow.applications.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const deleteDraft = async () => {
    if (!draftToDelete) {
      return;
    }

    setDeletingDraft(true);
    setError(null);
    try {
      await deleteApplicantApplicationDraft(draftToDelete.universityId, draftToDelete.applicationCycle);
      setItems((current) =>
        current.filter(
          (item) =>
            item.universityId !== draftToDelete.universityId ||
            item.applicationCycle !== draftToDelete.applicationCycle,
        ),
      );
      setDraftToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("applicantFlow.applications.deleteFailed"));
    } finally {
      setDeletingDraft(false);
    }
  };

  const summary = useMemo(
    () => ({
      total: items.length,
      drafts: items.filter((item) => item.status === "draft").length,
      submitted: items.filter((item) => item.status !== "draft").length,
    }),
    [items],
  );

  if (loading) return <LoadingState label={t("applicantFlow.applications.loading")} />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!items.length) {
    return (
      <EmptyState
        title={t("applicantFlow.applications.emptyTitle")}
        description={t("applicantFlow.applications.emptyDescription")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-3xl font-semibold">{t("applications:tracking.title", { defaultValue: "My Applications" })}</h1>
        <p className="text-muted-foreground">{t("applications:tracking.description", { defaultValue: "Track draft and submitted applications in one place." })}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-semibold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">{t("applications:tracking.total", { defaultValue: "Total Applications" })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-semibold">{summary.drafts}</div>
            <p className="text-xs text-muted-foreground">{getApplicationStatusLabel(t, "draft")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-semibold">{summary.submitted}</div>
            <p className="text-xs text-muted-foreground">{getApplicationStatusLabel(t, "submitted")}</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        {items.map((item) => {
          const draftHref =
            `${routes.applicant.applicationCreate(item.universityId)}?mode=draft&cycle=${encodeURIComponent(item.applicationCycle)}`;
          const openHref =
            item.status === "draft"
              ? draftHref
              : routes.applicant.applicationDetail(item.universityId, item.applicationCycle);
          return (
            <Card key={`${item.universityId}-${item.applicationCycle}`}>
            <CardHeader>
              <CardTitle className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>{item.universityName}</span>
                <Badge variant={getApplicationStatusBadgeVariant(item.status)}>
                  {getApplicationStatusLabel(t, item.status)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-4">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {t("applicantFlow.applications.cycle", { cycle: item.applicationCycle })}
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {t("applicantFlow.applications.created", { date: item.createdAt || t("applicantFlow.applications.createdFallback") })}
                </span>
              </div>
              {item.status === "draft" ? (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Link to={openHref}>
                    <Button size="sm" variant="outline" className="w-full sm:w-auto">
                      {t("applicantFlow.applications.openDraft")}
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 sm:w-auto"
                    onClick={() => setDraftToDelete(item)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("applicantFlow.applications.deleteDraft")}
                  </Button>
                </div>
              ) : (
                <Link to={openHref}>
                  <Button size="sm" variant="outline" className="w-full sm:w-auto">
                    {t("applicantFlow.applications.open")}
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
          );
        })}
      </section>

      <AlertDialog open={draftToDelete !== null} onOpenChange={(open) => {
        if (!open && !deletingDraft) {
          setDraftToDelete(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("applicantFlow.applications.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("applicantFlow.applications.deleteDescription", {
                university: draftToDelete?.universityName ?? t("applicantFlow.applications.deleteFallback"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingDraft}>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingDraft}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void deleteDraft();
              }}
            >
              {deletingDraft ? t("applicantFlow.applications.deleting") : t("applicantFlow.applications.deleteDraft")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
