import { CreditCard, ReceiptText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { routes } from "../../routes/routeConfig";
import { UnavailableState } from "../../components/common/PageState";

export function ApplicantBillingPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold">Billing unavailable</h1>
        <p className="text-muted-foreground">
          Credit purchases, package billing, invoices, and saved payment methods are not available yet.
        </p>
      </section>

      <UnavailableState
        title="Billing is not live yet"
        description="The billing route stays visible for navigation parity, but no payment, invoicing, or credit management actions are active in this release."
        actionLabel="Return to basket"
        onAction={() => navigate(routes.applicant.basket)}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              What is unavailable
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Application credit purchases</p>
            <p>Package checkout and saved payment methods</p>
            <p>Invoice history, export, and payment reporting</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" />
              What you can do now
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Shortlist universities in Basket</p>
            <p>Review the checkout preview flow</p>
            <p>Return later when billing APIs are launched</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
