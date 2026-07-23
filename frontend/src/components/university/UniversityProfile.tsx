import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  Building2,
  ClipboardList,
  Eye,
  Globe,
  GraduationCap,
  Mail,
  MapPin,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { ErrorState, LoadingState, SuccessState } from "../common/PageState";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import type { University } from "../../types/domain";
import type { UniversityProfileUpdatePayload } from "../../services/universityProfileUpdate";

export type UniversityProfileMode = "view" | "edit";

interface UniversityProfileProps {
  universityId: string | null;
  loadUniversity: (universityId: string) => Promise<University>;
  saveUniversity?: (universityId: string, payload: UniversityProfileUpdatePayload) => Promise<void>;
  mode?: UniversityProfileMode;
  pageTitle?: string;
  pageDescription?: string;
  missingContextMessage?: string;
  cancelLabel?: string;
  editLabel?: string;
  onCancel?: () => void;
  onEdit?: () => void;
}

type AvailabilityState = "available" | "unavailable" | "unknown";

interface ProfileDraft {
  universityName: string;
  description: string;
  location: string;
  website: string;
  contactEmail: string;
  foundedYear: string;
  studentCount: string;
  facultyCount: string;
  acceptanceRate: string;
  accreditations: string[];
  tuitionFee: string;
  tuitionUnavailable: boolean;
  applicationFee: string;
  rollingAdmission: boolean;
  scholarshipAvailability: AvailabilityState;
  scholarshipNotes: string;
  dormitoryAvailability: AvailabilityState;
  dormitoryNotes: string;
  studentServices: string;
  admissionRequirements: string[];
}

interface ProgramDraft {
  id: string;
  name: string;
  level: "Undergraduate" | "Graduate" | "Doctorate";
  duration: string;
  language: string;
  studyFormat: string;
  tuitionFee: string;
}

interface IntakeTermDraft {
  id: string;
  term: string;
  deadline: string;
}

interface TestRequirementsDraft {
  satMin: string;
  actMin: string;
  ieltsMin: string;
  toeflMin: string;
  hskMin: string;
  cscaMin: string;
}

const EMPTY_PROFILE_DRAFT: ProfileDraft = {
  universityName: "",
  description: "",
  location: "",
  website: "",
  contactEmail: "",
  foundedYear: "",
  studentCount: "",
  facultyCount: "",
  acceptanceRate: "",
  accreditations: [],
  tuitionFee: "",
  tuitionUnavailable: false,
  applicationFee: "",
  rollingAdmission: false,
  scholarshipAvailability: "unknown",
  scholarshipNotes: "",
  dormitoryAvailability: "unknown",
  dormitoryNotes: "",
  studentServices: "",
  admissionRequirements: [],
};

const EMPTY_TEST_REQUIREMENTS: TestRequirementsDraft = {
  satMin: "",
  actMin: "",
  ieltsMin: "",
  toeflMin: "",
  hskMin: "",
  cscaMin: "",
};

const labels = {
  en: {
    completion: (value: number) => `University profile: ${value}% complete`,
    missing: "Missing information",
    sections: {
      profile: "University Profile",
      programs: "Programs",
      tuition: "Tuition and Fees",
      admissions: "Admissions",
      scholarships: "Scholarships and Opportunities",
      dormitory: "Dormitory and Student Services",
      preview: "Preview and Publishing",
    },
    preview: {
      search: "Search card",
      details: "Details page",
      programs: "Programs",
      application: "Application page",
      compare: "Compare page",
    },
  },
  ru: {
    completion: (value: number) => `Профиль университета заполнен на ${value}%`,
    missing: "Не хватает информации",
    sections: {
      profile: "Профиль университета",
      programs: "Программы",
      tuition: "Стоимость обучения и сборы",
      admissions: "Приём",
      scholarships: "Стипендии и возможности",
      dormitory: "Общежитие и студенческие сервисы",
      preview: "Предпросмотр и публикация",
    },
    preview: {
      search: "Карточка в поиске",
      details: "Страница университета",
      programs: "Программы",
      application: "Страница заявки",
      compare: "Страница сравнения",
    },
  },
  uz: {
    completion: (value: number) => `Universitet profili ${value}% to‘ldirilgan`,
    missing: "Yetishmayotgan ma’lumotlar",
    sections: {
      profile: "Universitet profili",
      programs: "Dasturlar",
      tuition: "Kontrakt va to‘lovlar",
      admissions: "Qabul",
      scholarships: "Stipendiyalar va imkoniyatlar",
      dormitory: "Yotoqxona va talabalar xizmatlari",
      preview: "Ko‘rib chiqish va nashr qilish",
    },
    preview: {
      search: "Qidiruv kartasi",
      details: "Universitet sahifasi",
      programs: "Dasturlar",
      application: "Ariza sahifasi",
      compare: "Taqqoslash sahifasi",
    },
  },
};

