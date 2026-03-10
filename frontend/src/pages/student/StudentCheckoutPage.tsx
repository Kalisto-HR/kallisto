import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, CreditCard, Lock } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { routes } from "../../routes/routeConfig";
import type { BasketCheckoutPreview } from "../../types/domain";
import { formatRmb } from "../../utils/currency";

export function StudentCheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [success, setSuccess] = useState(false);

  const basketPreview = ((location.state as { basketPreview?: BasketCheckoutPreview } | null) ?? null)?.basketPreview ?? null;
  const planName = basketPreview?.plan.name ?? "Pro Plan";
  const planCapacity = basketPreview?.plan.capacity ?? 100;
  const applicationCount = basketPreview?.applicationCount ?? 0;
  const subtotal = basketPreview?.estimatedTotal ?? 199;
  const tax = basketPreview ? 0 : 19.9;
  const total = subtotal + tax;

  if (success) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Card>
          <CardHeader className="space-y-4 pb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-3xl">Payment Successful</CardTitle>
              <CardDescription className="mt-2 text-base">
                Checkout flow is complete. Payment persistence endpoint is pending.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">{planName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Application capacity</span>
              <span className="font-medium">{planCapacity}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">{formatRmb(total)}</span>
            </div>
            {applicationCount > 0 ? (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Selected applications</span>
                <span className="font-medium">{applicationCount}</span>
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row">
            <Button className="w-full sm:flex-1" onClick={() => navigate(routes.student.dashboard)}>
              Go to Dashboard
            </Button>
            <Button
              className="w-full sm:flex-1"
              variant="outline"
              onClick={() => navigate(routes.student.billing)}
            >
              View Billing
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(routes.student.basket)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold">Complete your purchase</h1>
          <p className="mt-1 text-muted-foreground">Secure checkout visual parity flow.</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {basketPreview?.warnings.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Checkout Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {basketPreview.warnings.map((warning) => (
                  <p key={warning}>• {warning}</p>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Credit card form for UI parity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="card-number">Card number</Label>
                <Input id="card-number" placeholder="1234 5678 9012 3456" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry date</Label>
                  <Input id="expiry" placeholder="MM / YY" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input id="cvc" placeholder="123" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardholder">Cardholder name</Label>
                <Input id="cardholder" placeholder="Jane Doe" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Billing Address</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Street address</Label>
                <Input id="address" placeholder="123 Main Street" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" placeholder="New York" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal">Postal code</Label>
                <Input id="postal" placeholder="10001" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" placeholder="United States" />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-start gap-3 rounded-lg border p-4">
            <Checkbox id="terms" checked={agreeToTerms} onCheckedChange={(checked) => setAgreeToTerms(Boolean(checked))} />
            <Label htmlFor="terms" className="text-sm leading-relaxed">
              I agree to the Terms of Service and Privacy Policy.
            </Label>
          </div>
        </div>

        <div>
          <Card className="top-6 lg:sticky">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{planName}</div>
                  <div className="text-sm text-muted-foreground">
                    {applicationCount > 0 ? `${applicationCount} selected universities` : "Concept checkout mode"}
                  </div>
                </div>
                <Badge variant="secondary">{planCapacity} capacity</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatRmb(subtotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatRmb(tax, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <span className="font-semibold">Total</span>
                <span className="text-2xl font-semibold">{formatRmb(total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                className="w-full"
                size="lg"
                disabled={!agreeToTerms}
                onClick={() => setSuccess(true)}
              >
                <Lock className="mr-2 h-4 w-4" />
                Pay {formatRmb(total, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Button>
              <p className="text-xs text-muted-foreground">Encrypted checkout, parity mode.</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CreditCard className="h-3.5 w-3.5" />
                Payment capture endpoint pending.
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
