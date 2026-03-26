import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Check, Package, Trash2 } from "lucide-react";
import type { BasketPlan, StudentBasketState } from "../../types/domain";
import {
  clearBasket,
  fetchBasketPlans,
  fetchBasketState,
  removeBasketItem,
} from "../../services/client/basketService";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/PageState";
import { routes } from "../../routes/routeConfig";
import { formatRmb } from "../../utils/currency";

export function StudentBasketPage() {
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState<BasketPlan[]>([]);
  const [basket, setBasket] = useState<StudentBasketState | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedUniversityIds, setSelectedUniversityIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const [plansData, basketData] = await Promise.all([fetchBasketPlans(), fetchBasketState()]);
      setPlans(plansData);
      setBasket(basketData);

      const requestedPlanId = searchParams.get("plan");
      const hasRequestedPlan = requestedPlanId ? plansData.some((plan) => plan.id === requestedPlanId) : false;
      const initialPlanId =
        (hasRequestedPlan ? requestedPlanId : null) ??
        basketData.selectedPlanId ??
        basketData.recommendedPlanId ??
        plansData[0]?.id ??
        null;
      setSelectedPlanId(initialPlanId);

      const defaultSelectedIds = basketData.items
        .slice(0, basketData.maxPlanCapacity)
        .map((item) => item.id);
      setSelectedUniversityIds(defaultSelectedIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load basket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // searchParams is intentionally omitted to avoid reload loops on internal navigation state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? null,
    [plans, selectedPlanId],
  );

  const selectedCount = selectedUniversityIds.length;
  const basketCount = basket?.items.length ?? 0;
  const maxPlanCapacity = basket?.maxPlanCapacity ?? 20;
  const overCapacity = basketCount > maxPlanCapacity;

  const canContinue =
    Boolean(selectedPlan) &&
    selectedCount > 0 &&
    selectedCount <= (selectedPlan?.capacity ?? 0);

  const recommendedPlan = useMemo(() => {
    if (selectedCount <= 0) {
      return null;
    }
    return plans.find((plan) => selectedCount <= plan.capacity) ?? null;
  }, [plans, selectedCount]);

  const toggleUniversitySelection = (universityId: string) => {
    setActionError(null);
    setSelectedUniversityIds((previous) => {
      if (previous.includes(universityId)) {
        return previous.filter((id) => id !== universityId);
      }
      if (previous.length >= maxPlanCapacity) {
        setActionError(`You can include up to ${maxPlanCapacity} universities per checkout.`);
        return previous;
      }
      return [...previous, universityId];
    });
  };

  const onRemove = async (universityId: string) => {
    try {
      await removeBasketItem(universityId);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to remove item");
    }
  };

  const onClear = async () => {
    try {
      await clearBasket();
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to clear basket");
    }
  };

  if (loading) return <LoadingState label="Loading basket..." />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!basket || basket.items.length === 0) {
    return (
      <EmptyState
        title="Your basket is empty"
        description="Add universities from detail or compare pages to build your checkout."
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link to={routes.student.universities}>
            <Button variant="ghost" size="sm" className="-ml-3">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to universities
            </Button>
          </Link>
          <h1 className="text-3xl font-semibold">Application Basket</h1>
          <p className="text-muted-foreground">
            Select universities and choose a package plan. Checkout is still unavailable, so this page stays in preview mode.
          </p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => void onClear()}>
          <Trash2 className="mr-2 h-4 w-4" />
          Clear Basket
        </Button>
      </section>

      {overCapacity ? (
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-orange-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4" />
            <p className="text-sm">
              Your basket has {basketCount} universities. A single checkout supports up to {maxPlanCapacity}. Select a subset now and split the rest into another checkout.
            </p>
          </div>
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Universities in Basket</CardTitle>
              <CardDescription>
                Select which universities to include in this checkout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {basket.items.map((item) => {
                const isSelected = selectedUniversityIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-4 transition ${
                      isSelected ? "border-primary/30 bg-primary/6 shadow-[0_18px_34px_-30px_rgba(20,90,67,0.28)]" : "border-border"
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleUniversitySelection(item.id)}
                          aria-label={`Include ${item.name} in checkout`}
                        />
                        <div className="space-y-1">
                          <div className="text-base font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {[item.city, item.country, item.province].filter(Boolean).join(", ") || "Location unavailable"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Application fee: {formatRmb(item.applicationFee, { fallback: "N/A" })} | Tuition: {formatRmb(item.tuitionFee, { fallback: "N/A" })}
                          </div>
                        </div>
                      </div>
                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                        <Link to={routes.student.universityDetail(item.id)}>
                          <Button size="sm" variant="outline" className="w-full sm:w-auto">View</Button>
                        </Link>
                        <Button size="sm" variant="ghost" className="w-full sm:w-auto" onClick={() => void onRemove(item.id)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Choose Plan</CardTitle>
              <CardDescription>Auto recommendation is based on selected checkout universities.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {plans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                const isRecommended = recommendedPlan?.id === plan.id;
                const isEligible = selectedCount <= plan.capacity;

                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`w-full rounded-lg border p-4 text-left transition ${
                      isSelected ? "border-primary bg-primary/6 shadow-[0_18px_34px_-30px_rgba(20,90,67,0.28)]" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{plan.name}</div>
                      <div className="flex items-center gap-2">
                        {isRecommended ? <Badge className="bg-accent text-accent-foreground">Recommended</Badge> : null}
                        {plan.featured ? <Badge className="bg-primary text-primary-foreground">Best Value</Badge> : null}
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">{plan.description}</div>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <div className="text-xl font-semibold">{formatRmb(plan.price)}</div>
                        <div className="text-xs text-muted-foreground">{formatRmb(plan.perApp)} per application</div>
                      </div>
                      <div className="text-sm text-muted-foreground">Capacity {plan.capacity}</div>
                    </div>
                    {!isEligible ? (
                      <div className="mt-2 text-xs text-red-600">
                        Selected universities exceed this plan capacity.
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Checkout Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">In basket</span>
                <span>{basketCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Included now</span>
                <span>{selectedCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Selected plan</span>
                <span>{selectedPlan?.name ?? "Not selected"}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-medium">Estimated total</span>
                <span className="text-xl font-semibold">
                  {selectedPlan ? formatRmb(selectedPlan.price) : "N/A"}
                </span>
              </div>
              <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
                Checkout is not available yet. Basket plans and totals are shown as previews only until payment capture is implemented.
              </div>
              <Button className="w-full" size="lg" disabled>
                <Package className="mr-2 h-4 w-4" />
                Checkout unavailable
              </Button>
              {!canContinue ? (
                <p className="text-xs text-red-600">
                  Select at least one university and a plan with enough capacity.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  Your selection is saved locally for future checkout support
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