function activeLabels(language?: string) {
  if (language?.startsWith("ru")) return labels.ru;
  if (language?.startsWith("uz")) return labels.uz;
  return labels.en;
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function toString(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" ? value : "";
}

function toBool(value: unknown): boolean {
  return value === true;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function toAvailability(value: unknown): AvailabilityState {
  return value === "available" || value === "unavailable" ? value : "unknown";
}

function toDateInput(value: string | null | undefined): string {
  return typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : "";
}

function toIsoDate(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? new Date(`${trimmed}T00:00:00.000Z`).toISOString() : null;
}

function parseNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoney(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : parseNullableNumber(String(value ?? ""));
  return parsed !== null ? `¥${parsed.toLocaleString()}` : "N/A";
}

function boolFromAvailability(value: AvailabilityState): boolean | null {
  if (value === "available") return true;
  if (value === "unavailable") return false;
  return null;
}

function toPrograms(value: unknown): ProgramDraft[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const source = toRecord(item);
      if (!source) return null;
      const rawLevel = toString(source.level);
      return {
        id: toString(source.id) || createId("program"),
        name: toString(source.name),
        level: rawLevel === "Graduate" || rawLevel === "Doctorate" ? rawLevel : "Undergraduate",
        duration: toString(source.duration),
        language: toString(source.language),
        studyFormat: toString(source.studyFormat ?? source.study_format),
        tuitionFee: toString(source.tuitionFee ?? source.tuition_fee),
      };
    })
    .filter((item): item is ProgramDraft => item !== null);
}

function toIntakeTerms(value: unknown): IntakeTermDraft[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const source = toRecord(item);
      if (!source) return null;
      return {
        id: toString(source.id) || createId("term"),
        term: toString(source.term),
        deadline: toDateInput(toString(source.deadline)),
      };
    })
    .filter((item): item is IntakeTermDraft => item !== null);
}

function buildProfileDraft(university: University) {
  const universityProfile = toRecord(university.universityProfile) ?? {};
  const testRequirements = toRecord(universityProfile.testRequirements) ?? {};

  return {
    profile: {
      universityName: university.name,
      description: university.description ?? "",
      location: [university.city, university.country].filter(Boolean).join(", "),
      website: toString(universityProfile.website),
      contactEmail: toString(universityProfile.contactEmail),
      foundedYear: toString(universityProfile.foundedYear),
      studentCount: toString(universityProfile.studentCount),
      facultyCount: toString(universityProfile.facultyCount),
      acceptanceRate: university.acceptanceRate != null ? String(university.acceptanceRate) : toString(universityProfile.acceptanceRate),
      accreditations: toStringArray(universityProfile.accreditations),
      tuitionFee: university.tuitionFee != null ? String(university.tuitionFee) : toString(universityProfile.tuitionFee),
      tuitionUnavailable: toBool(universityProfile.tuitionUnavailable),
      applicationFee: university.applicationFee != null ? String(university.applicationFee) : toString(universityProfile.applicationFee),
      rollingAdmission: toBool(universityProfile.rollingAdmission),
      scholarshipAvailability:
        university.scholarshipAvailable != null
          ? university.scholarshipAvailable ? "available" : "unavailable"
          : toAvailability(universityProfile.scholarshipAvailability),
      scholarshipNotes: toString(universityProfile.scholarshipNotes),
      dormitoryAvailability: toAvailability(universityProfile.dormitoryAvailability),
      dormitoryNotes: toString(universityProfile.dormitoryNotes),
      studentServices: toString(universityProfile.studentServices),
      admissionRequirements: toStringArray(universityProfile.admissionRequirements),
    },
    programs: toPrograms(universityProfile.programs),
    intakeTerms: toIntakeTerms(universityProfile.intakeTerms).length
      ? toIntakeTerms(universityProfile.intakeTerms)
      : university.applicationDeadline
        ? [{ id: createId("term"), term: "Main intake", deadline: toDateInput(university.applicationDeadline) }]
        : [],
    testRequirements: {
      satMin: toString(testRequirements.satMin),
      actMin: toString(testRequirements.actMin),
      ieltsMin: university.ieltsMin != null ? String(university.ieltsMin) : toString(testRequirements.ieltsMin),
      toeflMin: university.toeflMin != null ? String(university.toeflMin) : toString(testRequirements.toeflMin),
      hskMin: toString(testRequirements.hskMin),
      cscaMin: toString(testRequirements.cscaMin),
    },
  };
}

