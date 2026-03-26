import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { routes } from "../../routes/routeConfig";
import type { BasketCheckoutPreview } from "../../types/domain";
import { formatRmb } from "../../utils/currency";

export function StudentCheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const basketPreview = ((location.state as { basketPreview?: BasketCheckoutPreview } | null) ?? null)?.basketPreview ?? null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(routes.student.basket)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold">Checkout unavailable</h1>
          <p className="mt-1 text-muted-foreground">
            Payment capture is not implemented yet. Review your selection here, then return to your basket to keep editing.
          </p>
        </div>
      </section>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-2xl">Payment capture is not available yet</CardTitle>
              <Badge variant="secondary">Unavailable</Badge>
            </div>
            <CardDescription className="text-base">
              This route is kept visible so applicants can see the future checkout surface, but no payment or order is processed here.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {basketPreview ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-medium">Checkout preview</h2>
                <Badge className="bg-accent text-accent-foreground">Preview only</Badge>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="text-sm text-muted-foreground">Selected plan</div>
                  <div className="mt-1 text-lg font-medium">{basketPreview.plan.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Capacity {basketPreview.plan.capacity}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="text-sm text-muted-foreground">Estimated total</div>
                  <div className="mt-1 text-lg font-medium">
                    {formatRmb(basketPreview.estimatedTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {basketPreview.applicationCount} selected universities
                  </div>
                </div>
              </div>
              {basketPreview.warnings.length > 0 ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <div className="font-medium">Preview notes</div>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {basketPreview.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
              No checkout preview is available. Return to your basket to review plans and selected universities.
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => navigate(routes.student.basket)}>Back to Basket</Button>
            <Button variant="outline" onClick={() => navigate(routes.student.universities)}>
              Browse Universities
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
