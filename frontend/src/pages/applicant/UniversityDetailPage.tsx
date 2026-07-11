import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Award,
  BookOpen,
  Building,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  Globe,
  GraduationCap,
  Home,
  Mail,
  MapPin,
  Phone,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import type { ApplicantApplicationListItem, University } from "../../types/domain";
import { fetchApplicantApplications } from "../../services/applicant/applicationsService";
import {
  addCompareItem,
  COMPARE_LIMIT_MESSAGE,
  fetchCompareList,
  MAX_COMPARE_ITEMS,
  removeCompareItem,
} from "../../services/applicant/compareService";
import { addBasketItem, fetchBasketState, removeBasketItem } from "../../services/applicant/basketService";
import { fetchUniversityById } from "../../services/applicant/universitiesService";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
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

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }
      if (item && typeof item === "object") {
        const row = item as Record<string, unknown>;
        return (
          toStringValue(row.name) ??
          toStringValue(row.title) ??
          toStringValue(row.label) ??
          toStringValue(row.value) ??
          ""
        );
      }
      return "";
    })
    .filter((item) => item.length > 0);
}

interface GeneralRequirement {
  name: string;
  description: string;
  appliesTo: string;
}

interface UniversityProfileSummary {
  website: string | null;
  schoolWebsite: string | null;
  applicationSystem: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  campuses: string[];
  accommodation: string | null;
  chineseName: string | null;
  abbreviation: string | null;
  location: string | null;
  admissionOffice: string | null;
  deadlineNote: string | null;
  programGroups: string | null;
  foundedYear: string | null;
  studentCount: string | null;
  facultyCount: string | null;
  accreditations: string[];
  generalRequirements: GeneralRequirement[];
  testRequirements: {
    ieltsMin: number | null;
    toeflMin: number | null;
    hskLevel: number | null;
  };
}

function summarizeUniversityProfile(profile: Record<string, unknown> | null): UniversityProfileSummary {
  const empty: UniversityProfileSummary = {
    website: null,
    schoolWebsite: null,
    applicationSystem: null,
    contactEmail: null,
    contactPhone: null,
    address: null,
    campuses: [],
    accommodation: null,
    chineseName: null,
    abbreviation: null,
    location: null,
    admissionOffice: null,
    deadlineNote: null,
    programGroups: null,
    foundedYear: null,
    studentCount: null,
    facultyCount: null,
    accreditations: [],
    generalRequirements: [],
    testRequirements: { ieltsMin: null, toeflMin: null, hskLevel: null },
  };

  if (!profile) {
    return empty;
  }

  const testReqs = toRecord(profile.testRequirements);

  return {
    website:
      toStringValue(profile.website) ??
      toStringValue(profile.websiteUrl) ??
      toStringValue(profile.site),
    schoolWebsite: toStringValue(profile.schoolWebsite),
    applicationSystem: toStringValue(profile.applicationSystem),
    contactEmail:
      toStringValue(profile.contactEmail) ??
      toStringValue(profile.contact_email) ??
      toStringValue(profile.email),
    contactPhone: toStringValue(profile.contactPhone),
    address: toStringValue(profile.address),
    campuses: toStringArray(profile.campuses),
    accommodation: toStringValue(profile.accommodation),
    chineseName: toStringValue(profile.chineseName),
    abbreviation: toStringValue(profile.abbreviation),
    location: toStringValue(profile.location),
    admissionOffice: toStringValue(profile.admissionOffice),
    deadlineNote: toStringValue(profile.deadlineNote),
    programGroups: toStringValue(profile.programGroups),
    foundedYear:
      toDisplayValue(profile.foundedYear) ??
      toDisplayValue(profile.founded_year) ??
      toDisplayValue(profile.establishedYear) ??
      toDisplayValue(profile.established_year),
    studentCount:
      toDisplayValue(profile.studentCount) ??
      toDisplayValue(profile.student_count) ??
      toDisplayValue(profile.students),
    facultyCount:
      toDisplayValue(profile.facultyCount) ??
      toDisplayValue(profile.faculty_count) ??
      toDisplayValue(profile.faculty),
    accreditations: toStringArray(profile.accreditations),
    generalRequirements: Array.isArray(profile.generalRequirements)
      ? (profile.generalRequirements as GeneralRequirement[])
      : [],
    testRequirements: {
      ieltsMin: testReqs?.ieltsMin ? Number(testReqs.ieltsMin) : null,
      toeflMin: testReqs?.toeflMin ? Number(testReqs.toeflMin) : null,
      hskLevel: testReqs?.hskLevel ? Number(testReqs.hskLevel) : null,
    },
  };
}

function formatFieldLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toProgramList(university: University): UniversityProgram[] {
  const profile = toRecord(university.universityProfile);
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
  const [existingApplications, setExistingApplications] = useState<ApplicantApplicationListItem[]>([]);
  const [isInCompare, setIsInCompare] = useState(false);
  const [compareCount, setCompareCount] = useState(0);
  const [compareFeedback, setCompareFeedback] = useState<string | null>(null);
  const [isInBasket, setIsInBasket] = useState(false);
  const [basketFeedback, setBasketFeedback] = useState<string | null>(null);
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
          fetchApplicantApplications().catch(() => []),
        ]);
        setUniversity(universityData);
        setCompareCount(compareList.length);
        setIsInCompare(compareList.some((item) => item.id === id));
        setCompareFeedback(null);
        setBasketFeedback(null);
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
        setCompareCount((prev) => Math.max(0, prev - 1));
        setCompareFeedback(null);
      } else {
        if (compareCount >= MAX_COMPARE_ITEMS) {
          setCompareFeedback(COMPARE_LIMIT_MESSAGE);
          return;
        }
        await addCompareItem(university.id);
        setIsInCompare(true);
        setCompareCount((prev) => prev + 1);
        setCompareFeedback(null);
      }
    } catch (error) {
      setCompareFeedback(error instanceof Error ? error.message : "Failed to update compare list.");
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
      setBasketFeedback(null);
    } catch {
      setBasketFeedback("Unable to update your basket right now. Please try again.");
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

  const universityProfile = toRecord(university.universityProfile);
  const universityProfileSummary = summarizeUniversityProfile(universityProfile);
  const programs = toProgramList(university);
  const intakeTerms = toIntakeTerms(universityProfile);
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
        href: routes.applicant.applicationDetail(
          existingSubmittedApplication.universityId,
          existingSubmittedApplication.applicationCycle,
        ),
        label: "Open Application",
      }
    : existingDraftApplication
      ? {
          href: `${routes.applicant.applicationCreate(university.id)}?mode=draft&cycle=${encodeURIComponent(existingDraftApplication.applicationCycle)}`,
          label: "Resume Draft",
        }
      : {
          href: routes.applicant.applicationCreate(university.id),
          label: "Apply Now",
        };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link to={routes.applicant.universities}>
        <Button variant="ghost" size="sm" className="w-full justify-start sm:w-auto">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to results
        </Button>
      </Link>

      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div className="brand-logo-mark flex h-20 w-20 items-center justify-center rounded-[1.75rem] text-xl font-semibold text-white shadow-[0_26px_44px_-28px_rgba(20,90,67,0.7)]">
            {university.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-2xl font-semibold sm:text-3xl">{university.name}</h1>
              <Badge variant="secondary" className="brand-soft-badge">
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
          {existingSubmittedApplication ? (
            <Link to={primaryAction.href}>
              <Button className="w-full sm:w-auto">
                <Send className="mr-2 h-4 w-4" />
                {primaryAction.label}
              </Button>
            </Link>
          ) : (
            <Button
              className="w-full sm:w-auto"
              onClick={() => toast.info("Coming soon", { description: "Currently not available. Please check back later." })}
            >
              <Send className="mr-2 h-4 w-4" />
              {primaryAction.label}
            </Button>
          )}
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
        {compareFeedback ? (
          <Alert className="border-primary/20 bg-card/80">
            <AlertCircle className="h-4 w-4 text-primary" />
            <AlertTitle>Compare table full</AlertTitle>
            <AlertDescription>{compareFeedback}</AlertDescription>
          </Alert>
        ) : null}
        {basketFeedback ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Basket update failed</AlertTitle>
            <AlertDescription>{basketFeedback}</AlertDescription>
          </Alert>
        ) : null}
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
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  {university.description ??
                    "No detailed overview has been published for this university yet."}
                </p>

                {universityProfileSummary.chineseName || universityProfileSummary.abbreviation ? (
                  <div className="flex flex-wrap gap-2">
                    {universityProfileSummary.chineseName ? (
                      <Badge variant="outline">{universityProfileSummary.chineseName}</Badge>
                    ) : null}
                    {universityProfileSummary.abbreviation ? (
                      <Badge variant="secondary">{universityProfileSummary.abbreviation}</Badge>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Links & Contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {universityProfileSummary.website ? (
                    <a
                      href={universityProfileSummary.website.startsWith("http") ? universityProfileSummary.website : `https://${universityProfileSummary.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
                    >
                      <Globe className="mt-0.5 h-5 w-5 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">University Website</div>
                        <div className="mt-1 truncate font-medium text-slate-900">{universityProfileSummary.website.replace(/^https?:\/\//, "")}</div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  ) : null}
                  {universityProfileSummary.applicationSystem ? (
                    <a
                      href={universityProfileSummary.applicationSystem.startsWith("http") ? universityProfileSummary.applicationSystem : `https://${universityProfileSummary.applicationSystem}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
                    >
                      <Send className="mt-0.5 h-5 w-5 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Application System</div>
                        <div className="mt-1 truncate font-medium text-slate-900">{universityProfileSummary.applicationSystem.replace(/^https?:\/\//, "")}</div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  ) : null}
                  {universityProfileSummary.schoolWebsite && universityProfileSummary.schoolWebsite !== universityProfileSummary.website ? (
                    <a
                      href={universityProfileSummary.schoolWebsite.startsWith("http") ? universityProfileSummary.schoolWebsite : `https://${universityProfileSummary.schoolWebsite}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
                    >
                      <Building className="mt-0.5 h-5 w-5 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">School Website</div>
                        <div className="mt-1 truncate font-medium text-slate-900">{universityProfileSummary.schoolWebsite.replace(/^https?:\/\//, "")}</div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  ) : null}
                  {universityProfileSummary.contactEmail ? (
                    <a
                      href={`mailto:${universityProfileSummary.contactEmail.split(";")[0].trim()}`}
                      className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
                    >
                      <Mail className="mt-0.5 h-5 w-5 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Contact Email</div>
                        <div className="mt-1 break-all text-sm font-medium text-slate-900">{universityProfileSummary.contactEmail}</div>
                      </div>
                    </a>
                  ) : null}
                  {universityProfileSummary.contactPhone ? (
                    <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
                      <Phone className="mt-0.5 h-5 w-5 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Phone</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">{universityProfileSummary.contactPhone}</div>
                      </div>
                    </div>
                  ) : null}
                  {universityProfileSummary.address ? (
                    <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-4 sm:col-span-2 lg:col-span-1">
                      <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">Address</div>
                        <div className="mt-1 text-sm font-medium text-slate-900">{universityProfileSummary.address}</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {universityProfileSummary.campuses.length > 0 || universityProfileSummary.accommodation ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-primary" />
                    Campus Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {universityProfileSummary.campuses.length > 0 ? (
                    <div>
                      <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Campuses</div>
                      <div className="flex flex-wrap gap-2">
                        {universityProfileSummary.campuses.map((campus) => (
                          <Badge key={campus} variant="outline" className="border-slate-300">
                            {campus}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {universityProfileSummary.accommodation ? (
                    <div>
                      <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Accommodation</div>
                      <p className="text-sm text-slate-700">{universityProfileSummary.accommodation}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {universityProfileSummary.deadlineNote ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Application Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-700">{universityProfileSummary.deadlineNote}</p>
                </CardContent>
              </Card>
            ) : null}

            {intakeTerms.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    Upcoming Intake Terms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {intakeTerms.map((term) => (
                      <div key={term.id} className="flex flex-col gap-1 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="font-medium text-slate-900">{term.term}</span>
                        <span className="text-sm text-muted-foreground">
                          Deadline: {formatDateLabel(term.deadline)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
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
                    <Link
                      key={program.id}
                      to={routes.applicant.programDetail(university.id, program.id)}
                      className="group rounded-xl border border-slate-200 p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">
                          <GraduationCap className="h-4 w-4" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="font-medium text-slate-900 group-hover:text-primary">
                            {program.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {[program.level, program.duration].filter(Boolean).join(" · ") || "View program details"}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </Link>
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
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Application Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-700">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="mb-1 font-medium text-slate-900">Application Deadline</div>
                    <div>{formatDateLabel(university.applicationDeadline)}</div>
                  </div>
                  {university.applicationFee ? (
                    <div className="rounded-lg border border-slate-200 p-4">
                      <div className="mb-1 font-medium text-slate-900">Application Fee</div>
                      <div>{formatRmb(university.applicationFee, { fallback: "N/A" })}</div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Test Score Requirements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-slate-700">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {universityProfileSummary.testRequirements.ieltsMin ? (
                      <div className="rounded-lg bg-slate-50 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">IELTS</div>
                        <div className="text-lg font-semibold text-slate-900">{universityProfileSummary.testRequirements.ieltsMin}+</div>
                      </div>
                    ) : null}
                    {universityProfileSummary.testRequirements.toeflMin ? (
                      <div className="rounded-lg bg-slate-50 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">TOEFL</div>
                        <div className="text-lg font-semibold text-slate-900">{universityProfileSummary.testRequirements.toeflMin}+</div>
                      </div>
                    ) : null}
                    {universityProfileSummary.testRequirements.hskLevel ? (
                      <div className="rounded-lg bg-slate-50 px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">HSK Level</div>
                        <div className="text-lg font-semibold text-slate-900">{universityProfileSummary.testRequirements.hskLevel}+</div>
                      </div>
                    ) : null}
                  </div>
                  {!universityProfileSummary.testRequirements.ieltsMin &&
                   !universityProfileSummary.testRequirements.toeflMin &&
                   !universityProfileSummary.testRequirements.hskLevel ? (
                    <p className="text-muted-foreground">No minimum test scores have been published.</p>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            {universityProfileSummary.generalRequirements.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    General Admission Requirements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {universityProfileSummary.generalRequirements.map((req, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-200 p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                            <span className="font-medium text-slate-900">{req.name}</span>
                          </div>
                          <Badge variant="secondary" className="w-fit text-xs">
                            {req.appliesTo}
                          </Badge>
                        </div>
                        <p className="mt-2 pl-6 text-sm text-muted-foreground">{req.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : admissionRequirements.requiredFields.length > 0 || admissionRequirements.requiredDocuments.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {admissionRequirements.requiredFields.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Required Application Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {admissionRequirements.requiredFields.map((field) => (
                          <li key={field} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                            <span>{field}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ) : null}
                {admissionRequirements.requiredDocuments.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle>Required Documents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {admissionRequirements.requiredDocuments.map((field) => (
                          <li key={field} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                            <span>{field}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    No detailed admission requirements have been published for this university yet.
                  </p>
                </CardContent>
              </Card>
            )}
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
