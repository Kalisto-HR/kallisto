import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Award, DollarSign, GitCompare, MapPin, X } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/PageState";
import { clearCompareList, fetchCompareList, removeCompareItem } from "../../services/client/compareService";
import type { UniversityListItem } from "../../types/domain";
import { routes } from "../../routes/routeConfig";

export function StudentComparePage() {
  const [items, setItems] = useState<UniversityListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchCompareList());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load compare list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const comparisonRows = useMemo(
    () => [
      { label: "Location", key: "location", icon: MapPin },
      { label: "Global Ranking", key: "ranking", icon: Award },
      { label: "Application Fee", key: "applicationFee", icon: DollarSign },
      { label: "Tuition", key: "tuitionFee", icon: DollarSign },
      { label: "Acceptance Rate", key: "acceptanceRate", icon: Award },
    ],
    [],
  );

  const onRemove = async (universityId: string) => {
    try {
      await removeCompareItem(universityId);
      await load();
    } catch {
      // Keep current list if deletion fails.
    }
  };

  if (loading) return <LoadingState label="Loading compare list..." />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!items.length) {
    return (
      <EmptyState
        title="No universities to compare"
        description="Add universities from search to compare them side-by-side."
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Compare Universities</h1>
          <p className="text-muted-foreground">
            Side-by-side comparison of {items.length} universities
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={routes.student.universities}>
            <Button variant="outline">Add More</Button>
          </Link>
          <Button variant="ghost" onClick={() => void clearCompareList().then(load)}>
            Clear All
          </Button>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-[#4F46E5]" />
            Comparison Table
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[760px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-52">Criteria</TableHead>
                  {items.map((uni) => (
                    <TableHead key={uni.id || uni.name} className="text-center">
                      <div className="space-y-2">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-sm font-semibold text-white">
                          {(uni.name || uni.id || "UN")
                            .split(" ")
                            .slice(0, 2)
                            .map((part) => part[0] ?? "")
                            .join("")
                            .toUpperCase()}
                        </div>
                        <div className="font-medium">{uni.name || uni.id || "Unknown university"}</div>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={!uni.id}
                          onClick={() => void onRemove(uni.id)}
                        >
                          <X className="mr-1 h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonRows.map((row) => {
                  const Icon = row.icon;
                  return (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {row.label}
                        </div>
                      </TableCell>
                      {items.map((uni) => (
                        <TableCell key={`${uni.id || uni.name}-${row.key}`} className="text-center">
                          {row.key === "location" ? (
                            <span className="text-sm">{[uni.city, uni.country, uni.province].filter(Boolean).join(", ") || "N/A"}</span>
                          ) : null}
                          {row.key === "ranking" ? (
                            <Badge variant="secondary">{uni.ranking ?? "N/A"}</Badge>
                          ) : null}
                          {row.key === "applicationFee" ? (
                            <span className="font-medium">{uni.applicationFee ?? "N/A"}</span>
                          ) : null}
                          {row.key === "tuitionFee" ? (
                            <span className="font-medium">{uni.tuitionFee ?? "N/A"}</span>
                          ) : null}
                          {row.key === "acceptanceRate" ? (
                            <span className="font-medium">{uni.acceptanceRate !== null ? `${uni.acceptanceRate}%` : "N/A"}</span>
                          ) : null}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
