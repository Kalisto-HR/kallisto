import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, GitCompare, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Switch } from "../../components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { EmptyState, ErrorState, LoadingState, UnavailableState } from "../../components/common/PageState";
import {
  clearCompareList,
  fetchCompareList,
  PREMIUM_REQUIRED_MESSAGE,
  removeCompareItem,
} from "../../services/applicant/compareService";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import type { CompareStatus, CompareUniversityItem } from "../../types/domain";
import { routes } from "../../routes/routeConfig";
import type { ReactNode } from "react";

type CompareRow = {
  key: string;
  label: string;
  prominent?: boolean;
  render: (item: CompareUniversityItem) => string | ReactNode;
  value: (item: CompareUniversityItem) => string;
};

const notProvidedKeys = new Set(["not_provided", "", "null", "undefined"]);

function formatUzs(amount: number | null, fallback: string) {
  if (amount === null) return fallback;
  return `${Math.round(amount).toLocaleString()} so'm per year`;
}

function formatFee(amount: number | null, currency: string, status: CompareStatus, t: (key: string, options?: Record<string, unknown>) => string) {
  if (status === "free") return t("comparePage.values.free");
  if (amount === null) return t("comparePage.values.notProvided");
  return `${amount.toLocaleString()} ${currency === "UZS" ? "so'm" : currency}`;
}

function joinOrMissing(values: string[], t: (key: string, options?: Record<string, unknown>) => string, prefix: string) {
  if (!values.length) return t("comparePage.values.notProvided");
  return values.map((value) => t(`${prefix}.${value}`, { defaultValue: value })).join(", ");
}

function equivalent(values: string[]) {
  const normalized = values.map((value) => value.trim().toLowerCase());
  const nonMissing = normalized.filter((value) => !notProvidedKeys.has(value));
  if (nonMissing.length !== normalized.length && nonMissing.length > 0) {
    return false;
  }
  return new Set(normalized).size <= 1;
}