function calculateCompletion(profile: ProfileDraft, programs: ProgramDraft[], intakeTerms: IntakeTermDraft[]) {
  const requirements = [
    { label: "General university information", done: Boolean(profile.universityName.trim() && profile.description.trim() && profile.location.trim()) },
    { label: "At least one active program", done: programs.some((program) => program.name.trim()) },
    { label: "Program language", done: programs.some((program) => program.language.trim()) },
    { label: "Study format", done: programs.some((program) => program.studyFormat.trim()) },
    { label: "Degree level", done: programs.some((program) => program.level) },
    { label: "Program duration", done: programs.some((program) => program.duration.trim()) },
    { label: "Annual contract amount", done: Boolean(profile.tuitionUnavailable || parseNullableNumber(profile.tuitionFee) !== null || programs.some((program) => parseNullableNumber(program.tuitionFee) !== null)) },
    { label: "Application deadline", done: Boolean(profile.rollingAdmission || intakeTerms.some((term) => term.deadline.trim())) },
    { label: "Admission requirements", done: profile.admissionRequirements.length > 0 },
    { label: "Scholarship availability", done: profile.scholarshipAvailability !== "unknown" },
    { label: "Dormitory availability", done: profile.dormitoryAvailability !== "unknown" },
  ];
  const completed = requirements.filter((item) => item.done).length;
  return {
    value: Math.round((completed / requirements.length) * 100),
    missing: requirements.filter((item) => !item.done).map((item) => item.label),
  };
}

