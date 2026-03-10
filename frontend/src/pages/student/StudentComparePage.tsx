import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Award, DollarSign, GitCompare, MapPin, X } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/PageState";
import { clearCompareList, fetchCompareList, removeCompareItem } from "../../services/client/compareService";
import { addBasketItem, fetchBasketState, removeBasketItem } from "../../services/client/basketService";
import type { UniversityListItem } from "../../types/domain";
import { routes } from "../../routes/routeConfig";
import { formatRmb } from "../../utils/currency";

export function StudentComparePage() {
  const [items, setItems] = useState<UniversityListItem[]>([]);
  const [basketIds, setBasketIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [compareList, basket] = await Promise.all([
        fetchCompareList(),
        fetchBasketState().catch(() => null),
      ]);
      setItems(compareList);
      const nextBasketIds = new Set((basket?.items ?? []).map((item) => item.id));
      setBasketIds(nextBasketIds);
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

  const toggleBasket = async (universityId: string) => {
    if (!universityId) return;
    try {
      if (basketIds.has(universityId)) {
        await removeBasketItem(universityId);
        setBasketIds((previous) => {
          const next = new Set(previous);
          next.delete(universityId);
          return next;
        });
      } else {
        await addBasketItem(universityId);
        setBasketIds((previous) => {
          const next = new Set(previous);
          next.add(universityId);
          return next;
        });
      }
    } catch {
      // Keep page stable if basket update fails.
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
      <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Compare Universities</h1>
          <p className="text-muted-foreground">
            Side-by-side comparison of {items.length} universities
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link to={routes.student.universities}>
            <Button variant="outline" className="w-full sm:w-auto">Add More</Button>
          </Link>
          <Button variant="ghost" className="w-full sm:w-auto" onClick={() => void clearCompareList().then(load)}>
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
        <CardContent className="space-y-4">
          <div className="space-y-4 md:hidden">
            {items.map((uni) => (
              <div key={uni.id || uni.name} className="rounded-xl border p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-sm font-semibold text-white">
                      {(uni.name || uni.id || "UN")
                        .split(" ")
                        .slice(0, 2)
                        .map((part) => part[0] ?? "")
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="font-medium">{uni.name || uni.id || "Unknown university"}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!uni.id}
                      onClick={() => void onRemove(uni.id)}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      Remove
                    </Button>
                    <Button
                      size="sm"
                      variant={uni.id && basketIds.has(uni.id) ? "default" : "outline"}
                      disabled={!uni.id}
                      onClick={() => void toggleBasket(uni.id)}
                    >
                      {uni.id && basketIds.has(uni.id) ? "In Basket" : "Add to Basket"}
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {comparisonRows.map((row) => {
                    const Icon = row.icon;
                    return (
                      <div key={`${uni.id || uni.name}-${row.key}`} className="rounded-lg bg-muted/30 p-3">
                        <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {row.label}
                        </div>
                        <div className="text-sm">
                          {row.key === "location" ? (
                            <span>{[uni.city, uni.country, uni.province].filter(Boolean).join(", ") || "N/A"}</span>
                          ) : null}
                          {row.key === "ranking" ? (
                            <Badge variant="secondary">{uni.ranking ?? "N/A"}</Badge>
                          ) : null}
                          {row.key === "applicationFee" ? (
                            <span className="font-medium">{formatRmb(uni.applicationFee, { fallback: "N/A" })}</span>
                          ) : null}
                          {row.key === "tuitionFee" ? (
                            <span className="font-medium">{formatRmb(uni.tuitionFee, { fallback: "N/A" })}</span>
                          ) : null}
                          {row.key === "acceptanceRate" ? (
                            <span className="font-medium">{uni.acceptanceRate !== null ? `${uni.acceptanceRate}%` : "N/A"}</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
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
                        <Button
                          size="sm"
                          variant={uni.id && basketIds.has(uni.id) ? "default" : "outline"}
                          disabled={!uni.id}
                          onClick={() => void toggleBasket(uni.id)}
                        >
                          {uni.id && basketIds.has(uni.id) ? "In Basket" : "Add to Basket"}
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
                            <span className="font-medium">{formatRmb(uni.applicationFee, { fallback: "N/A" })}</span>
                          ) : null}
                          {row.key === "tuitionFee" ? (
                            <span className="font-medium">{formatRmb(uni.tuitionFee, { fallback: "N/A" })}</span>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
