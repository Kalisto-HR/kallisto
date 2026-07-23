import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ApplicantBasketState } from "../../types/domain";
import { clearBasket, fetchBasketState, removeBasketItem } from "../../services/applicant/basketService";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/PageState";
import { routes } from "../../routes/routeConfig";
import { formatRmb } from "../../utils/currency";

export function ApplicantBasketPage() {
  const { t } = useTranslation("common");
  const [basket, setBasket] = useState<ApplicantBasketState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      setBasket(await fetchBasketState());
    } catch (err) {
      setError(err instanceof Error ? err.message : t("applicantFlow.basket.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRemove = async (universityId: string) => {
    try {
      await removeBasketItem(universityId);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("applicantFlow.basket.removeFailed"));
    }
  };

  const onClear = async () => {
    try {
      await clearBasket();
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t("applicantFlow.basket.clearFailed"));
    }
  };

  if (loading) return <LoadingState label={t("applicantFlow.basket.loading")} />;
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!basket || basket.items.length === 0) {
    return (
      <EmptyState
        title={t("applicantFlow.basket.emptyTitle")}
        description={t("applicantFlow.basket.emptyDescription")}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link to={routes.applicant.universities}>
            <Button variant="ghost" size="sm" className="-ml-3">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("applicantFlow.basket.back")}
            </Button>
          </Link>
          <h1 className="text-3xl font-semibold">{t("applicantFlow.basket.title")}</h1>
          <p className="text-muted-foreground">
            {t("applicantFlow.basket.description")}
          </p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => void onClear()}>
          <Trash2 className="mr-2 h-4 w-4" />
          {t("applicantFlow.basket.clear")}
        </Button>
      </section>

      {actionError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("applicantFlow.basket.listTitle")}</CardTitle>
          <CardDescription>
            {t("applicantFlow.basket.listDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {basket.items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="text-base font-medium">{item.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {[item.city, item.country, item.province].filter(Boolean).join(", ") || t("applicantFlow.basket.locationUnavailable")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("applicantFlow.basket.applicationFee")}: {formatRmb(item.applicationFee, { fallback: t("labels.unknown") })} | {t("applicantFlow.basket.tuition")}:{" "}
                    {formatRmb(item.tuitionFee, { fallback: t("labels.unknown") })}
                  </div>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <Link to={routes.applicant.universityDetail(item.id)}>
                    <Button size="sm" variant="outline" className="w-full sm:w-auto">
                      {t("actions.view")}
                    </Button>
                  </Link>
                  <Button size="sm" variant="ghost" className="w-full sm:w-auto" onClick={() => void onRemove(item.id)}>
                    {t("actions.remove")}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
