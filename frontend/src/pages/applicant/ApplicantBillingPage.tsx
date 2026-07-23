import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BadgeCheck, CreditCard, History, LockKeyhole, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/PageState";
import {
  completeDevelopmentPayment,
  createBillingOrder,
  fetchBillingSummary,
} from "../../services/applicant/billingService";
import type { BillingOrder, BillingProduct, BillingSummary } from "../../types/domain";
import { formatUzs } from "../../utils/currency";

const PRODUCT_ORDER = ["single_application", "application_pack_5", "application_pack_10", "premium_monthly"];

export function ApplicantBillingPage() {
  const { t } = useTranslation("common");
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyProductId, setBusyProductId] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<BillingOrder | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSummary(await fetchBillingSummary());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("billing.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const products = useMemo(() => {
    const items = summary?.products ?? [];
    return [...items].sort((a, b) => PRODUCT_ORDER.indexOf(a.id) - PRODUCT_ORDER.indexOf(b.id));
  }, [summary?.products]);

  const creditProducts = products.filter((item) => item.productType === "application_credit");
  const premiumProduct = products.find((item) => item.id === "premium_monthly");

  const onCreateOrder = async (product: BillingProduct) => {
    setBusyProductId(product.id);
    try {
      const order = await createBillingOrder(product.id);
      setPendingOrder(order);
      toast.success(t("billing.payment.orderCreated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("billing.payment.orderFailed"));
    } finally {
      setBusyProductId(null);
    }
  };

  const onCompleteDevPayment = async () => {
    if (!pendingOrder) return;
    setBusyProductId(pendingOrder.productId);
    try {
      await completeDevelopmentPayment(pendingOrder.id);
      setPendingOrder(null);
      toast.success(t("billing.payment.success"));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("billing.payment.failed"));
    } finally {
      setBusyProductId(null);
    }
  };

  if (loading) return <LoadingState label={t("billing.loading")} />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!summary) {
    return <EmptyState title={t("billing.emptyTitle")} description={t("billing.emptyDescription")} />;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="space-y-2">
        <Badge className="brand-soft-badge" variant="secondary">{t("billing.badge")}</Badge>
        <h1 className="text-3xl font-semibold sm:text-4xl">{t("billing.title")}</h1>
        <p className="max-w-3xl text-muted-foreground">{t("billing.subtitle")}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={CreditCard}
          label={t("billing.metrics.availableCredits")}
          value={summary.creditBalance}
          helper={t("billing.metrics.availableCreditsHelp")}
        />
        <MetricCard
          icon={BadgeCheck}
          label={t("billing.metrics.purchased")}
          value={summary.creditsPurchased}
          helper={t("billing.metrics.purchasedHelp")}
        />
        <MetricCard
          icon={ReceiptText}
          label={t("billing.metrics.used")}
          value={summary.creditsUsed}
          helper={t("billing.metrics.usedHelp")}
        />
        <MetricCard
          icon={History}
          label={t("billing.metrics.applications")}
          value={`${summary.draftApplications}/${summary.submittedApplications}`}
          helper={t("billing.metrics.applicationsHelp")}
        />
      </section>

      <Alert>
        <LockKeyhole className="h-4 w-4" />
        <AlertTitle>{t("billing.rules.title")}</AlertTitle>
        <AlertDescription>{t("billing.rules.description")}</AlertDescription>
      </Alert>

      {pendingOrder ? (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader>
            <CardTitle>{t("billing.payment.pendingTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{pendingOrder.orderNumber}</p>
              <p>{formatUzs(pendingOrder.totalAmount)} / {pendingOrder.status}</p>
            </div>
            <Button onClick={() => void onCompleteDevPayment()} disabled={Boolean(busyProductId)}>
              {busyProductId ? t("billing.actions.processing") : t("billing.actions.confirmDevPayment")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">{t("billing.credits.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("billing.credits.description")}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {creditProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                busy={busyProductId === product.id}
                onBuy={() => void onCreateOrder(product)}
              />
            ))}
          </div>
        </div>

        <Card className="brand-panel-accent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 text-primary" />
              {t("billing.premium.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {premiumProduct ? (
              <>
                <div>
                  <div className="text-3xl font-semibold">{formatUzs(premiumProduct.priceAmount)}</div>
                  <p className="text-sm text-muted-foreground">{t("billing.premium.perMonth")}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <p>{t("billing.premium.compare")}</p>
                  <p>{t("billing.premium.matchScore")}</p>
                  <p className="text-muted-foreground">{t("billing.premium.noCredits")}</p>
                </div>
                <SubscriptionState summary={summary} />
                <Button
                  className="w-full"
                  disabled={busyProductId === premiumProduct.id}
                  onClick={() => void onCreateOrder(premiumProduct)}
                >
                  {busyProductId === premiumProduct.id
                    ? t("billing.actions.processing")
                    : summary.hasActivePremium
                      ? t("billing.actions.renewPremium")
                      : t("billing.actions.upgradePremium")}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t("billing.premium.unavailable")}</p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <HistoryCard
          title={t("billing.history.credits")}
          empty={t("billing.history.noCredits")}
          items={summary.creditHistory.map((item) => ({
            id: item.id,
            title: item.description || item.transactionType,
            meta: `${item.creditChange > 0 ? "+" : ""}${item.creditChange} / ${t("billing.history.balance")} ${item.balanceAfter}`,
            date: item.createdAt,
          }))}
        />
        <HistoryCard
          title={t("billing.history.payments")}
          empty={t("billing.history.noPayments")}
          items={summary.orders.map((item) => ({
            id: item.id,
            title: item.orderNumber || item.productId,
            meta: `${formatUzs(item.totalAmount)} / ${item.status}`,
            date: item.createdAt,
          }))}
        />
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof CreditCard;
  label: string;
  value: number | string;
  helper: string;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="rounded-lg bg-accent p-2 w-fit">
          <Icon className="h-4 w-4 text-accent-foreground" />
        </div>
        <div className="text-3xl font-semibold">{value}</div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{helper}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProductCard({ product, busy, onBuy }: { product: BillingProduct; busy: boolean; onBuy: () => void }) {
  const { t } = useTranslation("common");
  const perCredit = product.credits > 0 ? Math.round(product.priceAmount / product.credits) : product.priceAmount;
  const singlePrice = 10000;
  const savings = product.credits > 1 ? product.credits * singlePrice - product.priceAmount : 0;

  return (
    <Card className={product.credits >= 5 ? "border-primary/30" : undefined}>
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-3xl font-semibold">{formatUzs(product.priceAmount)}</div>
          <p className="text-sm text-muted-foreground">
            {product.credits} {t("billing.credits.creditUnit")} / {formatUzs(perCredit)} {t("billing.credits.perApplication")}
          </p>
        </div>
        {savings > 0 ? <Badge variant="secondary">{t("billing.credits.save", { amount: formatUzs(savings) })}</Badge> : null}
        <p className="min-h-10 text-sm text-muted-foreground">{product.description}</p>
        <Button className="w-full" disabled={busy} onClick={onBuy}>
          {busy ? t("billing.actions.processing") : t("billing.actions.buyCredits")}
        </Button>
      </CardContent>
    </Card>
  );
}

function SubscriptionState({ summary }: { summary: BillingSummary }) {
  const { t } = useTranslation("common");
  if (!summary.subscription) {
    return <Badge variant="secondary">{t("billing.subscription.none")}</Badge>;
  }
  return (
    <div className="rounded-lg border bg-background/70 p-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{t("billing.subscription.status")}</span>
        <Badge variant={summary.hasActivePremium ? "default" : "secondary"}>{summary.subscription.status}</Badge>
      </div>
      <p className="mt-2 text-muted-foreground">
        {t("billing.subscription.expires")} {new Date(summary.subscription.currentPeriodEnd).toLocaleDateString()}
      </p>
    </div>
  );
}

function HistoryCard({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; title: string; meta: string; date: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          items.slice(0, 8).map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.meta}</p>
              </div>
              <p className="whitespace-nowrap text-xs text-muted-foreground">
                {item.date ? new Date(item.date).toLocaleDateString() : ""}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
