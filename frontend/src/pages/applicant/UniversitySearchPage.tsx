import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronDown,
  Filter,
  MapPin,
  Search,
  TrendingUp,
} from "lucide-react";
import type { FitScoreResult } from "../../types/domain";
import { KallistoMatchScoreSummary } from "../../components/applicant/KallistoMatchScoreCard";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../components/ui/collapsible";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Slider } from "../../components/ui/slider";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { cn } from "../../components/ui/utils";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/PageState";
import {
  useUniversitySearchData,
} from "../../hooks/useUniversitySearchData";
import {
  addCompareItem,
  COMPARE_LIMIT_MESSAGE,
  fetchCompareList,
  MAX_COMPARE_ITEMS,
  removeCompareItem,
} from "../../services/applicant/compareService";
import { fetchBillingSummary } from "../../services/applicant/billingService";
import { calculateFitScore } from "../../services/applicant/fitScoreService";
import { fetchApplicantProfile, fetchApplicantTestScores } from "../../services/applicant/profileService";
import { routes } from "../../routes/routeConfig";
import { formatUzs } from "../../utils/currency";
import {
  buildFitScoreProgramFromUniversityListItem,
  buildFitScoreStudentProfile,
} from "../../utils/fitScorePayload";

function selectedList(value: string[] | undefined): string[] {
  return Array.isArray(value) ? value : [];
}

function toggleListValue(values: string[] | undefined, value: string): string[] {
  const selected = new Set(selectedList(values));
  if (selected.has(value)) {
    selected.delete(value);
  } else {
    selected.add(value);
  }
  return Array.from(selected).sort();
}

const TASHKENT_DISTRICT_OPTIONS = [
  { value: "bektemir", label: "Bektemir" },
  { value: "chilanzar", label: "Chilanzar" },
  { value: "mirobod", label: "Mirobod" },
  { value: "mirzo-ulugbek", label: "Mirzo Ulugbek" },
  { value: "olmazor", label: "Olmazor" },
  { value: "sergeli", label: "Sergeli" },
  { value: "shaykhontohur", label: "Shaykhontohur" },
  { value: "uchtepa", label: "Uchtepa" },
  { value: "yakkasaray", label: "Yakkasaray" },
  { value: "yashnobod", label: "Yashnobod" },
  { value: "yunusabad", label: "Yunusabad" },
  { value: "yangihayot", label: "Yangihayot" },
];

const STUDY_FORMAT_OPTIONS = [
  { value: "offline", label: "Offline" },
  { value: "online", label: "Online" },
];

const LANGUAGE_OPTIONS = [
  { value: "russian", label: "Russian" },
  { value: "english", label: "English" },
];

