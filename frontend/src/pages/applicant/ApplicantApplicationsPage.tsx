import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, FileText } from "lucide-react";
import { toast } from "sonner";
import { fetchApplicantApplications } from "../../services/applicant/applicationsService";
import type { ApplicantApplicationListItem } from "../../types/domain";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/PageState";
import { routes } from "../../routes/routeConfig";

export function ApplicantApplicationsPage() {
  const [items, setItems] = useState<ApplicantApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchApplicantApplications());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const summary = useMemo(
    () => ({
      total: items.length,
      drafts: items.filter((item) => item.status === "draft").length,
      submitted: items.filter((item) => item.status !== "draft").length,
    }),
    [items],
  );

  if (loading) return <LoadingState label="Loading applications..." />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!items.length) {
    return (
      <EmptyState
        title="No applications yet"
        description="Use university search to create your first application draft."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-3xl font-semibold">My Applications</h1>
        <p className="text-muted-foreground">Track draft and submitted applications in one place.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-semibold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">Total Applications</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-semibold">{summary.drafts}</div>
            <p className="text-xs text-muted-foreground">Drafts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-semibold">{summary.submitted}</div>
            <p className="text-xs text-muted-foreground">Submitted</p>
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
                <Badge variant="secondary" className="capitalize">
                  {item.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-4">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Cycle {item.applicationCycle}
                </span>
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Created {item.createdAt || "N/A"}
                </span>
              </div>
              {item.status === "draft" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => toast.info("Coming soon", { description: "Currently not available. Please check back later." })}
                >
                  Open draft
                </Button>
              ) : (
                <Link to={openHref}>
                  <Button size="sm" variant="outline" className="w-full sm:w-auto">
                    Open
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
          );
        })}
      </section>
    </div>
  );
}
