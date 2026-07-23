import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Target,
  TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/PageState";
import { useApplicantDashboardData } from "../../hooks/useApplicantDashboardData";
import { routes } from "../../routes/routeConfig";
import { getApplicationStatusBadgeVariant, getApplicationStatusLabel } from "../../utils/applicationStatus";
import { getApplicantProfileCompletion } from "../../utils/applicantProfileCompletion";

const REQUIRED_PROFILE_FIELD_COUNT = 13;

export function ApplicantDashboardPage() {
  const { t } = useTranslation(["common"]);
  const { profile, applications, favoritesCount, testScoresCount, billingSummary, loading, error, reload } = useApplicantDashboardData();

  if (loading) {
    return <LoadingState label={t("applicantFlow.dashboard.loading")} />;
  }
  if (error) {
    return <ErrorState message={error} onRetry={() => void reload()} />;
  }
  if (!profile) {
    return (
      <EmptyState
        title={t("applicantFlow.dashboard.noProfileTitle")}
        description={t("applicantFlow.dashboard.noProfileDescription")}
      />
    );
  }

  const draftCount = applications.filter((item) => item.status === "draft").length;
  const submittedCount = applications.filter((item) => item.status !== "draft").length;
  const profileCompletion = getApplicantProfileCompletion(profile);
  const missingRequiredCount = profileCompletion.missing.length;
  const readiness = Math.max(
    0,
    Math.round(((REQUIRED_PROFILE_FIELD_COUNT - missingRequiredCount) / REQUIRED_PROFILE_FIELD_COUNT) * 100),
  );
  const basicInfoComplete = !profileCompletion.missing.some((item) =>
    ["last name", "first name", "gender", "date of birth", "region", "district or city"].includes(item),
  );
  const applicationProfileComplete = !profileCompletion.missing.some((item) =>
    ["GPA", "GPA scale", "intended major", "budget per year", "preferred language", "preferred city"].includes(item),
  );
  const documentsComplete = !profileCompletion.missing.includes("documents readiness");
  const testScoresComplete = testScoresCount > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section>
        <h1 className="text-3xl font-semibold sm:text-4xl">{t("applicantFlow.dashboard.title")}</h1>
        <p className="mt-1 text-muted-foreground">
          {t("applicantFlow.dashboard.subtitle")}
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
            <p className="text-xs text-muted-foreground">{t("applicantFlow.dashboard.shortlisted")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 rounded-lg bg-accent p-2 w-fit">
              <FileText className="h-4 w-4 text-accent-foreground" />
            </div>
            <div className="text-3xl font-semibold">{draftCount}</div>
            <p className="text-xs text-muted-foreground">{t("applicantFlow.dashboard.drafts")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-2 rounded-lg bg-accent p-2 w-fit">
              <CheckCircle2 className="h-4 w-4 text-accent-foreground" />
            </div>
            <div className="text-3xl font-semibold">{submittedCount}</div>
            <p className="text-xs text-muted-foreground">{t("applicantFlow.dashboard.submitted")}</p>
          </CardContent>
        </Card>

        <Card className="brand-panel-accent">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-start justify-between">
              <div className="rounded-lg bg-accent p-2">
                <CreditCard className="h-4 w-4 text-accent-foreground" />
              </div>
              <Badge className="brand-soft-badge" variant="secondary">
                {t("billingPage.title", { defaultValue: "Billing" })}
              </Badge>
            </div>
            <div className="text-3xl font-semibold">
              {billingSummary ? billingSummary.creditBalance : "-"}
            </div>
            <p className="text-xs text-muted-foreground">{t("applicantFlow.dashboard.creditsAvailable")}</p>
            <Link to={routes.applicant.billing} className="mt-3 inline-flex text-xs font-medium text-primary">
              {t("applicantFlow.dashboard.buyCredits")} <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>{t("applicantFlow.dashboard.readinessTitle")}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t("applicantFlow.dashboard.readinessDescription")}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-semibold text-primary">{readiness}%</div>
                <div className="text-xs text-muted-foreground">{t("applicantFlow.dashboard.complete")}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {readiness < 100 ? (
              <Progress value={readiness} className="h-2" />
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                <span>{t("applicantFlow.dashboard.profileComplete")}</span>
              </div>
            )}
            <div className="space-y-2">
              <div className={`flex flex-wrap items-center gap-3 rounded-lg p-3 ${basicInfoComplete ? "bg-accent/50" : "border-2 border-dashed"}`}>
                {basicInfoComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="flex-1 text-sm font-medium">{t("applicantFlow.dashboard.basicInformation")}</div>
                <Badge variant="secondary">{basicInfoComplete ? t("applicantFlow.dashboard.complete") : t("applicantFlow.dashboard.pending")}</Badge>
              </div>
              <div className={`flex flex-wrap items-center gap-3 rounded-lg p-3 ${applicationProfileComplete ? "bg-accent/50" : "border-2 border-dashed"}`}>
                {applicationProfileComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="flex-1 text-sm font-medium">{t("applicantFlow.dashboard.applicationProfile")}</div>
                <Badge variant="secondary">{applicationProfileComplete ? t("applicantFlow.dashboard.complete") : t("applicantFlow.dashboard.pending")}</Badge>
              </div>
              <div className={`flex flex-wrap items-center gap-3 rounded-lg p-3 ${documentsComplete ? "bg-accent/50" : "border-2 border-dashed"}`}>
                {documentsComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t("applicantFlow.dashboard.documentReadiness")}</p>
                  {!documentsComplete ? (
                    <p className="text-xs text-muted-foreground">{t("applicantFlow.dashboard.documentReadinessHelp")}</p>
                  ) : null}
                </div>
                {documentsComplete ? (
                  <Badge variant="secondary">{t("applicantFlow.dashboard.complete")}</Badge>
                ) : (
                  <Link to={`${routes.applicant.settings}?tab=match-profile`}>
                    <Button size="sm" variant="ghost">
                      {t("applicantFlow.dashboard.update")} <ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
              <div className={`flex flex-wrap items-center gap-3 rounded-lg p-3 ${testScoresComplete ? "bg-accent/50" : "border-2 border-dashed"}`}>
                {testScoresComplete ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{t("applicantFlow.dashboard.testScores")}</p>
                  {!testScoresComplete ? (
                    <p className="text-xs text-muted-foreground">{t("applicantFlow.dashboard.testScoresHelp")}</p>
                  ) : null}
                </div>
                <Link to={routes.applicant.settings}>
                  <Button size="sm" variant="ghost">
                    {testScoresComplete ? t("applicantFlow.dashboard.manage") : t("applicantFlow.dashboard.add")} <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("applicantFlow.dashboard.quickActions")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to={routes.applicant.universities} className="block">
              <Button className="w-full justify-start" variant="outline">
                <Target className="mr-2 h-4 w-4" />
                {t("applicantFlow.dashboard.findMore")}
              </Button>
            </Link>
            <Link to={routes.applicant.compare} className="block">
              <Button className="w-full justify-start" variant="outline">
                <TrendingUp className="mr-2 h-4 w-4" />
                {t("applicantFlow.dashboard.compareOptions")}
              </Button>
            </Link>
            <Link to={routes.applicant.applications} className="block">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                {t("applicantFlow.dashboard.viewApplications")}
              </Button>
            </Link>
            <Link to={routes.applicant.billing} className="block">
              <Button className="w-full justify-start" variant="outline">
                {t("billingPage.title", { defaultValue: "Billing" })}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("applicantFlow.dashboard.recentApplications")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {applications.length === 0 ? (
            <EmptyState
              title={t("applicantFlow.dashboard.noApplicationsTitle")}
              description={t("applicantFlow.dashboard.noApplicationsDescription")}
            />
          ) : (
            applications.slice(0, 6).map((item) => {
              const draftHref =
                `${routes.applicant.applicationCreate(item.universityId)}?mode=draft&cycle=${encodeURIComponent(item.applicationCycle)}`;
              const openHref =
                item.status === "draft"
                  ? draftHref
                  : routes.applicant.applicationDetail(item.universityId, item.applicationCycle);
              return (
              <div
                key={`${item.universityId}-${item.applicationCycle}`}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium">{item.universityName}</div>
                  <div className="text-xs text-muted-foreground">
                    {t("applicantFlow.dashboard.cycle", { cycle: item.applicationCycle })}
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <Badge variant={getApplicationStatusBadgeVariant(item.status)}>
                    {getApplicationStatusLabel(t, item.status)}
                  </Badge>
                  {item.status === "draft" ? (
                    <Link to={openHref}>
                      <Button size="sm" variant="outline" className="w-full sm:w-auto">
                        {t("applicantFlow.dashboard.openDraft")}
                      </Button>
                    </Link>
                  ) : (
                    <Link to={openHref}>
                      <Button size="sm" variant="outline" className="w-full sm:w-auto">
                        {t("actions.open")}
                      </Button>
                    </Link>
                  )}
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
