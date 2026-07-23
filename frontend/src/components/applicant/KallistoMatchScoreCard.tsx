import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, Lightbulb, Lock, TrendingUp } from "lucide-react";
import type { FitScoreResult } from "../../types/domain";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Skeleton } from "../ui/skeleton";
import { routes } from "../../routes/routeConfig";

interface KallistoMatchScoreCardProps {
  score: FitScoreResult | null;
  loading?: boolean;
  error?: string | null;
  improveHref?: string;
}

const breakdownRows: Array<{ key: keyof FitScoreResult["breakdown"]; labelKey: string }> = [
  { key: "academicScore", labelKey: "matchScore.breakdown.academicScore" },
  { key: "languageScore", labelKey: "matchScore.breakdown.languageScore" },
  { key: "majorScore", labelKey: "matchScore.breakdown.majorScore" },
  { key: "budgetScore", labelKey: "matchScore.breakdown.budgetScore" },
  { key: "documentScore", labelKey: "matchScore.breakdown.documentScore" },
  { key: "deadlineScore", labelKey: "matchScore.breakdown.deadlineScore" },
];

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function KallistoMatchScoreSummary({
  score,
  loading = false,
  locked = false,
  error = null,
}: {
  score: FitScoreResult | null;
  loading?: boolean;
  locked?: boolean;
  error?: string | null;
}) {
  const { t } = useTranslation("common");
  const isLocked = locked || error === "PREMIUM_REQUIRED";

  if (loading) {
    return (
      <div className="min-w-[126px] rounded-lg border border-primary/15 bg-card px-3 py-2 text-right">
        <div className="mb-1 flex items-center justify-end gap-1.5 text-xs font-semibold text-slate-900">
          <TrendingUp className="h-4 w-4 text-primary" />
          {t("matchScore.title")}
        </div>
        <Skeleton className="ml-auto h-7 w-14" />
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="min-w-[148px] rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-right">
        <div className="mb-1 flex items-center justify-end gap-1.5 text-xs font-semibold text-slate-900">
          <Lock className="h-3.5 w-3.5 text-primary" />
          {t("matchScore.title")}
        </div>
        <Button asChild size="sm" variant="link" className="h-auto p-0 text-xs">
          <Link to={routes.applicant.billing}>{t("matchScore.upgrade")}</Link>
        </Button>
      </div>
    );
  }

  if (error || !score) {
    return (
      <div className="min-w-[126px] rounded-lg border border-border bg-card px-3 py-2 text-right">
        <div className="flex items-center justify-end gap-1.5 text-xs font-semibold">
          <TrendingUp className="h-4 w-4 text-primary" />
          {t("matchScore.title")}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("matchScore.unavailable")}</p>
      </div>
    );
  }

  const finalScore = clampScore(score.finalScore);
  return (
    <div className="min-w-[126px] rounded-lg border border-primary/20 bg-card px-3 py-2 text-right">
      <div className="mb-0.5 flex items-center justify-end gap-1.5 text-xs font-semibold text-slate-900">
        <TrendingUp className="h-3.5 w-3.5 text-primary" />
        {t("matchScore.title")}
      </div>
      <div className="text-2xl font-semibold tracking-normal text-slate-950">{finalScore}%</div>
    </div>
  );
}

export function KallistoMatchScoreCard({
  score,
  loading = false,
  error = null,
  improveHref,
}: KallistoMatchScoreCardProps) {
  const { t } = useTranslation("common");

  if (loading) {
    return (
      <Card className="overflow-hidden border-primary/15">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    if (error === "PREMIUM_REQUIRED") {
      return (
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t("matchScore.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{t("matchScore.premiumRequired")}</p>
            <Button asChild>
              <Link to={routes.applicant.billing}>{t("matchScore.upgrade")}</Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            {t("matchScore.fullTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-800">{error}</CardContent>
      </Card>
    );
  }

  if (!score) {
    return null;
  }

  const finalScore = clampScore(score.finalScore);

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="space-y-3 border-b border-border/70 bg-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t("matchScore.fullTitle")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("matchScore.deterministic")}
            </p>
          </div>
          <Badge className="w-fit bg-primary text-primary-foreground">{score.label}</Badge>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold tracking-normal text-slate-950">{finalScore}</span>
            <span className="text-lg font-medium text-muted-foreground">/100</span>
          </div>
          <div className="w-full sm:max-w-sm">
            <Progress value={finalScore} className="h-3" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="grid gap-3 md:grid-cols-2">
          {breakdownRows.map((row) => {
            const value = clampScore(score.breakdown[row.key]);
            return (
              <div key={row.key} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-900">{t(row.labelKey)}</span>
                  <span className="text-sm font-semibold text-slate-900">{value}/100</span>
                </div>
                <Progress value={value} />
              </div>
            );
          })}
        </div>

        {score.reasons.length > 0 ? (
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {t("matchScore.why")}
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {score.reasons.slice(0, 5).map((reason) => (
                <li key={reason} className="rounded-lg bg-muted/60 px-3 py-2">{reason}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Lightbulb className="h-4 w-4 text-primary" />
              {t("matchScore.improve")}
            </h3>
            {improveHref ? (
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                <Link to={improveHref}>{t("matchScore.improve")}</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                {t("matchScore.improve")}
              </Button>
            )}
          </div>
          {score.recommendations.length > 0 ? (
            <ul className="space-y-2 text-sm text-muted-foreground">
              {score.recommendations.slice(0, 5).map((recommendation) => (
                <li key={recommendation} className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2">
                  {recommendation}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
              {t("matchScore.fallbackRecommendation")}
            </p>
          )}
        </section>

        <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {t("matchScore.disclaimer")}
        </p>
      </CardContent>
    </Card>
  );
}