export function UniversityProfile({
  universityId,
  loadUniversity,
  saveUniversity,
  mode = "edit",
  pageTitle = "University Profile",
  pageDescription = "Manage the live university profile shown across Kallisto.",
  missingContextMessage = "Missing valid university context.",
  cancelLabel,
  editLabel = "Edit Profile",
  onCancel,
  onEdit,
}: UniversityProfileProps) {
  const { i18n } = useTranslation();
  const copy = activeLabels(i18n.language);
  const isReadOnly = mode === "view";
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(EMPTY_PROFILE_DRAFT);
  const [programs, setPrograms] = useState<ProgramDraft[]>([]);
  const [intakeTerms, setIntakeTerms] = useState<IntakeTermDraft[]>([]);
  const [testRequirements, setTestRequirements] = useState<TestRequirementsDraft>(EMPTY_TEST_REQUIREMENTS);
  const [newAccreditation, setNewAccreditation] = useState("");
  const [newRequirement, setNewRequirement] = useState("");

  const completion = useMemo(() => calculateCompletion(profileDraft, programs, intakeTerms), [profileDraft, programs, intakeTerms]);

  const load = useCallback(async () => {
    if (!universityId) {
      setLoadError(missingContextMessage);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const university = await loadUniversity(universityId);
      const loaded = buildProfileDraft(university);
      setProfileDraft(loaded.profile);
      setPrograms(loaded.programs);
      setIntakeTerms(loaded.intakeTerms);
      setTestRequirements(loaded.testRequirements);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load university profile");
    } finally {
      setLoading(false);
    }
  }, [loadUniversity, missingContextMessage, universityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = useCallback(async () => {
    if (isReadOnly || !saveUniversity || !universityId) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const [cityPart, countryPart] = profileDraft.location.split(",").map((value) => value.trim()).filter(Boolean);
    const primaryDeadline = profileDraft.rollingAdmission ? null : intakeTerms.find((term) => term.deadline)?.deadline ?? "";
    const tuitionFee = profileDraft.tuitionUnavailable ? null : parseNullableNumber(profileDraft.tuitionFee);
    const scholarshipAvailable = boolFromAvailability(profileDraft.scholarshipAvailability);

    try {
      await saveUniversity(universityId, {
        name: profileDraft.universityName.trim(),
        description: profileDraft.description.trim() || null,
        city: cityPart || null,
        country: countryPart || null,
        tuitionFee,
        applicationFee: parseNullableNumber(profileDraft.applicationFee),
        applicationDeadline: primaryDeadline ? toIsoDate(primaryDeadline) : null,
        acceptanceRate: parseNullableNumber(profileDraft.acceptanceRate),
        ieltsMin: parseNullableNumber(testRequirements.ieltsMin),
        toeflMin: parseNullableNumber(testRequirements.toeflMin),
        scholarshipAvailable,
        universityProfile: {
          website: profileDraft.website.trim(),
          contactEmail: profileDraft.contactEmail.trim(),
          foundedYear: profileDraft.foundedYear.trim(),
          studentCount: profileDraft.studentCount.trim(),
          facultyCount: profileDraft.facultyCount.trim(),
          tuitionFee,
          tuitionUnavailable: profileDraft.tuitionUnavailable,
          applicationFee: parseNullableNumber(profileDraft.applicationFee),
          programs: programs.map((program) => ({ ...program, tuitionFee: parseNullableNumber(program.tuitionFee) })),
          intakeTerms: intakeTerms.map((term) => ({ ...term, deadline: term.deadline ? toIsoDate(term.deadline) : "" })),
          rollingAdmission: profileDraft.rollingAdmission,
          admissionRequirements: profileDraft.admissionRequirements,
          testRequirements: {
            satMin: parseNullableNumber(testRequirements.satMin),
            actMin: parseNullableNumber(testRequirements.actMin),
            ieltsMin: parseNullableNumber(testRequirements.ieltsMin),
            toeflMin: parseNullableNumber(testRequirements.toeflMin),
            hskMin: parseNullableNumber(testRequirements.hskMin),
            cscaMin: parseNullableNumber(testRequirements.cscaMin),
          },
          scholarshipAvailability: profileDraft.scholarshipAvailability,
          scholarshipNotes: profileDraft.scholarshipNotes.trim(),
          dormitoryAvailability: profileDraft.dormitoryAvailability,
          dormitoryNotes: profileDraft.dormitoryNotes.trim(),
          studentServices: profileDraft.studentServices.trim(),
          accreditations: profileDraft.accreditations,
        },
      });
      setSaveSuccess("Profile saved successfully.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save university profile");
    } finally {
      setSaving(false);
    }
  }, [intakeTerms, isReadOnly, profileDraft, programs, saveUniversity, testRequirements, universityId]);

  const addProgram = () => {
    if (!isReadOnly) setPrograms((current) => [...current, { id: createId("program"), name: "", level: "Undergraduate", duration: "", language: "", studyFormat: "", tuitionFee: "" }]);
  };

  const updateProgram = (id: string, patch: Partial<ProgramDraft>) => {
    if (!isReadOnly) setPrograms((current) => current.map((program) => (program.id === id ? { ...program, ...patch } : program)));
  };

  const addIntakeTerm = () => {
    if (!isReadOnly) setIntakeTerms((current) => [...current, { id: createId("term"), term: "", deadline: "" }]);
  };

  const addListValue = (value: string, onAdd: (value: string) => void, onClear: () => void) => {
    const trimmed = value.trim();
    if (!isReadOnly && trimmed) {
      onAdd(trimmed);
      onClear();
    }
  };

  if (loading) return <LoadingState label="Loading university profile..." />;
  if (loadError) return <ErrorState message={loadError} onRetry={() => void load()} />;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">{pageTitle}</h1>
            <p className="mt-1 text-muted-foreground">{pageDescription}</p>
          </div>
        </div>

        {saveError ? <ErrorState message={saveError} /> : null}
        {saveSuccess ? <SuccessState message={saveSuccess} /> : null}

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>{copy.completion(completion.value)}</CardTitle>
                <CardDescription>Complete the normal university record once. Published values power search, details, applications, Match Score, and compare.</CardDescription>
              </div>
              <Badge variant={completion.value >= 80 ? "default" : "secondary"}>{completion.value}%</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={completion.value} />
            {completion.missing.length ? (
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="mb-2 text-sm font-medium">{copy.missing}</p>
                <div className="flex flex-wrap gap-2">
                  {completion.missing.map((item) => <Badge key={item} variant="outline">{item}</Badge>)}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="brand-icon-tile flex h-12 w-12 items-center justify-center rounded-xl"><Building2 className="h-6 w-6 text-white" /></div>
              <div>
                <CardTitle>{copy.sections.profile}</CardTitle>
                <CardDescription>City, university type, contacts, overview, and accreditation details.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="university-name" label="University Name" className="sm:col-span-2">
              <Input id="university-name" value={profileDraft.universityName} disabled={isReadOnly} onChange={(event) => setProfileDraft((current) => ({ ...current, universityName: event.target.value }))} />
            </Field>
            <Field id="description" label="Description" className="sm:col-span-2">
              <Textarea id="description" rows={5} value={profileDraft.description} disabled={isReadOnly} onChange={(event) => setProfileDraft((current) => ({ ...current, description: event.target.value }))} placeholder="Describe your institution and its strengths." />
            </Field>
            <Field id="location" label="Location">
              <IconInput id="location" icon={<MapPin className="h-4 w-4" />} value={profileDraft.location} disabled={isReadOnly} onChange={(value) => setProfileDraft((current) => ({ ...current, location: value }))} placeholder="City, Country" />
            </Field>
            <Field id="website" label="Website">
              <IconInput id="website" icon={<Globe className="h-4 w-4" />} value={profileDraft.website} disabled={isReadOnly} onChange={(value) => setProfileDraft((current) => ({ ...current, website: value }))} placeholder="https://example.edu" />
            </Field>
            <Field id="contact-email" label="Contact Email">
              <IconInput id="contact-email" icon={<Mail className="h-4 w-4" />} value={profileDraft.contactEmail} disabled={isReadOnly} onChange={(value) => setProfileDraft((current) => ({ ...current, contactEmail: value }))} placeholder="admissions@example.edu" />
            </Field>
            <Field id="founded-year" label="Founded Year">
              <Input id="founded-year" value={profileDraft.foundedYear} disabled={isReadOnly} onChange={(event) => setProfileDraft((current) => ({ ...current, foundedYear: event.target.value }))} placeholder="1890" />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{copy.sections.programs}</CardTitle>
                <CardDescription>Program names, languages, study formats, degree levels, duration, and program tuition.</CardDescription>
              </div>
              {!isReadOnly ? <Button variant="outline" size="sm" onClick={addProgram}><Plus className="mr-2 h-4 w-4" />Add Program</Button> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {programs.length === 0 ? <p className="text-sm text-muted-foreground">No programs are configured yet.</p> : null}
            {programs.map((program, index) => (
              <div key={program.id} className="grid gap-3 rounded-lg border p-4 lg:grid-cols-[1.2fr_160px_150px_150px_130px_auto]">
                <Field id={`program-name-${index}`} label="Program Name"><Input id={`program-name-${index}`} value={program.name} disabled={isReadOnly} onChange={(event) => updateProgram(program.id, { name: event.target.value })} placeholder="Computer Science" /></Field>
                <Field id={`program-level-${index}`} label="Degree Level"><Select value={program.level} disabled={isReadOnly} onValueChange={(value: ProgramDraft["level"]) => updateProgram(program.id, { level: value })}><SelectTrigger id={`program-level-${index}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Undergraduate">Undergraduate</SelectItem><SelectItem value="Graduate">Graduate</SelectItem><SelectItem value="Doctorate">Doctorate</SelectItem></SelectContent></Select></Field>
                <Field id={`program-language-${index}`} label="Language"><Input id={`program-language-${index}`} value={program.language} disabled={isReadOnly} onChange={(event) => updateProgram(program.id, { language: event.target.value })} placeholder="Uzbek / Russian" /></Field>
                <Field id={`program-format-${index}`} label="Study Format"><Input id={`program-format-${index}`} value={program.studyFormat} disabled={isReadOnly} onChange={(event) => updateProgram(program.id, { studyFormat: event.target.value })} placeholder="Full-time" /></Field>
                <Field id={`program-duration-${index}`} label="Duration"><Input id={`program-duration-${index}`} value={program.duration} disabled={isReadOnly} onChange={(event) => updateProgram(program.id, { duration: event.target.value })} placeholder="4 years" /></Field>
                <div className="flex items-end">{!isReadOnly ? <Button variant="ghost" size="icon" onClick={() => setPrograms((current) => current.filter((item) => item.id !== program.id))} aria-label={`Remove ${program.name || "program"}`}><Trash2 className="h-4 w-4" /></Button> : null}</div>
                <Field id={`program-tuition-${index}`} label="Annual Contract Amount" className="lg:col-span-2"><Input id={`program-tuition-${index}`} value={program.tuitionFee} disabled={isReadOnly} onChange={(event) => updateProgram(program.id, { tuitionFee: event.target.value })} placeholder="2500" /></Field>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{copy.sections.tuition}</CardTitle>
            <CardDescription>Contract amounts and application fees used by search, details, applications, and compare.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="tuition-fee" label="Default Annual Contract Amount">
              <Input id="tuition-fee" value={profileDraft.tuitionFee} disabled={isReadOnly || profileDraft.tuitionUnavailable} onChange={(event) => setProfileDraft((current) => ({ ...current, tuitionFee: event.target.value }))} placeholder="2500" />
            </Field>
            <Field id="application-fee" label="Application Fee">
              <Input id="application-fee" value={profileDraft.applicationFee} disabled={isReadOnly} onChange={(event) => setProfileDraft((current) => ({ ...current, applicationFee: event.target.value }))} placeholder="50" />
            </Field>
            <label className="flex items-center gap-3 rounded-lg border p-4 text-sm">
              <Checkbox checked={profileDraft.tuitionUnavailable} disabled={isReadOnly} onCheckedChange={(checked) => setProfileDraft((current) => ({ ...current, tuitionUnavailable: checked === true }))} />
              Contract amount is not available yet
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{copy.sections.admissions}</CardTitle>
                <CardDescription>Deadlines, rolling admission state, requirements, and optional test score guidance.</CardDescription>
              </div>
              {!isReadOnly ? <Button variant="outline" size="sm" onClick={addIntakeTerm}><Plus className="mr-2 h-4 w-4" />Add Intake</Button> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="flex items-center gap-3 rounded-lg border p-4 text-sm">
              <Checkbox checked={profileDraft.rollingAdmission} disabled={isReadOnly} onCheckedChange={(checked) => setProfileDraft((current) => ({ ...current, rollingAdmission: checked === true }))} />
              Rolling admission, no fixed deadline
            </label>
            {intakeTerms.map((term, index) => (
              <div key={term.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_220px_auto]">
                <Field id={`term-name-${index}`} label="Intake Term"><Input id={`term-name-${index}`} value={term.term} disabled={isReadOnly} onChange={(event) => setIntakeTerms((current) => current.map((item) => item.id === term.id ? { ...item, term: event.target.value } : item))} placeholder="Fall 2027" /></Field>
                <Field id={`term-deadline-${index}`} label="Deadline"><Input id={`term-deadline-${index}`} type="date" value={term.deadline} disabled={isReadOnly || profileDraft.rollingAdmission} onChange={(event) => setIntakeTerms((current) => current.map((item) => item.id === term.id ? { ...item, deadline: event.target.value } : item))} /></Field>
                <div className="flex items-end">{!isReadOnly ? <Button variant="ghost" size="icon" onClick={() => setIntakeTerms((current) => current.filter((item) => item.id !== term.id))} aria-label={`Remove ${term.term || "intake term"}`}><Trash2 className="h-4 w-4" /></Button> : null}</div>
              </div>
            ))}
            <ListEditor title="Admission Requirements" values={profileDraft.admissionRequirements} value={newRequirement} disabled={isReadOnly} placeholder="Passport copy" onValueChange={setNewRequirement} onAdd={() => addListValue(newRequirement, (value) => setProfileDraft((current) => ({ ...current, admissionRequirements: current.admissionRequirements.includes(value) ? current.admissionRequirements : [...current.admissionRequirements, value] })), () => setNewRequirement(""))} onRemove={(value) => setProfileDraft((current) => ({ ...current, admissionRequirements: current.admissionRequirements.filter((item) => item !== value) }))} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              {(["satMin", "actMin", "ieltsMin", "toeflMin", "hskMin", "cscaMin"] as const).map((key) => (
                <Field key={key} id={key} label={key.replace("Min", "").toUpperCase()}>
                  <Input id={key} value={testRequirements[key]} disabled={isReadOnly} onChange={(event) => setTestRequirements((current) => ({ ...current, [key]: event.target.value }))} placeholder="Optional" />
                </Field>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{copy.sections.scholarships}</CardTitle>
            <CardDescription>Scholarship availability and opportunity notes.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-[260px_1fr]">
            <Field id="scholarship-availability" label="Scholarship Availability"><AvailabilitySelect id="scholarship-availability" value={profileDraft.scholarshipAvailability} disabled={isReadOnly} onChange={(value) => setProfileDraft((current) => ({ ...current, scholarshipAvailability: value }))} /></Field>
            <Field id="scholarship-notes" label="Opportunity Notes"><Textarea id="scholarship-notes" value={profileDraft.scholarshipNotes} disabled={isReadOnly} onChange={(event) => setProfileDraft((current) => ({ ...current, scholarshipNotes: event.target.value }))} placeholder="Merit scholarships, grants, discounts..." /></Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{copy.sections.dormitory}</CardTitle>
            <CardDescription>Dormitory availability and student support services.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-[260px_1fr]">
            <Field id="dormitory-availability" label="Dormitory Availability"><AvailabilitySelect id="dormitory-availability" value={profileDraft.dormitoryAvailability} disabled={isReadOnly} onChange={(value) => setProfileDraft((current) => ({ ...current, dormitoryAvailability: value }))} /></Field>
            <div className="grid gap-4">
              <Field id="dormitory-notes" label="Dormitory Notes"><Textarea id="dormitory-notes" value={profileDraft.dormitoryNotes} disabled={isReadOnly} onChange={(event) => setProfileDraft((current) => ({ ...current, dormitoryNotes: event.target.value }))} placeholder="Availability, approximate cost, room types..." /></Field>
              <Field id="student-services" label="Student Services"><Textarea id="student-services" value={profileDraft.studentServices} disabled={isReadOnly} onChange={(event) => setProfileDraft((current) => ({ ...current, studentServices: event.target.value }))} placeholder="Visa support, orientation, career center..." /></Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-primary" />{copy.sections.preview}</CardTitle>
            <CardDescription>Preview how the currently entered information appears across Kallisto after publishing.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="search">
              <TabsList className="flex h-auto flex-wrap justify-start">
                <TabsTrigger value="search">{copy.preview.search}</TabsTrigger>
                <TabsTrigger value="details">{copy.preview.details}</TabsTrigger>
                <TabsTrigger value="programs">{copy.preview.programs}</TabsTrigger>
                <TabsTrigger value="application">{copy.preview.application}</TabsTrigger>
                <TabsTrigger value="compare">{copy.preview.compare}</TabsTrigger>
              </TabsList>
              <TabsContent value="search"><PreviewCard title={profileDraft.universityName || "University name"} icon={<Building2 className="h-4 w-4" />} rows={[profileDraft.location || "Location N/A", `Tuition ${profileDraft.tuitionUnavailable ? "N/A" : formatMoney(profileDraft.tuitionFee)}`, profileDraft.scholarshipAvailability === "available" ? "Scholarships available" : "Scholarships not confirmed"]} /></TabsContent>
              <TabsContent value="details"><PreviewCard title={profileDraft.universityName || "University name"} icon={<Globe className="h-4 w-4" />} rows={[profileDraft.description || "No overview has been published yet.", `Admissions: ${profileDraft.rollingAdmission ? "Rolling" : intakeTerms[0]?.deadline || "N/A"}`, `Dormitory: ${profileDraft.dormitoryAvailability}`]} /></TabsContent>
              <TabsContent value="programs"><PreviewCard title="Programs" icon={<GraduationCap className="h-4 w-4" />} rows={programs.length ? programs.map((program) => [program.name, program.level, program.language, program.studyFormat, program.duration].filter(Boolean).join(" · ")) : ["No programs yet"]} /></TabsContent>
              <TabsContent value="application"><PreviewCard title="Application inputs" icon={<ClipboardList className="h-4 w-4" />} rows={[`Deadline: ${profileDraft.rollingAdmission ? "Rolling admission" : intakeTerms[0]?.deadline || "N/A"}`, `Required documents: ${profileDraft.admissionRequirements.join(", ") || "N/A"}`, `Tests: ${Object.entries(testRequirements).filter(([, value]) => value.trim()).map(([key]) => key.replace("Min", "").toUpperCase()).join(", ") || "Optional / not published"}`]} /></TabsContent>
              <TabsContent value="compare"><PreviewCard title="Compare page facts" icon={<BadgeCheck className="h-4 w-4" />} rows={[profileDraft.location || "Location N/A", `Application fee ${formatMoney(profileDraft.applicationFee)}`, `Tuition ${profileDraft.tuitionUnavailable ? "N/A" : formatMoney(profileDraft.tuitionFee)}`, `Acceptance ${profileDraft.acceptanceRate ? `${profileDraft.acceptanceRate}%` : "N/A"}`]} /></TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
            <CardDescription>Enrollment and accreditation details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="student-count" label="Total Students"><Input id="student-count" value={profileDraft.studentCount} disabled={isReadOnly} onChange={(event) => setProfileDraft((current) => ({ ...current, studentCount: event.target.value }))} /></Field>
              <Field id="faculty-count" label="Faculty Members"><Input id="faculty-count" value={profileDraft.facultyCount} disabled={isReadOnly} onChange={(event) => setProfileDraft((current) => ({ ...current, facultyCount: event.target.value }))} /></Field>
              <Field id="acceptance-rate" label="Acceptance Rate (%)"><Input id="acceptance-rate" value={profileDraft.acceptanceRate} disabled={isReadOnly} onChange={(event) => setProfileDraft((current) => ({ ...current, acceptanceRate: event.target.value }))} /></Field>
            </div>
            <ListEditor title="Accreditations" values={profileDraft.accreditations} value={newAccreditation} disabled={isReadOnly} placeholder="AACSB" onValueChange={setNewAccreditation} onAdd={() => addListValue(newAccreditation, (value) => setProfileDraft((current) => ({ ...current, accreditations: current.accreditations.includes(value) ? current.accreditations : [...current.accreditations, value] })), () => setNewAccreditation(""))} onRemove={(value) => setProfileDraft((current) => ({ ...current, accreditations: current.accreditations.filter((item) => item !== value) }))} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          {onCancel ? <Button variant="outline" onClick={onCancel}>{cancelLabel ?? (isReadOnly ? "Back" : "Cancel")}</Button> : null}
          {isReadOnly ? (
            onEdit ? <Button onClick={onEdit}>{editLabel}</Button> : null
          ) : (
            <Button onClick={() => void handleSave()} disabled={saving || !saveUniversity}><Save className="mr-2 h-4 w-4" />{saving ? "Saving..." : "Save All Changes"}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, className = "", children }: { id: string; label: string; className?: string; children: React.ReactNode }) {
  return <div className={`space-y-2 ${className}`}><Label htmlFor={id}>{label}</Label>{children}</div>;
}

function IconInput({ id, icon, value, disabled, placeholder, onChange }: { id: string; icon: React.ReactNode; value: string; disabled: boolean; placeholder?: string; onChange: (value: string) => void }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
      <Input id={id} className="pl-9" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function AvailabilitySelect({ id, value, disabled, onChange }: { id: string; value: AvailabilityState; disabled: boolean; onChange: (value: AvailabilityState) => void }) {
  return (
    <Select value={value} disabled={disabled} onValueChange={(next: AvailabilityState) => onChange(next)}>
      <SelectTrigger id={id}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="unknown">Not specified yet</SelectItem>
        <SelectItem value="available">Available</SelectItem>
        <SelectItem value="unavailable">Unavailable</SelectItem>
      </SelectContent>
    </Select>
  );
}

function ListEditor({ title, values, value, disabled, placeholder, onValueChange, onAdd, onRemove }: { title: string; values: string[]; value: string; disabled: boolean; placeholder: string; onValueChange: (value: string) => void; onAdd: () => void; onRemove: (value: string) => void }) {
  return (
    <div className="space-y-3">
      <Label>{title}</Label>
      <div className="flex flex-wrap gap-2">
        {values.length ? values.map((item) => (
          <Badge key={item} variant="secondary" className="gap-1">
            {item}
            {!disabled ? <button type="button" onClick={() => onRemove(item)} aria-label={`Remove ${item}`}><Trash2 className="h-3 w-3" /></button> : null}
          </Badge>
        )) : <p className="text-sm text-muted-foreground">No items have been added yet.</p>}
      </div>
      {!disabled ? <div className="flex flex-col gap-3 sm:flex-row"><Input value={value} onChange={(event) => onValueChange(event.target.value)} placeholder={placeholder} /><Button variant="outline" onClick={onAdd}><Plus className="mr-2 h-4 w-4" />Add</Button></div> : null}
    </div>
  );
}

function PreviewCard({ title, icon, rows }: { title: string; icon: React.ReactNode; rows: string[] }) {
  return (
    <div className="mt-4 rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 font-semibold">{icon}{title}</div>
      <div className="grid gap-2 md:grid-cols-2">
        {rows.map((row) => <div key={row} className="rounded-md bg-muted/30 p-3 text-sm text-muted-foreground">{row || "N/A"}</div>)}
      </div>
    </div>
  );
}
