import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Globe,
  GraduationCap,
  MapPin,
  Send,
} from "lucide-react";
import type { StudentApplicationListItem, University } from "../../types/domain";
import { fetchStudentApplications } from "../../services/client/applicationsService";
import { addCompareItem, fetchCompareList, removeCompareItem } from "../../services/client/compareService";
import { addBasketItem, fetchBasketState, removeBasketItem } from "../../services/client/basketService";
import { fetchUniversityById } from "../../services/client/universitiesService";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { EmptyState, ErrorState, LoadingState } from "../../components/common/PageState";
import { routes } from "../../routes/routeConfig";
import { formatRmb } from "../../utils/currency";

interface UniversityProgram {
  id: string;
  name: string;
  level: string | null;
  duration: string | null;
}

interface IntakeTerm {
  id: string;
  term: string;
  deadline: string | null;
}

const defaultApplicationCycle = "2026-Fall";

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function toStringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toDisplayValue(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return toStringValue(value);
}

function formatFieldLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toProgramList(university: University): UniversityProgram[] {
  const profile = toRecord(university.managementProfile);
  const profileItems = Array.isArray(profile?.programs) ? profile.programs : [];
  const normalizedProfileItems = profileItems
    .map((item, index) => {
      const row = toRecord(item);
      if (!row) {
        return null;
      }
      const name = toStringValue(row.name);
      if (!name) {
        return null;
      }
      return {
        id: toStringValue(row.id) ?? `program-${index + 1}`,
        name,
        level: toStringValue(row.level),
        duration: toStringValue(row.duration),
      };
    })
    .filter((item): item is UniversityProgram => item !== null);

  if (normalizedProfileItems.length > 0) {
    return normalizedProfileItems;
  }

  const metadata = toRecord(university.metadata);
  const metadataItems = Array.isArray(metadata?.programs) ? metadata.programs : [];
  return metadataItems
    .map((item, index) => {
      if (typeof item === "string" && item.trim().length > 0) {
        return {
          id: `metadata-program-${index + 1}`,
          name: item.trim(),
          level: null,
          duration: null,
        };
      }
      const row = toRecord(item);
      const name = toStringValue(row?.name);
      if (!name) {
        return null;
      }
      return {
        id: toStringValue(row?.id) ?? `metadata-program-${index + 1}`,
        name,
        level: toStringValue(row?.level),
        duration: toStringValue(row?.duration),
      };
    })
    .filter((item): item is UniversityProgram => item !== null);
}

function toIntakeTerms(profile: Record<string, unknown> | null): IntakeTerm[] {
  const items = Array.isArray(profile?.intakeTerms) ? profile.intakeTerms : [];
  return items
    .map((item, index) => {
      const row = toRecord(item);
      const term = toStringValue(row?.term);
      if (!term) {
        return null;
      }
      return {
        id: toStringValue(row?.id) ?? `intake-${index + 1}`,
        term,
        deadline: toStringValue(row?.deadline),
      };
    })
    .filter((item): item is IntakeTerm => item !== null);
}