export function ApplicantComparePage() {
  const { t } = useTranslation("common");
  const [items, setItems] = useState<CompareUniversityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [differencesOnly, setDifferencesOnly] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const compareList = await fetchCompareList();
      setItems(compareList);
      setFeedback(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load compare list");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!items.length) return;
    const params = new URLSearchParams(window.location.search);
    params.set("universities", items.map((item) => item.slug || item.id).join(","));
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [items]);

  const rows = useMemo<CompareRow[]>(
    () => [
      {
        key: "location",
        label: t("comparePage.rows.location"),
        render: (item) => {
          const region = item.region ? t(`universityFilters.regionOptions.${item.region}`, { defaultValue: item.region }) : "";
          const city = item.city ? t(`universityFilters.regionOptions.${item.city}`, { defaultValue: item.city }) : "";
          if (region && city && region !== city) return `${t("comparePage.values.region")}: ${region}\n${t("comparePage.values.city")}: ${city}`;
          return region || city || t("comparePage.values.notProvided");
        },
        value: (item) => `${item.region ?? ""}|${item.city ?? ""}`,
      },
      {
        key: "contract",
        label: t("comparePage.rows.averageContract"),
        render: (item) => formatUzs(item.averageContractAmount, t("comparePage.values.notProvided")),
        value: (item) => String(item.averageContractAmount ?? "not_provided"),
      },
      {
        key: "type",
        label: t("comparePage.rows.universityType"),
        render: (item) => item.universityType ? t(`comparePage.universityTypes.${item.universityType}`) : t("comparePage.values.notProvided"),
        value: (item) => item.universityType ?? "not_provided",
      },
      {
        key: "languages",
        label: t("comparePage.rows.languages"),
        render: (item) => joinOrMissing(item.languagesOfInstruction, t, "comparePage.languages"),
        value: (item) => item.languagesOfInstruction.join("|") || "not_provided",
      },
      {
        key: "formats",
        label: t("comparePage.rows.studyFormats"),
        render: (item) => joinOrMissing(item.studyFormats, t, "comparePage.studyFormats"),
        value: (item) => item.studyFormats.join("|") || "not_provided",
      },
      {
        key: "financial",
        label: t("comparePage.rows.financialSupport"),
        render: (item) => (
          <StackedLines lines={[
            `${t("comparePage.values.scholarships")}: ${t(`comparePage.statuses.${item.financialSupport.scholarships}`)}`,
            `${t("comparePage.values.governmentGrants")}: ${t(`comparePage.statuses.${item.financialSupport.governmentGrants}`)}`,
            `${t("comparePage.values.tuitionDiscounts")}: ${t(`comparePage.statuses.${item.financialSupport.tuitionDiscounts}`)}`,
            `${t("comparePage.values.otherSupport")}: ${t(`comparePage.statuses.${item.financialSupport.otherSupport}`)}`,
          ]} />
        ),
        value: (item) => Object.values(item.financialSupport).join("|"),
      },
      {
        key: "dormitory",
        label: t("comparePage.rows.dormitory"),
        render: (item) => <StackedLines lines={[t(`comparePage.statuses.${item.dormitoryStatus}`), item.dormitoryNote].filter(Boolean) as string[]} />,
        value: (item) => `${item.dormitoryStatus}|${item.dormitoryNote ?? ""}`,
      },
      {
        key: "accreditation",
        label: t("comparePage.rows.accreditation"),
        render: (item) => (
          <StackedLines lines={[
            `${t("comparePage.values.licence")}: ${t(`comparePage.statuses.${item.accreditation.licenceStatus}`)}`,
            `${t("comparePage.values.nationalAccreditation")}: ${t(`comparePage.statuses.${item.accreditation.nationalAccreditationStatus}`)}`,
            `${t("comparePage.values.internationalAccreditation")}: ${t(`comparePage.statuses.${item.accreditation.internationalAccreditationStatus}`)}`,
          ]} />
        ),
        value: (item) => Object.values(item.accreditation).join("|"),
      },
      {
        key: "partnerships",
        label: t("comparePage.rows.partnerships"),
        render: (item) => (
          <StackedLines lines={[
            t(`comparePage.statuses.${item.internationalPartnerships.status}`),
            item.internationalPartnerships.verifiedCount > 0 ? t("comparePage.values.verifiedPartnerships", { count: item.internationalPartnerships.verifiedCount }) : "",
            ...item.internationalPartnerships.partners,
          ].filter(Boolean)} />
        ),
        value: (item) => `${item.internationalPartnerships.status}|${item.internationalPartnerships.verifiedCount}|${item.internationalPartnerships.partners.join("|")}`,
      },
      {
        key: "mobility",
        label: t("comparePage.rows.mobility"),
        render: (item) => (
          <StackedLines lines={[
            `${t("comparePage.values.exchange")}: ${t(`comparePage.statuses.${item.mobility.exchange}`)}`,
            `${t("comparePage.values.academicMobility")}: ${t(`comparePage.statuses.${item.mobility.academicMobility}`)}`,
            `${t("comparePage.values.doubleDegree")}: ${t(`comparePage.statuses.${item.mobility.doubleDegree}`)}`,
            `${t("comparePage.values.semesterAbroad")}: ${t(`comparePage.statuses.${item.mobility.semesterAbroad}`)}`,
          ]} />
        ),
        value: (item) => Object.values(item.mobility).join("|"),
      },
      {
        key: "career",
        label: t("comparePage.rows.career"),
        render: (item) => (
          <StackedLines lines={[
            `${t("comparePage.values.careerCentre")}: ${t(`comparePage.statuses.${item.careerSupport.careerCentre}`)}`,
            `${t("comparePage.values.internshipSupport")}: ${t(`comparePage.statuses.${item.careerSupport.internshipSupport}`)}`,
            `${t("comparePage.values.employerPartnerships")}: ${t(`comparePage.statuses.${item.careerSupport.employerPartnerships}`)}`,
            `${t("comparePage.values.jobFairs")}: ${t(`comparePage.statuses.${item.careerSupport.jobFairs}`)}`,
            `${t("comparePage.values.entrepreneurshipSupport")}: ${t(`comparePage.statuses.${item.careerSupport.entrepreneurshipSupport}`)}`,
            item.careerSupport.employmentData ? `${t("comparePage.values.employmentData")}: ${item.careerSupport.employmentData}` : `${t("comparePage.values.employmentData")}: ${t("comparePage.values.notProvided")}`,
          ]} />
        ),
        value: (item) => `${Object.values(item.careerSupport).join("|")}`,
      },
      {
        key: "deadline",
        label: t("comparePage.rows.deadline"),
        render: (item) => item.admissions.deadlineStatus === "exact" && item.admissions.deadline
          ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(item.admissions.deadline))
          : t(`comparePage.deadlineStatuses.${item.admissions.deadlineStatus}`),
        value: (item) => `${item.admissions.deadlineStatus}|${item.admissions.deadline ?? ""}`,
      },
      {
        key: "fee",
        label: t("comparePage.rows.applicationFee"),
        render: (item) => (
          <StackedLines lines={[
            `${t("comparePage.values.universityApplicationFee")}: ${formatFee(item.admissions.universityApplicationFee.amount, item.admissions.universityApplicationFee.currency, item.admissions.universityApplicationFee.status, t)}`,
            `${t("comparePage.values.kallistoApplicationFee")}: ${formatFee(item.admissions.kallistoApplicationFee.amount, item.admissions.kallistoApplicationFee.currency, item.admissions.kallistoApplicationFee.status, t)}`,
          ]} />
        ),
        value: (item) => `${item.admissions.universityApplicationFee.amount ?? item.admissions.universityApplicationFee.status}|${item.admissions.kallistoApplicationFee.amount ?? ""}`,
      },
      {
        key: "apply",
        label: t("comparePage.rows.apply"),
        prominent: true,
        render: (item) => item.admissions.canApplyThroughKallisto ? (
          <Link to={routes.applicant.applicationCreate(item.id)}>
            <Button size="sm">{t("comparePage.actions.apply")}</Button>
          </Link>
        ) : (
          <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
            {t(`comparePage.applicationStatuses.${item.admissions.kallistoApplicationStatus}`)}
          </div>
        ),
        value: (item) => item.admissions.kallistoApplicationStatus,
      },
    ],
    [t],
  );

  const visibleRows = differencesOnly ? rows.filter((row) => !equivalent(items.map(row.value))) : rows;

  const onRemove = async (universityId: string) => {
    try {
      await removeCompareItem(universityId);
      await load();
    } catch {
      setFeedback(t("comparePage.errors.removeFailed"));
    }
  };

  const onClear = async () => {
    try {
      await clearCompareList();
      await load();
    } catch {
      setFeedback(t("comparePage.errors.clearFailed"));
    }
  };

  if (loading) return <LoadingState label={t("comparePage.loading")} />;
  if (error === PREMIUM_REQUIRED_MESSAGE) {
    return (
      <UnavailableState
        title={t("billing.premiumRequired.title")}
        description={t("billing.premiumRequired.description")}
        actionLabel={t("billing.premiumRequired.action")}
        onAction={() => {
          window.location.href = routes.applicant.billing;
        }}
      />
    );
  }
  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (items.length < 2) {
    return (
      <div className="space-y-4">
        <EmptyState title={t("comparePage.emptyTitle")} description={t("comparePage.emptyDescription")} />
        <Link to={routes.applicant.universities}>
          <Button>{t("comparePage.actions.addMore")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{t("comparePage.title")}</h1>
          <p className="text-muted-foreground">{t("comparePage.subtitle", { count: items.length })}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm">
            <Switch checked={differencesOnly} onCheckedChange={setDifferencesOnly} />
            {t("comparePage.actions.differencesOnly")}
          </label>
          <Link to={routes.applicant.universities}>
            <Button variant="outline" className="w-full sm:w-auto">{t("comparePage.actions.addMore")}</Button>
          </Link>
          <Button variant="ghost" className="w-full sm:w-auto" onClick={() => void onClear()}>
            {t("comparePage.actions.clear")}
          </Button>
        </div>
      </section>

      {feedback ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("comparePage.errors.title")}</AlertTitle>
          <AlertDescription>{feedback}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            {t("comparePage.tableTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 md:hidden">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border bg-card p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">{item.name}</div>
                    <p className="text-sm text-muted-foreground">{item.city || item.region || t("comparePage.values.notProvided")}</p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => void onRemove(item.id)} aria-label={t("comparePage.actions.remove")}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-3">
                  {visibleRows.map((row) => (
                    <div key={`${item.id}-${row.key}`} className={row.prominent ? "rounded-lg border border-primary/30 bg-primary/5 p-3" : "rounded-lg bg-muted/30 p-3"}>
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{row.label}</div>
                      <div className="whitespace-pre-line text-sm">{row.render(item)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <div className="min-w-[860px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-20 w-64 bg-card">{t("comparePage.criteria")}</TableHead>
                    {items.map((item) => (
                      <TableHead key={item.id} className="sticky top-0 z-10 min-w-64 bg-card text-center">
                        <div className="space-y-2">
                          <div className="font-semibold">{item.name}</div>
                          <Button size="sm" variant="ghost" onClick={() => void onRemove(item.id)}>
                            <X className="mr-1 h-3.5 w-3.5" />
                            {t("comparePage.actions.remove")}
                          </Button>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRows.map((row) => (
                    <TableRow key={row.key} className={row.prominent ? "bg-primary/5" : undefined}>
                      <TableCell className="sticky left-0 z-10 bg-card font-medium">{row.label}</TableCell>
                      {items.map((item) => (
                        <TableCell key={`${item.id}-${row.key}`} className="whitespace-pre-line align-top text-sm">
                          {row.render(item)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StackedLines({ lines }: { lines: string[] }) {
  return (
    <div className="space-y-1">
      {lines.map((line) => <div key={line}>{line}</div>)}
    </div>
  );
}
