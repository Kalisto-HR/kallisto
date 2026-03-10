import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  CheckCircle2,
  ChevronDown,
  Filter,
  MapPin,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../components/ui/collapsible";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Separator } from "../../components/ui/separator";
import { cn } from "../../components/ui/utils";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/PageState";
import {
  useUniversitySearchData,
  type UniversityAdvancedFilters,
} from "../../hooks/useUniversitySearchData";
import { addCompareItem, fetchCompareList, removeCompareItem } from "../../services/client/compareService";
import { routes } from "../../routes/routeConfig";
import { formatRmb } from "../../utils/currency";

const CITY_TYPE_OPTIONS = [
  { value: "urban", label: "Urban" },
  { value: "suburban", label: "Suburban" },
  { value: "rural", label: "Rural" },
];

const IELTS_PRESETS = [6, 6.5, 7, 7.5];
const TOEFL_PRESETS = [80, 90, 100, 110];

function parseNumberInput(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseIntegerInput(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function numericValue(value: number | undefined): string {
  return typeof value === "number" ? String(value) : "";
}

function boolToSelectValue(value: boolean | undefined): "any" | "true" | "false" {
  if (value === true) {
    return "true";
  }
  if (value === false) {
    return "false";
  }
  return "any";
}

function selectValueToBool(value: string): boolean | undefined {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return undefined;
}

export function UniversitySearchPage() {
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
    setDraftFilter,
    applyFilters,
    clearFilters,
    activeFilterCount,
    hasActiveFilters,
    isFiltersDirty,
    filterValidationError,
  } = useUniversitySearchData();
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [academicOpen, setAcademicOpen] = useState(true);
  const [financialOpen, setFinancialOpen] = useState(true);
  const [locationOpen, setLocationOpen] = useState(true);
  const [lifestyleOpen, setLifestyleOpen] = useState(true);

  useEffect(() => {
    const loadCompare = async () => {
      try {
        const compareList = await fetchCompareList();
        setCompareIds(new Set(compareList.map((item) => item.id)));
      } catch {
        setCompareIds(new Set());
      }
    };
    void loadCompare();
  }, []);

  const cards = useMemo(
    () =>
      result.items.map((item) => ({
        ...item,
        fitLabel: item.ranking !== null && item.ranking <= 200 ? "Match" : "Reach",
      })),
    [result.items],
  );

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
      } else {
        await addCompareItem(universityId);
        setCompareIds((prev) => new Set(prev).add(universityId));
      }
    } catch {
      // Keep UI stable; global error handling is covered by API-layer toasts/logging.
    }
  };

  const onApplyFilters = () => {
    if (applyFilters()) {
      setShowMobileFilters(false);
    }
  };

  const filterPanel = (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#4F46E5]" />
          <h2 className="text-2xl font-semibold">Advanced Filters</h2>
          {activeFilterCount > 0 ? <Badge variant="secondary">{activeFilterCount}</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">Refine your search to find the perfect match</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={onApplyFilters} disabled={!isFiltersDirty}>
            Apply
          </Button>
          <Button size="sm" variant="outline" onClick={() => clearFilters()}>
            Clear
          </Button>
        </div>
      </div>

      {filterValidationError ? <p className="text-sm text-destructive">{filterValidationError}</p> : null}

      <FilterSection title="Academic" open={academicOpen} onOpenChange={setAcademicOpen}>
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <NumberFilterField
              id="min-ranking"
              label="Min Ranking"
              value={draftFilters.minRanking}
              onChange={(value) => setDraftFilter("minRanking", parseIntegerInput(value))}
            />
            <NumberFilterField
              id="max-ranking"
              label="Max Ranking"
              value={draftFilters.maxRanking}
              onChange={(value) => setDraftFilter("maxRanking", parseIntegerInput(value))}
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="min-ielts">IELTS</Label>
              <Button
                size="sm"
                variant="ghost"
                className="h-auto p-0 text-xs text-muted-foreground"
                onClick={() => setDraftFilter("minIelts", undefined)}
              >
                Any
              </Button>
            </div>
            <NumberFilterField
              id="min-ielts"
              label=""
              hideLabel
              value={draftFilters.minIelts}
              onChange={(value) => setDraftFilter("minIelts", parseNumberInput(value))}
            />
            <PresetButtons
              values={IELTS_PRESETS}
              selected={draftFilters.minIelts}
              onSelect={(value) => setDraftFilter("minIelts", value)}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="min-toefl">TOEFL iBT</Label>
              <Button
                size="sm"
                variant="ghost"
                className="h-auto p-0 text-xs text-muted-foreground"
                onClick={() => setDraftFilter("minToefl", undefined)}
              >
                Any
              </Button>
            </div>
            <NumberFilterField
              id="min-toefl"
              label=""
              hideLabel
              value={draftFilters.minToefl}
              onChange={(value) => setDraftFilter("minToefl", parseIntegerInput(value))}
            />
            <PresetButtons
              values={TOEFL_PRESETS}
              selected={draftFilters.minToefl}
              onSelect={(value) => setDraftFilter("minToefl", value)}
            />
          </div>
        </div>
      </FilterSection>

      <FilterSection title="Financial" open={financialOpen} onOpenChange={setFinancialOpen}>
        <div className="grid gap-3">
          <NumberFilterField
            id="max-fee"
            label="Max Application Fee (RMB)"
            value={draftFilters.maxFee}
            onChange={(value) => setDraftFilter("maxFee", parseNumberInput(value))}
          />
          <NumberFilterField
            id="max-tuition"
            label="Max Tuition (RMB)"
            value={draftFilters.maxTuition}
            onChange={(value) => setDraftFilter("maxTuition", parseNumberInput(value))}
          />
          <BooleanFilterField
            id="scholarship-available"
            label="Scholarship Available"
            value={draftFilters.scholarshipAvailable}
            onChange={(value) => setDraftFilter("scholarshipAvailable", value)}
          />
        </div>
      </FilterSection>

      <FilterSection title="Location" open={locationOpen} onOpenChange={setLocationOpen}>
        <div className="grid gap-3">
          <TextFilterField
            id="country"
            label="Country"
            value={draftFilters.country}
            onChange={(value) => setDraftFilter("country", value)}
          />
          <TextFilterField
            id="province"
            label="Province"
            value={draftFilters.province}
            onChange={(value) => setDraftFilter("province", value)}
          />
          <TextFilterField
            id="city"
            label="City"
            value={draftFilters.city}
            onChange={(value) => setDraftFilter("city", value)}
          />
          <SelectFilterField
            id="city-type"
            label="City Type"
            placeholder="Any city type"
            value={draftFilters.cityType ?? ""}
            options={CITY_TYPE_OPTIONS}
            onChange={(value) => setDraftFilter("cityType", value || undefined)}
          />
        </div>
      </FilterSection>

      <FilterSection title="Lifestyle" open={lifestyleOpen} onOpenChange={setLifestyleOpen}>
        <div className="grid gap-3">
          <TextFilterField
            id="campus-vibe"
            label="Campus Vibe"
            value={draftFilters.campusVibe}
            onChange={(value) => setDraftFilter("campusVibe", value)}
            placeholder="e.g. collaborative"
          />
          <NumberFilterField
            id="min-acceptance"
            label="Min Acceptance Rate (%)"
            value={draftFilters.minAcceptanceRate}
            onChange={(value) => setDraftFilter("minAcceptanceRate", parseNumberInput(value))}
          />
          <NumberFilterField
            id="max-acceptance"
            label="Max Acceptance Rate (%)"
            value={draftFilters.maxAcceptanceRate}
            onChange={(value) => setDraftFilter("maxAcceptanceRate", parseNumberInput(value))}
          />
        </div>
      </FilterSection>
    </div>
  );

  return (
    <div className="space-y-6">
      <section className="border-b bg-background pb-4">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Find Universities</h1>
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{result.items.length}</span> of{" "}
                <span className="font-semibold text-foreground">{result.total}</span> universities
              </p>
            </div>
            <Button variant="outline" className="w-full gap-2 sm:w-auto">
              <Sparkles className="h-4 w-4" />
              AI Match
            </Button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search universities, programs..."
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              className="gap-2 xl:hidden"
              onClick={() => setShowMobileFilters((prev) => !prev)}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 ? <Badge variant="secondary">{activeFilterCount}</Badge> : null}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start">
        <aside className="hidden xl:sticky xl:top-24 xl:block xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto">
          {filterPanel}
        </aside>

        <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
          <SheetContent side="left" className="w-full max-w-[420px] overflow-y-auto p-4 sm:w-[420px]">
            <SheetHeader className="mb-4 text-left">
              <SheetTitle>Advanced Filters</SheetTitle>
              <SheetDescription>Adjust filters and apply them to your search results.</SheetDescription>
            </SheetHeader>
            {filterPanel}
          </SheetContent>
        </Sheet>

        <section className="space-y-4 xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto xl:pr-2">
          {loading ? <LoadingState label="Loading universities..." /> : null}
          {error ? <ErrorState message={error} onRetry={() => void refresh()} /> : null}

          {!loading && !error && cards.length === 0 ? (
            <EmptyState
              title="No universities found"
              description={
                hasActiveFilters
                  ? "Try a different query or clear your filters."
                  : "Try a different search query."
              }
            />
          ) : null}

          {!loading && !error
            ? cards.map((item) => {
              const isInCompare = compareIds.has(item.id);
              return (
                <Card key={item.id} className="cursor-pointer transition-all hover:border-[#4F46E5]/30">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
                          <CardTitle className="text-xl transition-colors hover:text-[#4F46E5]">
                            {item.name}
                          </CardTitle>
                          <Badge variant="secondary" className="bg-[#4F46E5]/10 text-[#4F46E5]">
                            {item.ranking ? `${Math.max(60, 300 - item.ranking)}% Match` : "N/A Match"}
                          </Badge>
                          <Badge
                            className={
                              item.fitLabel === "Match"
                                ? "border-blue-200 bg-blue-500/10 text-blue-700"
                                : "border-amber-200 bg-amber-500/10 text-amber-700"
                            }
                          >
                            {item.fitLabel}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:gap-3">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            {[item.city, item.country, item.province].filter(Boolean).join(", ") || "Location unavailable"}
                          </span>
                          <span className="hidden sm:inline">|</span>
                          <span className="flex items-center gap-1.5">
                            <Award className="h-3.5 w-3.5" />
                            Ranking {item.ranking ?? "N/A"}
                          </span>
                          <span className="hidden sm:inline">|</span>
                          <span className="flex items-center gap-1.5">
                            <TrendingUp className="h-3.5 w-3.5" />
                            Fee {formatRmb(item.applicationFee ?? item.tuitionFee, { fallback: "N/A" })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs">
                          Programs available
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Application open
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
                              Added
                            </>
                          ) : (
                            "Add to Compare"
                          )}
                        </Button>
                        <Link to={routes.student.universityDetail(item.id)}>
                          <Button size="sm" className="w-full sm:w-auto">View Details</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
            : null}

          {!loading && !error && result.totalPages > 1 ? (
            <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button disabled={page <= 1} variant="outline" onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <div className="text-sm text-muted-foreground">
                Page {result.page} of {result.totalPages}
              </div>
              <Button disabled={page >= result.totalPages} variant="outline" onClick={() => setPage(page + 1)}>
                Next
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
    <Collapsible open={open} onOpenChange={onOpenChange} className="rounded-xl border bg-background px-3 py-2">
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

function PresetButtons({
  values,
  selected,
  onSelect,
}: {
  values: number[];
  selected: number | undefined;
  onSelect: (value: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <Button
          key={value}
          size="sm"
          variant={selected === value ? "default" : "outline"}
          className={selected === value ? "" : "bg-muted/70 border-border/80"}
          onClick={() => onSelect(value)}
        >
          {value}
        </Button>
      ))}
    </div>
  );
}

function TextFilterField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="bg-muted/70 border-border/80 focus-visible:bg-muted"
      />
    </div>
  );
}

function NumberFilterField({
  id,
  label,
  value,
  onChange,
  hideLabel = false,
}: {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (value: string) => void;
  hideLabel?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      {hideLabel ? null : <Label htmlFor={id}>{label}</Label>}
      <Input
        id={id}
        type="number"
        value={numericValue(value)}
        onChange={(event) => onChange(event.target.value)}
        className="bg-muted/70 border-border/80 focus-visible:bg-muted"
      />
    </div>
  );
}

function SelectFilterField({
  id,
  label,
  value,
  options,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || "any"} onValueChange={(nextValue) => onChange(nextValue === "any" ? "" : nextValue)}>
        <SelectTrigger id={id} className="bg-muted/70 border-border/80 focus-visible:bg-muted">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function BooleanFilterField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: UniversityAdvancedFilters["scholarshipAvailable"];
  onChange: (value: boolean | undefined) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={boolToSelectValue(value)} onValueChange={(nextValue) => onChange(selectValueToBool(nextValue))}>
        <SelectTrigger id={id} className="bg-muted/70 border-border/80 focus-visible:bg-muted">
          <SelectValue placeholder="Any" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any</SelectItem>
          <SelectItem value="true">Yes</SelectItem>
          <SelectItem value="false">No</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
