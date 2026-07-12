import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Lightbulb, TrendingUp } from "lucide-react";
import type { FitScoreResult } from "../../types/domain";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Progress } from "../ui/progress";
import { Skeleton } from "../ui/skeleton";

interface KallistoMatchScoreCardProps {
  score: FitScoreResult | null;
  loading?: boolean;
  error?: string | null;
  improveHref?: string;
}

const breakdownRows: Array<{ key: keyof FitScoreResult["breakdown"]; label: string }> = [
  { key: "academicScore", label: "Academic Fit" },
  { key: "languageScore", label: "Language Fit" },
  { key: "majorScore", label: "Major Fit" },
  { key: "budgetScore", label: "Budget Fit" },
  { key: "documentScore", label: "Document Readiness" },
  { key: "deadlineScore", label: "Deadline Risk" },
];

export function KallistoMatchScoreCard({
  score,
  loading = false,
  error = null,
  improveHref,
}: KallistoMatchScoreCardProps) {
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
    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Kallisto Match Score
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-amber-800">{error}</CardContent>
      </Card>
    );
  }

  if (!score) {
    return null;
  }

  return (
    <Card className="overflow-hidden border-primary/20 shadow-[0_24px_60px_-42px_rgba(20,90,67,0.75)]">
      <CardHeader className="space-y-3 border-b border-slate-100 bg-gradient-to-br from-white to-primary/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <TrendingUp className="h-5 w-5 text-primary" />
              Kallisto Match Score
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Deterministic estimate based on your available profile and this program.
            </p>
          </div>
          <Badge className="w-fit bg-primary text-primary-foreground">{score.label}</Badge>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-semibold tracking-normal text-slate-950">{score.finalScore}</span>
            <span className="text-lg font-medium text-muted-foreground">/100</span>
          </div>
          <div className="w-full sm:max-w-sm">
            <Progress value={score.finalScore} className="h-3" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="grid gap-3 md:grid-cols-2">
          {breakdownRows.map((row) => {
            const value = score.breakdown[row.key];
            return (
              <div key={row.key} className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-slate-900">{row.label}</span>
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
              Why this score
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {score.reasons.slice(0, 5).map((reason) => (
                <li key={reason} className="rounded-lg bg-slate-50 px-3 py-2">{reason}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Lightbulb className="h-4 w-4 text-primary" />
              Improve My Score
            </h3>
            {improveHref ? (
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                <Link to={improveHref}>Improve My Score</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                Improve My Score
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
              Your available profile already matches the main published requirements well.
            </p>
          )}
        </section>

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          Fit Score is an estimate based on available profile and program data. It does not guarantee admission or scholarship results.
        </p>
      </CardContent>
    </Card>
  );
}