function formatDateLabel(value: string | null): string {
  if (!value) {
    return "Not provided";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString();
}

function buildMinimumScoreRows(university: University): Array<{ label: string; value: string }> {
  const profile = toRecord(university.managementProfile);
  const testRequirements = toRecord(profile?.testRequirements);
  const rows = [
    {
      label: "SAT",
      value: toDisplayValue(testRequirements?.satMin) ?? null,
    },
    {
      label: "ACT",
      value: toDisplayValue(testRequirements?.actMin) ?? null,
    },
    {
      label: "IELTS",
      value:
        toDisplayValue(testRequirements?.ieltsMin) ??
        (university.ieltsMin !== null ? String(university.ieltsMin) : null),
    },
    {
      label: "TOEFL",
      value:
        toDisplayValue(testRequirements?.toeflMin) ??
        (university.toeflMin !== null ? String(university.toeflMin) : null),
    },
  ];

  return rows.filter((row): row is { label: string; value: string } => Boolean(row.value));
}

function buildSchemaRequirements(university: University) {
  const schema = toRecord(university.applicationSchema);
  const sections = Array.isArray(schema?.sections) ? schema.sections : [];
  const flatFields = Array.isArray(schema?.fields) ? schema.fields : [];
  const requiredFields = new Set<string>();
  const requiredDocuments = new Set<string>();
  const collectedFields = sections.length > 0
    ? sections.flatMap((section) => {
        const row = toRecord(section);
        return Array.isArray(row?.fields) ? row.fields : [];
      })
    : flatFields;

  for (const field of collectedFields) {
    const descriptor = toRecord(field);
    if (!descriptor) {
      continue;
    }
    const rawName = toStringValue(descriptor.label) ?? toStringValue(descriptor.name) ?? "Application field";
    const label = formatFieldLabel(rawName);
    const fieldType = toStringValue(descriptor.type) ?? "";
    const required = descriptor.required === true;

    if (required) {
      requiredFields.add(label);
    }
    if ((fieldType === "document" || fieldType === "file-upload") && required) {
      requiredDocuments.add(label);
    }
  }

  return {
    requiredFields: Array.from(requiredFields),
    requiredDocuments: Array.from(requiredDocuments),
  };
}

export function UniversityDetailPage() {
  const { id = "" } = useParams();
  const [university, setUniversity] = useState<University | null>(null);
  const [existingApplications, setExistingApplications] = useState<StudentApplicationListItem[]>([]);
  const [isInCompare, setIsInCompare] = useState(false);
  const [isInBasket, setIsInBasket] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [universityData, compareList, basketState, applications] = await Promise.all([
          fetchUniversityById(id),
          fetchCompareList().catch(() => []),
          fetchBasketState().catch(() => null),
          fetchStudentApplications().catch(() => []),
        ]);
        setUniversity(universityData);
        setIsInCompare(compareList.some((item) => item.id === id));
        setIsInBasket(basketState?.items.some((item) => item.id === id) ?? false);
        setExistingApplications(applications.filter((item) => item.universityId === id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load university");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id]);

  const toggleCompare = async () => {
    if (!university) return;
    try {
      if (isInCompare) {
        await removeCompareItem(university.id);
        setIsInCompare(false);
      } else {
        await addCompareItem(university.id);
        setIsInCompare(true);
      }
    } catch {
      // Keep the view stable if favorite update fails.
    }
  };

  const toggleBasket = async () => {
    if (!university) return;
    try {
      if (isInBasket) {
        await removeBasketItem(university.id);
        setIsInBasket(false);
      } else {
        await addBasketItem(university.id);
        setIsInBasket(true);
      }
    } catch {
      // Keep the view stable if basket update fails.
    }
  };

  if (loading) return <LoadingState label="Loading university..." />;
  if (error) return <ErrorState message={error} />;
  if (!university) {
    return (
      <EmptyState
        title="University missing"
        description="No university details were returned for this ID."
      />
    );
  }

  const managementProfile = toRecord(university.managementProfile);
  const programs = toProgramList(university);
  const intakeTerms = toIntakeTerms(managementProfile);
  const minimumScores = buildMinimumScoreRows(university);
  const admissionRequirements = buildSchemaRequirements(university);
  const existingSubmittedApplication =
    existingApplications.find(
      (item) => item.applicationCycle === defaultApplicationCycle && item.status !== "draft",
    ) ?? null;
  const existingDraftApplication =
    existingApplications.find(
      (item) => item.applicationCycle === defaultApplicationCycle && item.status === "draft",
    ) ?? null;
  const primaryAction = existingSubmittedApplication
    ? {
        href: routes.student.applicationDetail(
          existingSubmittedApplication.universityId,
          existingSubmittedApplication.applicationCycle,
        ),
        label: "Open Application",
      }
    : existingDraftApplication
      ? {
          href: `${routes.student.applicationCreate(university.id)}?mode=draft&cycle=${encodeURIComponent(existingDraftApplication.applicationCycle)}`,
          label: "Resume Draft",
        }
      : {
          href: routes.student.applicationCreate(university.id),
          label: "Apply Now",
        };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link to={routes.student.universities}>
        <Button variant="ghost" size="sm" className="w-full justify-start sm:w-auto">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to results
        </Button>
      </Link>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-xl font-semibold text-white">
            {university.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-2xl font-semibold sm:text-3xl">{university.name}</h1>
              <Badge variant="secondary" className="bg-[#4F46E5]/10 text-[#4F46E5]">
                {university.ranking ? `${Math.max(60, 300 - university.ranking)}% Match` : "N/A Match"}
              </Badge>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground sm:gap-4">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {[university.city, university.country, university.province].filter(Boolean).join(", ") || "Location unavailable"}
              </span>
              <span className="flex items-center gap-1.5">
                <Award className="h-4 w-4" />
                Ranking #{university.ranking ?? "N/A"}
              </span>
              <span className="flex items-center gap-1.5">
                <Globe className="h-4 w-4" />
                University profile
              </span>
            </div>
            <p className="max-w-3xl text-muted-foreground">
              {university.description ?? "No description is available for this university yet."}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Link to={primaryAction.href}>
            <Button className="w-full bg-[#4F46E5] hover:bg-[#4338CA] sm:w-auto">
              <Send className="mr-2 h-4 w-4" />
              {primaryAction.label}
            </Button>
          </Link>
          <Button className="w-full sm:w-auto" variant={isInBasket ? "default" : "outline"} onClick={() => void toggleBasket()}>
            {isInBasket ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Added to Basket
              </>
            ) : (
              "Add to Basket"
            )}
          </Button>
          <Button className="w-full sm:w-auto" variant={isInCompare ? "default" : "outline"} onClick={() => void toggleCompare()}>
            {isInCompare ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Added to Compare
              </>
            ) : (
              "Add to Compare"
            )}
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <Award className="mb-2 h-5 w-5 text-muted-foreground" />
            <div className="text-2xl font-semibold">#{university.ranking ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground">Global Ranking</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <DollarSign className="mb-2 h-5 w-5 text-muted-foreground" />
            <div className="text-2xl font-semibold">{formatRmb(university.tuitionFee ?? university.applicationFee, { fallback: "N/A" })}</div>
            <p className="text-xs text-muted-foreground">Tuition / Fee</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <Globe className="mb-2 h-5 w-5 text-muted-foreground" />
            <div className="text-2xl font-semibold">{university.country ?? university.province ?? "N/A"}</div>
            <p className="text-xs text-muted-foreground">Country</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <CheckCircle2 className="mb-2 h-5 w-5 text-muted-foreground" />
            <div className="text-2xl font-semibold">{university.createdAt ? "Open" : "N/A"}</div>
            <p className="text-xs text-muted-foreground">Admissions</p>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="admissions">Admissions</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                {university.description ??
                  "No detailed overview has been published for this university yet."}
              </p>
              {intakeTerms.length > 0 ? (
                <div className="space-y-3 rounded-lg border border-slate-200 p-4 text-slate-700">
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    <CalendarDays className="h-4 w-4 text-[#4F46E5]" />
                    Upcoming intake terms
                  </div>
                  <div className="space-y-2">
                    {intakeTerms.map((term) => (
                      <div key={term.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-medium text-slate-900">{term.term}</span>
                        <span className="text-sm text-muted-foreground">
                          Deadline: {formatDateLabel(term.deadline)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="programs">
          <Card>
            <CardHeader>
              <CardTitle>Programs Offered</CardTitle>
            </CardHeader>
            <CardContent>
              {programs.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {programs.map((program) => (
                    <div key={program.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-lg bg-[#4F46E5]/10 p-2 text-[#4F46E5]">
                          <GraduationCap className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                          <div className="font-medium text-slate-900">{program.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {[program.level, program.duration].filter(Boolean).join(" · ") || "Program details pending"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No programs have been published for this university yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="admissions">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Admission Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-700">
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-1 font-medium text-slate-900">Application deadline</div>
                  <div>{formatDateLabel(university.applicationDeadline)}</div>
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-2 flex items-center gap-2 font-medium text-slate-900">
                    <BookOpen className="h-4 w-4 text-[#4F46E5]" />
                    Required application items
                  </div>
                  {admissionRequirements.requiredFields.length > 0 ? (
                    <ul className="space-y-2 text-muted-foreground">
                      {admissionRequirements.requiredFields.map((field) => (
                        <li key={field} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#4F46E5]" />
                          <span>{field}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">The university has not published required application fields yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Tests and Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-slate-700">
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-2 font-medium text-slate-900">Minimum test scores</div>
                  {minimumScores.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {minimumScores.map((row) => (
                        <div key={row.label} className="rounded-lg bg-slate-50 px-3 py-2">
                          <div className="text-xs uppercase tracking-wide text-muted-foreground">{row.label}</div>
                          <div className="font-medium text-slate-900">{row.value}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No minimum standardized test scores have been published.</p>
                  )}
                </div>
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="mb-2 font-medium text-slate-900">Required supporting documents</div>
                  {admissionRequirements.requiredDocuments.length > 0 ? (
                    <ul className="space-y-2 text-muted-foreground">
                      {admissionRequirements.requiredDocuments.map((field) => (
                        <li key={field} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#4F46E5]" />
                          <span>{field}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">No required supporting documents have been published.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="costs">
          <Card>
            <CardHeader>
              <CardTitle>Costs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Application fee: {formatRmb(university.applicationFee, { fallback: "N/A" })}</p>
              <p>
                Tuition: {formatRmb(university.tuitionFee, { fallback: "N/A" })}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