export function UniversitySearchPage() {
  const { t } = useTranslation("common");
  const {
    result,
    query,
    setQuery,
    page,
    setPage,
    loading,
    error,
    refresh,
    draftFilters,
    setFilter,
    setFilters,
    clearFilters,
    activeFilterCount,
    hasActiveFilters,
    filterValidationError,
    filterOptions,
    filterOptionsLoading,
    filterOptionsError,
  } = useUniversitySearchData();
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [compareFeedback, setCompareFeedback] = useState<string | null>(null);
  const [compareFeedbackId, setCompareFeedbackId] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [studyFormatOpen, setStudyFormatOpen] = useState(true);
  const [languageOpen, setLanguageOpen] = useState(true);
  const [matchScores, setMatchScores] = useState<Record<string, FitScoreResult | null>>({});
  const [matchScoresLoading, setMatchScoresLoading] = useState(false);
  const [matchScoresLocked, setMatchScoresLocked] = useState(true);

  useEffect(() => {
    const loadCompare = async () => {
      try {
        const compareList = await fetchCompareList();
        setCompareIds(new Set(compareList.map((item) => item.id)));
        setCompareFeedback(null);
        setCompareFeedbackId(null);
      } catch {
        setCompareIds(new Set());
      }
    };
    void loadCompare();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMatchScores = async () => {
      if (result.items.length === 0) {
        setMatchScores({});
        setMatchScoresLoading(false);
        return;
      }

      setMatchScoresLoading(true);
      try {
        const billingSummary = await fetchBillingSummary().catch(() => null);
        if (billingSummary?.hasActivePremium === false) {
          if (!cancelled) {
            setMatchScores({});
            setMatchScoresLocked(true);
          }
          return;
        }

        const [profile, testScores] = await Promise.all([
          fetchApplicantProfile().catch(() => null),
          fetchApplicantTestScores().catch(() => []),
        ]);
        const studentProfile = buildFitScoreStudentProfile(profile, testScores);
        let premiumRequired = false;
        const entries = await Promise.all(
          result.items.map(async (item) => {
            let score: FitScoreResult | null = null;
            try {
              score = await calculateFitScore(
                studentProfile,
                buildFitScoreProgramFromUniversityListItem(item),
              );
            } catch (err) {
              if (err instanceof Error && err.message === "PREMIUM_REQUIRED") {
                premiumRequired = true;
              }
            }
            return [item.id, score] as const;
          }),
        );

        if (!cancelled) {
          setMatchScores(premiumRequired ? {} : Object.fromEntries(entries));
          setMatchScoresLocked(premiumRequired);
        }
      } finally {
        if (!cancelled) {
          setMatchScoresLoading(false);
        }
      }
    };

    void loadMatchScores();
    return () => {
      cancelled = true;
    };
  }, [result.items]);

  const cards = useMemo(() => result.items, [result.items]);
  const displayedFilterOptions = useMemo(() => ({
    ...filterOptions,
    regions: TASHKENT_DISTRICT_OPTIONS,
    studyFormats: STUDY_FORMAT_OPTIONS,
    languages: LANGUAGE_OPTIONS,
  }), [filterOptions]);

  const toggleCompare = async (universityId: string) => {
    const inCompare = compareIds.has(universityId);
    try {
      if (inCompare) {
        await removeCompareItem(universityId);
        setCompareIds((prev) => {
          const next = new Set(prev);
          next.delete(universityId);
          return next;
        });
        setCompareFeedback(null);
        setCompareFeedbackId(null);
      } else {
        if (compareIds.size >= MAX_COMPARE_ITEMS) {
          setCompareFeedback(COMPARE_LIMIT_MESSAGE);
          setCompareFeedbackId(universityId);
          return;
        }
        await addCompareItem(universityId);
        setCompareIds((prev) => new Set(prev).add(universityId));
        setCompareFeedback(null);
        setCompareFeedbackId(null);
      }
    } catch (error) {
      setCompareFeedback(error instanceof Error ? error.message : t("applicantFlow.search.updateCompareFailed"));
      setCompareFeedbackId(universityId);
    }
  };

  const priceMin = filterOptions.priceRange.min;
  const priceMax = filterOptions.priceRange.max;
  const hasPriceRange = typeof priceMin === "number" && typeof priceMax === "number" && priceMax > priceMin;
  const selectedMinPrice = draftFilters.minPrice ?? priceMin ?? 0;
  const selectedMaxPrice = draftFilters.maxPrice ?? priceMax ?? 0;
  const priceSliderValue = [
    Math.max(priceMin ?? 0, Math.min(selectedMinPrice, selectedMaxPrice)),
    Math.min(priceMax ?? selectedMaxPrice, Math.max(selectedMinPrice, selectedMaxPrice)),
  ];

  const filterPanel = (
    <div className="brand-panel space-y-6 p-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">{t("universityFilters.title")}</h2>
          </div>
          {activeFilterCount > 0 ? <Badge variant="secondary">{activeFilterCount}</Badge> : null}
        </div>
      </div>

      {filterValidationError ? <p className="text-sm text-destructive">{filterValidationError}</p> : null}
      {filterOptionsError ? <p className="text-sm text-destructive">{filterOptionsError}</p> : null}
      {filterOptionsLoading ? <p className="text-sm text-muted-foreground">{t("universityFilters.loading")}</p> : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">{t("universityFilters.contractPrice")}</Label>
          <span className="text-xs text-muted-foreground">{t("universityFilters.currency")}</span>
        </div>
        <div className="rounded-lg border border-border/80 bg-card p-4">
          <div className="mb-4 flex items-center justify-between gap-4 text-sm">
            <span className="font-medium">{formatUzs(hasPriceRange ? priceSliderValue[0] : priceMin, { fallback: "N/A" })}</span>
            <span className="font-medium">{formatUzs(hasPriceRange ? priceSliderValue[1] : priceMax, { fallback: "N/A" })}</span>
          </div>
          <Slider
            value={priceSliderValue}
            min={priceMin ?? 0}
            max={priceMax ?? 0}
            step={100000}
            disabled={!hasPriceRange}
            className="[&_[data-slot=slider-range]]:bg-primary [&_[data-slot=slider-thumb]]:border-primary"
            onValueChange={(value) => {
              setFilters({ minPrice: value[0], maxPrice: value[1] });
            }}
          />
          {!hasPriceRange ? (
            <p className="mt-3 text-xs text-muted-foreground">{t("universityFilters.noPriceData")}</p>
          ) : null}
        </div>
      </section>

      <div className="space-y-2">
        <Label htmlFor="region-filter" className="text-sm font-semibold">{t("universityFilters.region")}</Label>
        <Select
          value={draftFilters.region ?? "all"}
          onValueChange={(value) => setFilter("region", value === "all" ? undefined : value)}
          disabled={filterOptionsLoading}
        >
          <SelectTrigger id="region-filter" className="rounded-md bg-card">
            <SelectValue placeholder={t("universityFilters.all")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("universityFilters.all")}</SelectItem>
            {displayedFilterOptions.regions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(`universityFilters.regionOptions.${option.value}`, { defaultValue: option.label })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <FilterSection title={t("universityFilters.studyFormat")} open={studyFormatOpen} onOpenChange={setStudyFormatOpen}>
        <CheckboxGroup
          emptyLabel={t("universityFilters.noOptions")}
          options={displayedFilterOptions.studyFormats}
          selected={selectedList(draftFilters.studyFormats)}
          labelPrefix="universityFilters.studyFormatOptions"
          onToggle={(value) => setFilter("studyFormats", toggleListValue(draftFilters.studyFormats, value))}
        />
      </FilterSection>

      <FilterSection title={t("universityFilters.language")} open={languageOpen} onOpenChange={setLanguageOpen}>
        <CheckboxGroup
          emptyLabel={t("universityFilters.noOptions")}
          options={displayedFilterOptions.languages}
          selected={selectedList(draftFilters.languages)}
          labelPrefix="universityFilters.languageOptions"
          onToggle={(value) => setFilter("languages", toggleListValue(draftFilters.languages, value))}
        />
      </FilterSection>

      <Button className="w-full" variant="outline" onClick={() => clearFilters()}>
        {t("universityFilters.clear")}
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="border-b bg-background pb-4">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{t("applicantFlow.search.title")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("applicantFlow.search.showing", { shown: result.items.length, total: result.total })}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("applicantFlow.search.searchPlaceholder")}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              className="gap-2 xl:hidden"
              onClick={() => setShowMobileFilters((prev) => !prev)}
            >
              <Filter className="h-4 w-4" />
              {t("universityFilters.title")}
              {activeFilterCount > 0 ? <Badge variant="secondary">{activeFilterCount}</Badge> : null}
            </Button>
            <Button
              variant="outline"
              className="hidden gap-2 xl:inline-flex"
              onClick={() => setFiltersVisible((prev) => !prev)}
            >
              <Filter className="h-4 w-4" />
              {filtersVisible ? t("universityFilters.hideFilters") : t("universityFilters.showFilters")}
              {activeFilterCount > 0 ? <Badge variant="secondary">{activeFilterCount}</Badge> : null}
            </Button>
          </div>
        </div>
      </section>

      <div className={cn("grid gap-6 xl:items-start", filtersVisible ? "xl:grid-cols-[340px_minmax(0,1fr)]" : "xl:grid-cols-1")}>
        {filtersVisible ? (
          <aside className="hidden xl:sticky xl:top-24 xl:block xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto">
            {filterPanel}
          </aside>
        ) : null}

        <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
          <SheetContent side="left" className="w-full max-w-[420px] overflow-y-auto p-4 sm:w-[420px]">
            <SheetHeader className="mb-4 text-left">
              <SheetTitle>{t("universityFilters.title")}</SheetTitle>
              <SheetDescription>{t("universityFilters.mobileDescription")}</SheetDescription>
            </SheetHeader>
            {filterPanel}
          </SheetContent>
        </Sheet>

        <section className="space-y-4 xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto xl:pr-2">
          {loading ? <LoadingState label={t("applicantFlow.search.loading")} /> : null}
          {error ? <ErrorState message={error} onRetry={() => void refresh()} /> : null}

          {!loading && !error && cards.length === 0 ? (
            <EmptyState
              title={t("universityFilters.noResults")}
              description={
                hasActiveFilters
                  ? t("applicantFlow.search.tryDifferentWithFilters")
                  : t("applicantFlow.search.tryDifferent")
              }
            />
          ) : null}

          {!loading && !error
            ? cards.map((item) => {
              const isInCompare = compareIds.has(item.id);
              return (
                <Card key={item.id} className="transition-colors hover:border-primary/25">
                  <CardHeader>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-1 gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-muted/40">
                          {item.logoUrl ? (
                            <img src={item.logoUrl} alt={`${item.name} logo`} className="h-full w-full object-cover" />
                          ) : (
                            <Building2 className="h-7 w-7 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
                            <CardTitle className="text-xl transition-colors hover:text-primary">
                              {item.name}
                            </CardTitle>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:gap-3">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5" />
                              {[item.city, item.country, item.province].filter(Boolean).join(", ") || t("applicantFlow.search.locationUnavailable")}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <TrendingUp className="h-3.5 w-3.5" />
                              {t("applicantFlow.search.fee")} {formatUzs(item.tuitionFee ?? item.applicationFee, { fallback: t("labels.unknown") })}
                            </span>
                          </div>
                          {item.description ? (
                            <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="self-start sm:ml-4">
                        <KallistoMatchScoreSummary
                          score={matchScores[item.id] ?? null}
                          loading={matchScoresLoading}
                          locked={matchScoresLocked}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      {item.programGroups ? (
                          <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{t("applicantFlow.search.programs")}: </span>
                          {item.programGroups}
                        </p>
                      ) : null}
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            {t("applicantFlow.search.programsAvailable")}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {t("applicantFlow.search.applicationOpen")}
                          </Badge>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button
                            variant={isInCompare ? "default" : "outline"}
                            size="sm"
                            className="w-full sm:w-auto"
                            onClick={() => void toggleCompare(item.id)}
                          >
                            {isInCompare ? (
                              <>
                                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                {t("applicantFlow.search.added")}
                              </>
                            ) : (
                              t("applicantFlow.search.addToCompare")
                            )}
                          </Button>
                          <Link to={routes.applicant.universityDetail(item.id)}>
                            <Button size="sm" className="w-full sm:w-auto">{t("applicantFlow.search.viewDetails")}</Button>
                          </Link>
                        </div>
                      </div>
                      {compareFeedback && compareFeedbackId === item.id ? (
                        <Alert className="border-primary/20 bg-card/80">
                          <AlertCircle className="h-4 w-4 text-primary" />
                          <AlertTitle>
                            {compareFeedback === COMPARE_LIMIT_MESSAGE ? t("applicantFlow.search.compareTableFull") : t("applicantFlow.search.compareUpdateFailed")}
                          </AlertTitle>
                          <AlertDescription>{compareFeedback}</AlertDescription>
                        </Alert>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              );
            })
            : null}

          {!loading && !error && result.totalPages > 1 ? (
            <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button disabled={page <= 1} variant="outline" onClick={() => setPage(page - 1)}>
                {t("applicantFlow.search.previous")}
              </Button>
              <div className="text-sm text-muted-foreground">
                {t("applicantFlow.search.pageOf", { page: result.page, totalPages: result.totalPages })}
              </div>
              <Button disabled={page >= result.totalPages} variant="outline" onClick={() => setPage(page + 1)}>
                {t("applicantFlow.search.next")}
              </Button>
            </section>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function FilterSection({
  title,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="rounded-lg border bg-background px-3 py-2">
      <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-left">
        <span className="text-sm font-semibold">{title}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open ? "rotate-180" : "")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function CheckboxGroup({
  options,
  selected,
  labelPrefix,
  emptyLabel,
  onToggle,
}: {
  options: Array<{ value: string; label: string }>;
  selected: string[];
  labelPrefix: string;
  emptyLabel: string;
  onToggle: (value: string) => void;
}) {
  const { t } = useTranslation("common");

  if (options.length === 0) {
    return <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-2">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/80 bg-card px-3 py-2 text-sm transition-colors hover:bg-secondary/50"
        >
          <Checkbox
            checked={selected.includes(option.value)}
            onCheckedChange={() => onToggle(option.value)}
            aria-label={t(`${labelPrefix}.${option.value}`, { defaultValue: option.label })}
          />
          <span>{t(`${labelPrefix}.${option.value}`, { defaultValue: option.label })}</span>
        </label>
      ))}
    </div>
  );
}
