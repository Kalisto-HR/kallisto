import { useNavigate } from "react-router-dom";
import { AlertCircle, Check, CreditCard, Download, Zap } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { routes } from "../../routes/routeConfig";

const packages = [
  { id: "pkg-5", applications: 5, price: 270, perApp: 54, savings: 20 },
  { id: "pkg-10", applications: 10, price: 500, perApp: 50, savings: 80, featured: true },
  { id: "pkg-20", applications: 20, price: 920, perApp: 46, savings: 240 },
];

export function StudentBillingPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section>
        <h1 className="text-3xl font-semibold">Billing</h1>
        <p className="mt-1 text-muted-foreground">
          Per-application and package billing flows are shown with production visual parity.
        </p>
      </section>

      <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-orange-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-900">Billing APIs are not fully available yet.</p>
            <p className="text-sm text-orange-700">
              Checkout actions route correctly, while payment posting remains disabled.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate(routes.student.pricing)}>
            View plans
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Usage Summary</CardTitle>
          <CardDescription>Billing period: 2026-02-01 to 2026-02-28</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          <div>
            <div className="text-sm text-muted-foreground">Applications Submitted</div>
            <div className="text-3xl font-semibold">N/A</div>
            <div className="text-xs text-muted-foreground">Awaiting usage endpoint</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Total Cost This Period</div>
            <div className="text-3xl font-semibold">N/A</div>
            <div className="text-xs text-muted-foreground">Awaiting invoice endpoint</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Active Package Balance</div>
            <div className="text-3xl font-semibold">N/A</div>
            <div className="text-xs text-muted-foreground">Awaiting credit endpoint</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pay per application</CardTitle>
          <CardDescription>Pay only when an application is submitted.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-accent/50 p-6 text-center">
            <div className="text-4xl font-semibold">$58</div>
            <div className="text-sm text-muted-foreground">per application</div>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-green-600" />
              No upfront commitment
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 text-green-600" />
              Billed after successful submission
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Application Packages</CardTitle>
          <CardDescription>Save with prepaid bundles (max 20 applications).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative rounded-lg border p-6 ${
                pkg.featured ? "border-2 border-[#4F46E5] shadow-md" : "hover:border-[#4F46E5]/50"
              }`}
            >
              {pkg.featured ? (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4F46E5] text-white">
                  <Zap className="mr-1 h-3 w-3" />
                  Best Value
                </Badge>
              ) : null}
              <div className="text-center">
                <div className="text-2xl font-semibold">{pkg.applications} Applications</div>
                <div className="mt-1 text-3xl font-bold text-[#4F46E5]">${pkg.price}</div>
                <div className="mt-1 text-xs text-muted-foreground">${pkg.perApp} per application</div>
                <div className="mt-2 rounded border border-green-200 bg-green-50 p-2 text-sm text-green-700">
                  Save ${pkg.savings}
                </div>
                <Button className="mt-4 w-full" onClick={() => navigate(routes.student.checkout)}>
                  Buy Package
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Invoices and Payments</CardTitle>
              <CardDescription>Billing history will appear once payment APIs are live.</CardDescription>
            </div>
            <Button variant="outline" size="sm" disabled>
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            No invoices available yet.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 rounded-lg border p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-medium">Visa ending in 4242</div>
              <div className="text-sm text-muted-foreground">Read-only placeholder</div>
            </div>
            <Badge variant="secondary">Default</Badge>
          </div>
          <Button variant="outline" className="w-full" disabled>
            Add Payment Method
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
