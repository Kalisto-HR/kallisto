import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { ErrorState, LoadingState } from "../common/PageState";
import { cn } from "../ui/utils";
import { useSession } from "../../hooks/useSession";
import { fetchPartnerApplicationStructure, updatePartnerApplicationStructure } from "../../services/partner/universityService";
import { fetchPartnerApplicationStructureHistory, publishPartnerApplicationStructure } from "../../services/partner/dashboardService";
import type { ApplicationStructureVersion } from "../../types/domain";
import { isValidUUID } from "../../utils/validation";

interface ApplicationStructureProps {
  onNavigate?: (page: string) => void;
}

type BuilderStepId =
  | "overview"
  | "programs"
  | "profile"
  | "education"
  | "documents"
  | "questions"
  | "rules"
  | "review";

type RequirementState = "required" | "optional" | "not_requested";
type ApplicationLifecycleStatus = "draft" | "scheduled" | "published" | "closed" | "archived";
type SaveState = "idle" | "saving" | "saved" | "failed";

interface ProfileRequirement {
  key: string;
  label: string;
  group: string;
  state: RequirementState;
  locked?: boolean;
  reason?: string;
}

interface EducationRequirement {
  key: string;
  label: string;
  state: RequirementState;
  condition?: string;
}

interface DocumentRequirement {
  id: string;
  name: string;
  description: string;
  required: boolean;
  formats: string[];
  maxFileSizeMb: number;
  maxFiles: number;
  laterSubmissionAllowed: boolean;
  translationRequired: boolean;
  notarizationRequired: boolean;
  instructions: string;
}

interface CustomQuestion {
  id: string;
  type: "short_text" | "long_text" | "single_choice" | "multiple_choice" | "yes_no" | "date" | "number" | "dropdown" | "file_upload";
  text: string;
  helperText: string;
  required: boolean;
  options: string[];
  conditionQuestionId?: string;
  conditionValue?: string;
}

interface BuilderSchema {
  schemaType: "application_builder_v1";
  lifecycleStatus: ApplicationLifecycleStatus;
  overview: {
    name: string;
    code: string;
    academicYear: string;
    intake: string;
    applicantLevel: string;
    openingDate: string;
    deadline: string;
    description: string;
    instructions: string;
    supportContact: string;
    languages: string[];
  };
  programs: {
    query: string;
    selectedProgramIds: string[];
    maxChoices: number;
    secondChoiceAllowed: boolean;
    rankChoices: boolean;
    allowNoProgram: boolean;
  };
  profileRequirements: ProfileRequirement[];
  educationRequirements: EducationRequirement[];
  documents: DocumentRequirement[];
  questions: CustomQuestion[];
  rules: {
    applicationFee: number;
    currency: "UZS" | "USD";
    kallistoCreditCoversApplication: boolean;
    universityFeeMode: "free" | "kallisto_credit" | "separate_fee" | "outside_kallisto";
    editBeforeSubmission: boolean;
    editAfterSubmission: boolean;
    withdrawAllowed: boolean;
    resubmissionAllowed: boolean;
    maxApplicationsPerApplicant: number;
    declaration: string;
    consent: string;
    confirmationMessage: string;
  };
  legacyMigration: {
    migratedFromLegacy: boolean;
    mappedFields: string[];
    manualReview: string[];
  };
  updatedAt: string;
}

interface ApplicationTemplate {
  id: string;
  name: string;
  description: string;
  applicantType: string;
  sections: string[];
  effort: string;
  recommended?: boolean;
  build: () => BuilderSchema;
}

const stepOrder: Array<{ id: BuilderStepId; label: string; description: string }> = [
  { id: "overview", label: "Overview", description: "Name, dates, intake, language, and instructions" },
  { id: "programs", label: "Programs", description: "Connect existing programs and choice rules" },
  { id: "profile", label: "Applicant Information", description: "Reusable Kallisto profile requirements" },
  { id: "education", label: "Education", description: "School, GPA, transcripts, and test results" },
  { id: "documents", label: "Documents", description: "Document library and upload rules" },
  { id: "questions", label: "Additional Questions", description: "University-specific questions only" },
  { id: "rules", label: "Rules and Payment", description: "Application behavior and fee settings" },
  { id: "review", label: "Review and Publish", description: "Validate, preview, and publish" },
];

const applicantLevelOptions = [
  "Foundation",
  "Bachelor's",
  "Master's",
  "Doctoral",
  "Transfer",
  "Language program",
  "Other",
];

const safeFormats = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];

const demoPrograms = [
  { id: "business", name: "Business Administration", degree: "Bachelor's", language: "English", format: "Full-time", campus: "Main campus" },
  { id: "cs", name: "Computer Science", degree: "Bachelor's", language: "English", format: "Full-time", campus: "Technology campus" },
  { id: "finance", name: "Finance", degree: "Bachelor's", language: "English", format: "Full-time", campus: "Main campus" },
  { id: "foundation", name: "Foundation Program", degree: "Foundation", language: "English", format: "Full-time", campus: "Main campus" },
];

function createId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysIso(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function slugCode(name: string, intake: string) {
  const base = `${name || "application"}-${intake || "intake"}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return (base || "application").toUpperCase();
}

function profileRequirements(): ProfileRequirement[] {
  return [
    { key: "full_legal_name", label: "Full legal name", group: "Personal details", state: "required", locked: true, reason: "Required for identity and application records." },
    { key: "preferred_name", label: "Preferred name", group: "Personal details", state: "optional" },
    { key: "date_of_birth", label: "Date of birth", group: "Personal details", state: "required", locked: true, reason: "Required for applicant identity checks." },
    { key: "citizenship", label: "Citizenship", group: "Personal details", state: "required" },
    { key: "passport_details", label: "Passport or ID details", group: "Personal details", state: "required" },
    { key: "profile_photo", label: "Profile photo", group: "Personal details", state: "optional" },
    { key: "email", label: "Email", group: "Contact details", state: "required", locked: true, reason: "Required for notifications and account access." },
    { key: "phone", label: "Phone", group: "Contact details", state: "required" },
    { key: "alternative_phone", label: "Alternative phone", group: "Contact details", state: "optional" },
    { key: "emergency_contact", label: "Emergency contact", group: "Contact details", state: "optional" },
    { key: "country", label: "Country", group: "Address", state: "required" },
    { key: "viloyat", label: "Viloyat", group: "Address", state: "required" },
    { key: "tuman", label: "Tuman", group: "Address", state: "required" },
    { key: "street_address", label: "Street address", group: "Address", state: "optional" },
    { key: "postal_code", label: "Postal code", group: "Address", state: "not_requested" },
  ];
}

function educationRequirements(): EducationRequirement[] {
  return [
    { key: "current_school", label: "Current or previous school", state: "required" },
    { key: "school_country", label: "School country", state: "required" },
    { key: "graduation_year", label: "Graduation year", state: "required" },
    { key: "graduation_status", label: "Graduation status", state: "optional" },
    { key: "diploma", label: "Diploma details", state: "required" },
    { key: "transcript", label: "Transcript", state: "required" },
    { key: "gpa", label: "GPA", state: "required" },
    { key: "grading_scale", label: "Grading scale", state: "required" },
    { key: "previous_university", label: "Previous university", state: "not_requested", condition: "Request only for transfer applicants." },
    { key: "ielts", label: "IELTS", state: "optional", condition: "Request for English-language programs." },
    { key: "toefl", label: "TOEFL", state: "optional", condition: "Request for English-language programs." },
    { key: "cefr", label: "CEFR", state: "optional" },
    { key: "sat", label: "SAT", state: "optional" },
    { key: "hsk", label: "HSK", state: "optional" },
    { key: "csca", label: "CSCA", state: "optional" },
  ];
}

function defaultDocuments(privateUniversity = false): DocumentRequirement[] {
  return [
    makeDocument("Passport or ID", "Identity document used for admission records.", true),
    makeDocument("Profile photo", "Recent applicant photo.", privateUniversity),
    makeDocument("Diploma", "Graduation diploma or expected graduation certificate.", true),
    makeDocument("Transcript", "Latest available academic transcript.", true),
    makeDocument("Language certificate", "IELTS, TOEFL, CEFR, HSK, or another accepted certificate.", false),
    makeDocument("Test score certificate", "SAT, ACT, CSCA, or university entrance test evidence.", false),
    makeDocument("Motivation letter", "Applicant statement or motivation letter.", false, [".pdf", ".doc", ".docx"]),
  ];
}

function makeDocument(name: string, description: string, required: boolean, formats = [".pdf", ".jpg", ".jpeg", ".png"]): DocumentRequirement {
  return {
    id: createId("doc"),
    name,
    description,
    required,
    formats,
    maxFileSizeMb: 10,
    maxFiles: 1,
    laterSubmissionAllowed: !required,
    translationRequired: false,
    notarizationRequired: false,
    instructions: "",
  };
}

function baseBuilderSchema(name: string, applicantLevel: string, privateUniversity = false): BuilderSchema {
  const openingDate = todayIso();
  const intake = "Fall";
  return {
    schemaType: "application_builder_v1",
    lifecycleStatus: "draft",
    overview: {
      name,
      code: slugCode(name, intake),
      academicYear: "2026-2027",
      intake,
      applicantLevel,
      openingDate,
      deadline: plusDaysIso(60),
      description: "",
      instructions: "Complete each required section before submitting your application.",
      supportContact: "admissions@example.com",
      languages: ["English"],
    },
    programs: {
      query: "",
      selectedProgramIds: privateUniversity ? ["business", "cs"] : [],
      maxChoices: 1,
      secondChoiceAllowed: false,
      rankChoices: false,
      allowNoProgram: false,
    },
    profileRequirements: profileRequirements(),
    educationRequirements: educationRequirements(),
    documents: defaultDocuments(privateUniversity),
    questions: privateUniversity
      ? [
        makeQuestion("long_text", "Why did you choose this university?", true),
        makeQuestion("yes_no", "Are you applying for a scholarship?", false),
        makeQuestion("yes_no", "Do you need university accommodation?", false),
      ]
      : [],
    rules: {
      applicationFee: 0,
      currency: "UZS",
      kallistoCreditCoversApplication: true,
      universityFeeMode: "kallisto_credit",
      editBeforeSubmission: true,
      editAfterSubmission: false,
      withdrawAllowed: true,
      resubmissionAllowed: true,
      maxApplicationsPerApplicant: 1,
      declaration: "I confirm that the information in this application is accurate.",
      consent: "I agree that my application information may be processed for admissions review.",
      confirmationMessage: "Your application has been submitted successfully.",
    },
    legacyMigration: {
      migratedFromLegacy: false,
      mappedFields: [],
      manualReview: [],
    },
    updatedAt: new Date().toISOString(),
  };
}

function makeQuestion(type: CustomQuestion["type"], text: string, required: boolean): CustomQuestion {
  return {
    id: createId("question"),
    type,
    text,
    helperText: "",
    required,
    options: type === "yes_no" ? ["Yes", "No"] : [],
  };
}

const templates: ApplicationTemplate[] = [
  {
    id: "private-uz-undergraduate",
    name: "Private University Undergraduate Application",
    description: "Recommended starter for private universities in Uzbekistan.",
    applicantType: "Bachelor applicants",
    sections: ["Overview", "Programs", "Profile fields", "Education", "Documents", "Questions", "Payment"],
    effort: "15-25 minutes",
    recommended: true,
    build: () => baseBuilderSchema("Undergraduate Application", "Bachelor's", true),
  },
  {
    id: "undergraduate",
    name: "Undergraduate Application",
    description: "Standard bachelor's application with reusable profile and education requirements.",
    applicantType: "Bachelor applicants",
    sections: ["Overview", "Programs", "Profile fields", "Education", "Documents"],
    effort: "20 minutes",
    build: () => baseBuilderSchema("Undergraduate Application", "Bachelor's"),
  },
  {
    id: "masters",
    name: "Master's Application",
    description: "Graduate application with previous degree and transcript requirements.",
    applicantType: "Master's applicants",
    sections: ["Overview", "Programs", "Education", "Documents", "Questions"],
    effort: "20-30 minutes",
    build: () => {
      const schema = baseBuilderSchema("Master's Application", "Master's");
      schema.questions = [makeQuestion("long_text", "Describe your academic or professional goals.", true)];
      return schema;
    },
  },
  {
    id: "foundation",
    name: "Foundation Program Application",
    description: "Simple application for pre-degree or foundation intake.",
    applicantType: "Foundation students",
    sections: ["Overview", "Programs", "Profile fields", "Education", "Documents"],
    effort: "10-15 minutes",
    build: () => baseBuilderSchema("Foundation Program Application", "Foundation"),
  },
  {
    id: "transfer",
    name: "Transfer Student Application",
    description: "Includes previous university and transfer record requirements.",
    applicantType: "Transfer applicants",
    sections: ["Overview", "Programs", "Education", "Transfer documents", "Questions"],
    effort: "25 minutes",
    build: () => {
      const schema = baseBuilderSchema("Transfer Student Application", "Transfer");
      schema.educationRequirements = schema.educationRequirements.map((item) =>
        item.key === "previous_university" ? { ...item, state: "required" } : item,
      );
      schema.documents.push(makeDocument("Transfer records", "Official records from the previous university.", true));
      return schema;
    },
  },
  {
    id: "international",
    name: "International Student Application",
    description: "Adds passport, language, and international document guidance.",
    applicantType: "International applicants",
    sections: ["Overview", "Programs", "Profile fields", "Language", "Documents"],
    effort: "25-35 minutes",
    build: () => {
      const schema = baseBuilderSchema("International Student Application", "Bachelor's");
      schema.educationRequirements = schema.educationRequirements.map((item) =>
        ["ielts", "toefl", "cefr", "hsk"].includes(item.key) ? { ...item, state: "optional" } : item,
      );
      schema.documents.push(makeDocument("Passport translation", "Notarized translation if required.", false));
      return schema;
    },
  },
  {
    id: "blank",
    name: "Blank Application",
    description: "Start with only platform-required identity and contact requirements.",
    applicantType: "Custom",
    sections: ["Overview", "Profile fields"],
    effort: "Custom setup",
    build: () => {
      const schema = baseBuilderSchema("New Application", "Other");
      schema.programs.selectedProgramIds = [];
      schema.documents = [];
      schema.questions = [];
      return schema;
    },
  },
];

function toBuilderSchema(raw: Record<string, unknown> | null): BuilderSchema | null {
  if (!raw) return null;
  if (raw.schemaType === "application_builder_v1") {
    return {
      ...baseBuilderSchema("Application", "Bachelor's"),
      ...(raw as unknown as BuilderSchema),
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
    };
  }

  const legacy = baseBuilderSchema("Migrated Application", "Bachelor's");
  legacy.legacyMigration.migratedFromLegacy = true;
  legacy.legacyMigration.manualReview = [];
  legacy.legacyMigration.mappedFields = [];
  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  sections.forEach((section) => {
    if (!section || typeof section !== "object") return;
    const fields = Array.isArray((section as Record<string, unknown>).fields) ? (section as Record<string, unknown>).fields as unknown[] : [];
    fields.forEach((field) => {
      if (!field || typeof field !== "object") return;
      const source = field as Record<string, unknown>;
      const label = typeof source.label === "string" ? source.label : "Legacy field";
      const normalized = label.toLowerCase();
      if (normalized.includes("passport")) {
        legacy.documents.push(makeDocument(label, "Migrated from legacy application configuration.", source.required === true));
        legacy.legacyMigration.mappedFields.push(`${label} -> Documents`);
      } else if (normalized.includes("school") || normalized.includes("gpa") || normalized.includes("transcript")) {
        legacy.educationRequirements.push({
          key: `legacy_${createId("education")}`,
          label,
          state: source.required === true ? "required" : "optional",
        });
        legacy.legacyMigration.mappedFields.push(`${label} -> Education`);
      } else if (["file-upload", "document", "upload"].includes(String(source.type))) {
        legacy.documents.push(makeDocument(label, "Migrated from legacy upload field.", source.required === true));
        legacy.legacyMigration.mappedFields.push(`${label} -> Documents`);
      } else if (normalized.includes("name") || normalized.includes("email") || normalized.includes("phone")) {
        legacy.profileRequirements.push({
          key: `legacy_${createId("profile")}`,
          label,
          group: "Legacy profile mapping",
          state: source.required === true ? "required" : "optional",
        });
        legacy.legacyMigration.mappedFields.push(`${label} -> Applicant Information`);
      } else {
        legacy.questions.push(makeQuestion(source.type === "textarea" ? "long_text" : "short_text", label, source.required === true));
        legacy.legacyMigration.manualReview.push(`${label} was preserved as an additional question. Please review it.`);
      }
    });
  });
  return legacy;
}

function builderToSchema(builder: BuilderSchema): Record<string, unknown> {
  return {
    ...builder,
    updatedAt: new Date().toISOString(),
  };
}

function validateBuilder(builder: BuilderSchema) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!builder.overview.name.trim()) errors.push("Application name is required.");
  if (!builder.overview.academicYear.trim()) errors.push("Academic year is required.");
  if (!builder.overview.intake.trim()) errors.push("Intake is required.");
  if (!builder.overview.openingDate || !builder.overview.deadline) {
    errors.push("Opening date and deadline are required.");
  } else if (new Date(builder.overview.deadline) <= new Date(builder.overview.openingDate)) {
    errors.push("Deadline must be after the opening date.");
  }
  if (builder.programs.selectedProgramIds.length === 0 && !builder.programs.allowNoProgram) {
    errors.push("Connect at least one program or intentionally allow applications without program selection.");
  }
  if (!builder.profileRequirements.some((item) => item.state === "required")) {
    errors.push("At least one applicant information requirement must be required.");
  }
  builder.documents.forEach((doc) => {
    if (!doc.name.trim()) errors.push("Every document requirement needs a display name.");
    if (doc.formats.length === 0) errors.push(`${doc.name || "Document"} needs at least one accepted format.`);
    if (doc.maxFileSizeMb <= 0) errors.push(`${doc.name || "Document"} needs a valid maximum file size.`);
  });
  builder.questions.forEach((question) => {
    if (!question.text.trim()) errors.push("Every additional question needs question text.");
    if (["single_choice", "multiple_choice", "dropdown"].includes(question.type) && question.options.filter(Boolean).length === 0) {
      errors.push(`${question.text || "Choice question"} needs answer options.`);
    }
  });
  if (builder.rules.universityFeeMode === "separate_fee" && builder.rules.applicationFee <= 0) {
    errors.push("Separate university fee mode requires a positive application fee.");
  }
  if (builder.rules.universityFeeMode === "outside_kallisto") {
    warnings.push("Fee paid outside Kallisto requires clear applicant instructions.");
  }
  builder.legacyMigration.manualReview.forEach((item) => warnings.push(item));
  return { errors, warnings };
}

export function ApplicationStructure({ onNavigate }: ApplicationStructureProps) {
  return <ApplicationBuilder onNavigate={onNavigate} />;
}

export function ApplicationBuilder({ onNavigate }: ApplicationStructureProps) {
  const { universityId } = useParams();
  const { user } = useSession();
  const routeUniversityId = typeof universityId === "string" && isValidUUID(universityId) ? universityId : null;
  const sessionUniversityId = typeof user?.universityLinked === "string" && isValidUUID(user.universityLinked) ? user.universityLinked : null;
  const resolvedUniversityId = routeUniversityId ?? sessionUniversityId ?? "";
  const [builder, setBuilder] = useState<BuilderSchema | null>(null);
  const [history, setHistory] = useState<ApplicationStructureVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<BuilderStepId>("overview");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [schema, versions] = await Promise.all([
          fetchPartnerApplicationStructure(),
          resolvedUniversityId ? fetchPartnerApplicationStructureHistory(resolvedUniversityId, 20) : Promise.resolve([]),
        ]);
        if (!cancelled) {
          setBuilder(toBuilderSchema(schema));
          setHistory(versions);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load Application Builder");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [resolvedUniversityId]);

  const validation = useMemo(() => (builder ? validateBuilder(builder) : { errors: [], warnings: [] }), [builder]);
  const completion = useMemo(() => {
    if (!builder) return { complete: 0, total: stepOrder.length, percent: 0, stepErrors: new Set<BuilderStepId>() };
    const stepErrors = new Set<BuilderStepId>();
    if (!builder.overview.name || !builder.overview.academicYear || !builder.overview.intake || !builder.overview.deadline) stepErrors.add("overview");
    if (builder.programs.selectedProgramIds.length === 0 && !builder.programs.allowNoProgram) stepErrors.add("programs");
    if (!builder.profileRequirements.some((item) => item.state === "required")) stepErrors.add("profile");
    if (builder.documents.some((doc) => !doc.name.trim() || doc.formats.length === 0)) stepErrors.add("documents");
    if (builder.questions.some((item) => !item.text.trim())) stepErrors.add("questions");
    if (builder.rules.universityFeeMode === "separate_fee" && builder.rules.applicationFee <= 0) stepErrors.add("rules");
    const complete = stepOrder.length - stepErrors.size;
    return { complete, total: stepOrder.length, percent: Math.round((complete / stepOrder.length) * 100), stepErrors };
  }, [builder]);

  const updateBuilder = (next: BuilderSchema | ((current: BuilderSchema) => BuilderSchema)) => {
    setBuilder((current) => {
      const base = current ?? templates[0].build();
      const updated = typeof next === "function" ? next(base) : next;
      return {
        ...updated,
        overview: {
          ...updated.overview,
          code: slugCode(updated.overview.name, updated.overview.intake),
        },
      };
    });
    setSaveState("idle");
  };

  const saveDraft = async (nextBuilder = builder) => {
    if (!nextBuilder) return false;
    setSaveState("saving");
    setSaveError(null);
    try {
      await updatePartnerApplicationStructure(builderToSchema(nextBuilder));
      setBuilder({ ...nextBuilder, updatedAt: new Date().toISOString() });
      setSaveState("saved");
      return true;
    } catch (err) {
      setSaveState("failed");
      setSaveError(err instanceof Error ? err.message : "Failed to save draft");
      return false;
    }
  };

  const publish = async () => {
    if (!builder || validation.errors.length > 0) return;
    const next = { ...builder, lifecycleStatus: "published" as const };
    const saved = await saveDraft(next);
    if (!saved) return;
    await publishPartnerApplicationStructure(resolvedUniversityId, "Published from Application Builder");
    const versions = resolvedUniversityId ? await fetchPartnerApplicationStructureHistory(resolvedUniversityId, 20) : [];
    setHistory(versions);
    setBuilder(next);
    setShowPublishConfirm(false);
  };

  const duplicate = () => {
    if (!builder) return;
    updateBuilder({
      ...builder,
      lifecycleStatus: "draft",
      overview: {
        ...builder.overview,
        name: `${builder.overview.name || "Application"} Copy`,
      },
    });
  };

  const archive = async () => {
    if (!builder) return;
    const next = { ...builder, lifecycleStatus: "archived" as const };
    updateBuilder(next);
    await saveDraft(next);
    setShowArchiveConfirm(false);
  };

  if (loading) return <LoadingState label="Loading Application Builder..." />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  if (!builder) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <EmptyApplications onCreate={() => setShowTemplateDialog(true)} />
        <TemplateDialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog} onSelect={(schema) => {
          setBuilder(schema);
          setStep("overview");
          setShowTemplateDialog(false);
        }} />
      </div>
    );
  }

  const currentStepIndex = stepOrder.findIndex((item) => item.id === step);
  const currentVersion = history.find((item) => item.published);

  return (
    <div className="min-h-full p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-4 border-b pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Button variant="ghost" size="sm" className="mb-2 px-0" onClick={() => onNavigate?.("partner-applications")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to applications
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">Application Builder</h1>
              <Badge variant={builder.lifecycleStatus === "published" ? "default" : "secondary"}>
                {builder.lifecycleStatus}
              </Badge>
              {currentVersion ? <Badge variant="outline">Published v{currentVersion.versionNo}</Badge> : null}
            </div>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Create an admissions application by selecting reusable Kallisto profile requirements and configuring only university-specific questions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowPreview(true)}>
              <Eye className="mr-2 h-4 w-4" />
              Preview as student
            </Button>
            <Button variant="outline" onClick={() => void saveDraft()}>
              {saveState === "saving" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save draft
            </Button>
            <Button onClick={() => setShowPublishConfirm(true)} disabled={validation.errors.length > 0}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Publish
            </Button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <Card>
              <CardContent className="space-y-3 pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Completion</span>
                  <span className="text-sm font-semibold">{completion.percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${completion.percent}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {completion.complete} of {completion.total} steps have required configuration.
                </p>
              </CardContent>
            </Card>

            <Select value={step} onValueChange={(value) => setStep(value as BuilderStepId)}>
              <SelectTrigger className="lg:hidden">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {stepOrder.map((item, index) => (
                  <SelectItem key={item.id} value={item.id}>{index + 1}. {item.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <nav className="hidden space-y-1 lg:block">
              {stepOrder.map((item, index) => {
                const active = item.id === step;
                const hasError = completion.stepErrors.has(item.id);
                const complete = !hasError;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStep(item.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                      active ? "border-primary bg-primary/6" : "border-transparent hover:border-border hover:bg-card",
                    )}
                  >
                    <span className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
                      active ? "bg-primary text-primary-foreground" : complete ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
                    )}>
                      {complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-medium">{item.label}</span>
                      <span className="block text-xs text-muted-foreground">{hasError ? "Needs setup" : item.description}</span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="space-y-4">
            <SaveBanner state={saveState} error={saveError} />
            {step === "overview" ? <OverviewStep builder={builder} updateBuilder={updateBuilder} /> : null}
            {step === "programs" ? <ProgramsStep builder={builder} updateBuilder={updateBuilder} /> : null}
            {step === "profile" ? <ProfileStep builder={builder} updateBuilder={updateBuilder} /> : null}
            {step === "education" ? <EducationStep builder={builder} updateBuilder={updateBuilder} /> : null}
            {step === "documents" ? <DocumentsStep builder={builder} updateBuilder={updateBuilder} /> : null}
            {step === "questions" ? <QuestionsStep builder={builder} updateBuilder={updateBuilder} /> : null}
            {step === "rules" ? <RulesStep builder={builder} updateBuilder={updateBuilder} /> : null}
            {step === "review" ? (
              <ReviewStep
                builder={builder}
                validation={validation}
                history={history}
                setStep={setStep}
                onDuplicate={duplicate}
                onArchive={() => setShowArchiveConfirm(true)}
              />
            ) : null}

            <div className="sticky bottom-0 flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <Button variant="outline" disabled={currentStepIndex <= 0} onClick={() => setStep(stepOrder[currentStepIndex - 1].id)}>
                Back
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => setShowPreview(true)}>
                  Preview as student
                </Button>
                <Button variant="outline" onClick={() => void saveDraft()}>
                  Save draft
                </Button>
                <Button
                  disabled={currentStepIndex >= stepOrder.length - 1}
                  onClick={() => setStep(stepOrder[currentStepIndex + 1].id)}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </main>
        </section>
      </div>

      <TemplateDialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog} onSelect={(schema) => {
        updateBuilder(schema);
        setShowTemplateDialog(false);
      }} />
      <PreviewDialog open={showPreview} onOpenChange={setShowPreview} builder={builder} />
      <ConfirmDialog
        open={showPublishConfirm}
        onOpenChange={setShowPublishConfirm}
        title="Publish application?"
        description="Publishing creates a new version for applicants. Existing submitted applications keep their historical data."
        actionLabel="Publish"
        actionDisabled={validation.errors.length > 0}
        onAction={() => void publish()}
      >
        {validation.errors.length > 0 ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            Resolve validation errors before publishing.
          </div>
        ) : null}
      </ConfirmDialog>
      <ConfirmDialog
        open={showArchiveConfirm}
        onOpenChange={setShowArchiveConfirm}
        title="Archive this application?"
        description="Archived applications should no longer be used for new intake setup. This does not delete historical submissions."
        actionLabel="Archive"
        destructive
        onAction={() => void archive()}
      />
    </div>
  );
}

function EmptyApplications({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
        <FileText className="mb-4 h-12 w-12 text-primary" />
        <h2 className="text-xl font-semibold">No applications created yet</h2>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Create an admissions application using a ready template or start with a blank application.
        </p>
        <Button className="mt-5" onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create first application
        </Button>
      </CardContent>
    </Card>
  );
}

function TemplateDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (schema: BuilderSchema) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create application</DialogTitle>
          <DialogDescription>
            Use a template for a fast start, or choose a blank application for custom setup.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id} className={cn("border transition-colors hover:border-primary/40", template.recommended && "border-primary/30")}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </div>
                  {template.recommended ? <Badge>Recommended</Badge> : null}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <SummaryItem label="Applicant type" value={template.applicantType} />
                  <SummaryItem label="Setup effort" value={template.effort} />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Included sections</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {template.sections.map((section) => <Badge key={section} variant="outline">{section}</Badge>)}
                  </div>
                </div>
                <Button className="w-full" onClick={() => onSelect(template.build())}>
                  Use template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OverviewStep({ builder, updateBuilder }: StepProps) {
  const overview = builder.overview;
  const update = (patch: Partial<BuilderSchema["overview"]>) => updateBuilder((current) => ({
    ...current,
    overview: { ...current.overview, ...patch },
  }));
  return (
    <StepCard title="Overview" description="Set the basic application identity, dates, and applicant-facing instructions.">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Application name" required>
          <Input value={overview.name} onChange={(event) => update({ name: event.target.value })} />
        </Field>
        <Field label="Internal application code">
          <Input value={overview.code} readOnly className="bg-muted" />
        </Field>
        <Field label="Academic year" required>
          <Input value={overview.academicYear} onChange={(event) => update({ academicYear: event.target.value })} placeholder="2026-2027" />
        </Field>
        <Field label="Intake" required>
          <Input value={overview.intake} onChange={(event) => update({ intake: event.target.value })} placeholder="Fall" />
        </Field>
        <Field label="Applicant level" required>
          <Select value={overview.applicantLevel} onValueChange={(value) => update({ applicantLevel: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {applicantLevelOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Application languages">
          <Input
            value={overview.languages.join(", ")}
            onChange={(event) => update({ languages: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })}
            placeholder="English, Russian, Uzbek"
          />
        </Field>
        <Field label="Opening date" required>
          <Input type="date" value={overview.openingDate} onChange={(event) => update({ openingDate: event.target.value })} />
        </Field>
        <Field label="Deadline" required>
          <Input type="date" value={overview.deadline} onChange={(event) => update({ deadline: event.target.value })} />
        </Field>
        <Field label="Admissions support contact">
          <Input value={overview.supportContact} onChange={(event) => update({ supportContact: event.target.value })} />
        </Field>
        <div />
        <Field label="Application description">
          <Textarea value={overview.description} onChange={(event) => update({ description: event.target.value })} />
        </Field>
        <Field label="Applicant instructions">
          <Textarea value={overview.instructions} onChange={(event) => update({ instructions: event.target.value })} />
        </Field>
      </div>
    </StepCard>
  );
}

interface StepProps {
  builder: BuilderSchema;
  updateBuilder: (next: BuilderSchema | ((current: BuilderSchema) => BuilderSchema)) => void;
}

function ProgramsStep({ builder, updateBuilder }: StepProps) {
  const selected = new Set(builder.programs.selectedProgramIds);
  const filtered = demoPrograms.filter((program) => program.name.toLowerCase().includes(builder.programs.query.toLowerCase()));
  const toggleProgram = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateBuilder((current) => ({
      ...current,
      programs: { ...current.programs, selectedProgramIds: Array.from(next) },
    }));
  };
  const patchPrograms = (patch: Partial<BuilderSchema["programs"]>) => updateBuilder((current) => ({
    ...current,
    programs: { ...current.programs, ...patch },
  }));
  return (
    <StepCard title="Programs" description="Reference existing university programs. Do not duplicate program records here.">
      <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" value={builder.programs.query} onChange={(event) => patchPrograms({ query: event.target.value })} placeholder="Search programs" />
          </div>
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
              No programs match this search. Manage real programs in the university profile before publishing.
            </div>
          ) : filtered.map((program) => (
            <label key={program.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:border-primary/30">
              <Checkbox checked={selected.has(program.id)} onCheckedChange={() => toggleProgram(program.id)} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{program.name}</span>
                <span className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{program.degree}</span>
                  <span>/</span>
                  <span>{program.language}</span>
                  <span>/</span>
                  <span>{program.format}</span>
                  <span>/</span>
                  <span>{program.campus}</span>
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
          <Field label="Maximum program choices">
            <Input type="number" min={1} value={builder.programs.maxChoices} onChange={(event) => patchPrograms({ maxChoices: Number(event.target.value) || 1 })} />
          </Field>
          <BooleanRow label="Allow second choice" checked={builder.programs.secondChoiceAllowed} onChange={(value) => patchPrograms({ secondChoiceAllowed: value })} />
          <BooleanRow label="Applicants rank choices" checked={builder.programs.rankChoices} onChange={(value) => patchPrograms({ rankChoices: value })} />
          <BooleanRow label="Allow applying without choosing a program" checked={builder.programs.allowNoProgram} onChange={(value) => patchPrograms({ allowNoProgram: value })} />
          <Button variant="outline" className="w-full" onClick={() => patchPrograms({ selectedProgramIds: demoPrograms.map((program) => program.id) })}>
            Select all eligible programs
          </Button>
        </div>
      </div>
    </StepCard>
  );
}

function ProfileStep({ builder, updateBuilder }: StepProps) {
  return (
    <RequirementsStep
      title="Applicant Information"
      description="Select reusable Kallisto profile fields. Students should not re-enter the same identity data for every university."
      groups={groupBy(builder.profileRequirements, "group")}
      renderRequirement={(item) => (
        <RequirementRow
          key={item.key}
          label={item.label}
          value={item.state}
          locked={item.locked}
          reason={item.reason}
          onChange={(state) => updateBuilder((current) => ({
            ...current,
            profileRequirements: current.profileRequirements.map((candidate) =>
              candidate.key === item.key ? { ...candidate, state } : candidate,
            ),
          }))}
        />
      )}
    />
  );
}

function EducationStep({ builder, updateBuilder }: StepProps) {
  return (
    <StepCard title="Education" description="Choose reusable education, GPA, transcript, and test-score information from the applicant profile.">
      <div className="space-y-2">
        {builder.educationRequirements.map((item) => (
          <RequirementRow
            key={item.key}
            label={item.label}
            value={item.state}
            helper={item.condition}
            onChange={(state) => updateBuilder((current) => ({
              ...current,
              educationRequirements: current.educationRequirements.map((candidate) =>
                candidate.key === item.key ? { ...candidate, state } : candidate,
              ),
            }))}
          />
        ))}
      </div>
    </StepCard>
  );
}

function DocumentsStep({ builder, updateBuilder }: StepProps) {
  const patchDocument = (id: string, patch: Partial<DocumentRequirement>) => updateBuilder((current) => ({
    ...current,
    documents: current.documents.map((doc) => doc.id === id ? { ...doc, ...patch } : doc),
  }));
  return (
    <StepCard
      title="Documents"
      description="Build a clear document checklist with safe upload defaults."
      action={<Button variant="outline" onClick={() => updateBuilder((current) => ({ ...current, documents: [...current.documents, makeDocument("Other document", "", false)] }))}><Plus className="mr-2 h-4 w-4" />Add document</Button>}
    >
      <div className="space-y-3">
        {builder.documents.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">No document requirements yet.</p> : null}
        {builder.documents.map((doc, index) => (
          <Card key={doc.id}>
            <CardContent className="space-y-4 pt-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="grid flex-1 gap-3 md:grid-cols-2">
                  <Field label="Display name"><Input value={doc.name} onChange={(event) => patchDocument(doc.id, { name: event.target.value })} /></Field>
                  <Field label="Accepted formats"><Input value={doc.formats.join(", ")} onChange={(event) => patchDocument(doc.id, { formats: event.target.value.split(",").map((item) => item.trim()).filter((item) => safeFormats.includes(item)) })} /></Field>
                  <Field label="Maximum file size (MB)"><Input type="number" min={1} value={doc.maxFileSizeMb} onChange={(event) => patchDocument(doc.id, { maxFileSizeMb: Number(event.target.value) || 1 })} /></Field>
                  <Field label="Maximum files"><Input type="number" min={1} value={doc.maxFiles} onChange={(event) => patchDocument(doc.id, { maxFiles: Number(event.target.value) || 1 })} /></Field>
                </div>
                <Button variant="ghost" size="sm" onClick={() => updateBuilder((current) => ({ ...current, documents: current.documents.filter((item) => item.id !== doc.id) }))}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </div>
              <Field label="Description"><Textarea value={doc.description} onChange={(event) => patchDocument(doc.id, { description: event.target.value })} /></Field>
              <div className="grid gap-3 md:grid-cols-4">
                <BooleanRow label="Required" checked={doc.required} onChange={(value) => patchDocument(doc.id, { required: value })} />
                <BooleanRow label="Later submission allowed" checked={doc.laterSubmissionAllowed} onChange={(value) => patchDocument(doc.id, { laterSubmissionAllowed: value })} />
                <BooleanRow label="Translation required" checked={doc.translationRequired} onChange={(value) => patchDocument(doc.id, { translationRequired: value })} />
                <BooleanRow label="Notarization required" checked={doc.notarizationRequired} onChange={(value) => patchDocument(doc.id, { notarizationRequired: value })} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={index === 0} onClick={() => moveDocument(builder, updateBuilder, index, -1)}>Move up</Button>
                <Button variant="outline" size="sm" disabled={index === builder.documents.length - 1} onClick={() => moveDocument(builder, updateBuilder, index, 1)}>Move down</Button>
                <Button variant="outline" size="sm" onClick={() => updateBuilder((current) => ({ ...current, documents: [...current.documents, { ...doc, id: createId("doc"), name: `${doc.name} Copy` }] }))}>Duplicate</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </StepCard>
  );
}

function moveDocument(builder: BuilderSchema, updateBuilder: StepProps["updateBuilder"], index: number, direction: -1 | 1) {
  const next = [...builder.documents];
  const target = index + direction;
  [next[index], next[target]] = [next[target], next[index]];
  updateBuilder((current) => ({ ...current, documents: next }));
}

function QuestionsStep({ builder, updateBuilder }: StepProps) {
  const patchQuestion = (id: string, patch: Partial<CustomQuestion>) => updateBuilder((current) => ({
    ...current,
    questions: current.questions.map((question) => question.id === id ? { ...question, ...patch } : question),
  }));
  const examples = [
    "Why did you choose this university?",
    "Do you need university accommodation?",
    "Are you applying for a scholarship?",
    "Do you have accessibility requirements?",
    "Are you available for an admissions interview?",
    "How did you learn about this university?",
  ];
  return (
    <StepCard
      title="Additional Questions"
      description="Only add questions that are specific to this university or intake."
      action={<Button variant="outline" onClick={() => updateBuilder((current) => ({ ...current, questions: [...current.questions, makeQuestion("short_text", "", false)] }))}><Plus className="mr-2 h-4 w-4" />Add question</Button>}
    >
      <div className="mb-4 rounded-lg border bg-muted/30 p-4">
        <p className="text-sm font-medium">Recommended examples</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {examples.map((example) => (
            <Button key={example} variant="outline" size="sm" onClick={() => updateBuilder((current) => ({ ...current, questions: [...current.questions, makeQuestion(example.startsWith("Do ") || example.startsWith("Are ") ? "yes_no" : "long_text", example, false)] }))}>
              {example}
            </Button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {builder.questions.length === 0 ? <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">No additional questions enabled.</p> : null}
        {builder.questions.map((question, index) => (
          <Card key={question.id}>
            <CardContent className="space-y-4 pt-5">
              <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <Field label="Question text"><Input value={question.text} onChange={(event) => patchQuestion(question.id, { text: event.target.value })} /></Field>
                <Field label="Question type">
                  <Select value={question.type} onValueChange={(value) => patchQuestion(question.id, { type: value as CustomQuestion["type"], options: value === "yes_no" ? ["Yes", "No"] : question.options })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="short_text">Short text</SelectItem>
                      <SelectItem value="long_text">Long text</SelectItem>
                      <SelectItem value="single_choice">Single choice</SelectItem>
                      <SelectItem value="multiple_choice">Multiple choice</SelectItem>
                      <SelectItem value="yes_no">Yes or No</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="dropdown">Dropdown</SelectItem>
                      <SelectItem value="file_upload">File upload</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Applicant helper text"><Input value={question.helperText} onChange={(event) => patchQuestion(question.id, { helperText: event.target.value })} /></Field>
              {["single_choice", "multiple_choice", "dropdown"].includes(question.type) ? (
                <Field label="Answer options">
                  <Input value={question.options.join(", ")} onChange={(event) => patchQuestion(question.id, { options: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} />
                </Field>
              ) : null}
              <BooleanRow label="Required" checked={question.required} onChange={(value) => patchQuestion(question.id, { required: value })} />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={index === 0}>Move up</Button>
                <Button variant="outline" size="sm" disabled={index === builder.questions.length - 1}>Move down</Button>
                <Button variant="outline" size="sm" onClick={() => updateBuilder((current) => ({ ...current, questions: [...current.questions, { ...question, id: createId("question"), text: `${question.text} Copy` }] }))}><Copy className="mr-2 h-4 w-4" />Duplicate</Button>
                <Button variant="ghost" size="sm" onClick={() => updateBuilder((current) => ({ ...current, questions: current.questions.filter((item) => item.id !== question.id) }))}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </StepCard>
  );
}

function RulesStep({ builder, updateBuilder }: StepProps) {
  const patchRules = (patch: Partial<BuilderSchema["rules"]>) => updateBuilder((current) => ({ ...current, rules: { ...current.rules, ...patch } }));
  return (
    <StepCard title="Rules and Payment" description="Configure application behavior without changing Kallisto billing rules.">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Fee mode">
          <Select value={builder.rules.universityFeeMode} onValueChange={(value) => patchRules({ universityFeeMode: value as BuilderSchema["rules"]["universityFeeMode"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="kallisto_credit">Kallisto application credit</SelectItem>
              <SelectItem value="free">Free application</SelectItem>
              <SelectItem value="separate_fee">Separate university fee</SelectItem>
              <SelectItem value="outside_kallisto">Fee paid outside Kallisto</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="University application fee">
          <Input type="number" value={builder.rules.applicationFee} onChange={(event) => patchRules({ applicationFee: Number(event.target.value) || 0 })} />
        </Field>
        <Field label="Currency">
          <Select value={builder.rules.currency} onValueChange={(value) => patchRules({ currency: value as "UZS" | "USD" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="UZS">UZS</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Maximum applications per applicant">
          <Input type="number" min={1} value={builder.rules.maxApplicationsPerApplicant} onChange={(event) => patchRules({ maxApplicationsPerApplicant: Number(event.target.value) || 1 })} />
        </Field>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <BooleanRow label="Kallisto credit covers this application" checked={builder.rules.kallistoCreditCoversApplication} onChange={(value) => patchRules({ kallistoCreditCoversApplication: value })} />
        <BooleanRow label="Students may edit before submission" checked={builder.rules.editBeforeSubmission} onChange={(value) => patchRules({ editBeforeSubmission: value })} />
        <BooleanRow label="Students may edit after submission" checked={builder.rules.editAfterSubmission} onChange={(value) => patchRules({ editAfterSubmission: value })} />
        <BooleanRow label="Students may withdraw" checked={builder.rules.withdrawAllowed} onChange={(value) => patchRules({ withdrawAllowed: value })} />
        <BooleanRow label="Allow resubmission after information request" checked={builder.rules.resubmissionAllowed} onChange={(value) => patchRules({ resubmissionAllowed: value })} />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Applicant declaration"><Textarea value={builder.rules.declaration} onChange={(event) => patchRules({ declaration: event.target.value })} /></Field>
        <Field label="Privacy or consent acknowledgement"><Textarea value={builder.rules.consent} onChange={(event) => patchRules({ consent: event.target.value })} /></Field>
        <Field label="Automatic confirmation message"><Textarea value={builder.rules.confirmationMessage} onChange={(event) => patchRules({ confirmationMessage: event.target.value })} /></Field>
        <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Kallisto credit prices</p>
          <p className="mt-2">1 application credit: 10,000 UZS</p>
          <p>5 application credits: 45,000 UZS</p>
          <p>10 application credits: 90,000 UZS</p>
        </div>
      </div>
    </StepCard>
  );
}

function ReviewStep({
  builder,
  validation,
  history,
  setStep,
  onDuplicate,
  onArchive,
}: {
  builder: BuilderSchema;
  validation: { errors: string[]; warnings: string[] };
  history: ApplicationStructureVersion[];
  setStep: (step: BuilderStepId) => void;
  onDuplicate: () => void;
  onArchive: () => void;
}) {
  return (
    <StepCard title="Review and Publish" description="Check the complete configuration before publishing a new version.">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {[
            ["Overview", `${builder.overview.name || "Unnamed"} / ${builder.overview.academicYear} / ${builder.overview.intake}`, "overview"],
            ["Programs", `${builder.programs.selectedProgramIds.length} connected`, "programs"],
            ["Applicant information", `${builder.profileRequirements.filter((item) => item.state !== "not_requested").length} requested fields`, "profile"],
            ["Education", `${builder.educationRequirements.filter((item) => item.state !== "not_requested").length} requested items`, "education"],
            ["Documents", `${builder.documents.length} document requirements`, "documents"],
            ["Additional questions", `${builder.questions.length} questions`, "questions"],
            ["Rules and payment", builder.rules.universityFeeMode.replace(/_/g, " "), "rules"],
          ].map(([title, summary, target]) => (
            <div key={title} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{summary}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep(target as BuilderStepId)}>Edit</Button>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <ValidationPanel title="Blocking errors" items={validation.errors} tone="error" empty="No blocking errors." />
          <ValidationPanel title="Warnings" items={validation.warnings} tone="warning" empty="No warnings." />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Version history</CardTitle>
              <CardDescription>Published configurations are preserved as historical versions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.length === 0 ? <p className="text-sm text-muted-foreground">No published versions yet.</p> : history.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Version {item.versionNo}</span>
                    {item.published ? <Badge>Published</Badge> : <Badge variant="outline">Draft</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="flex flex-col gap-2">
            <Button variant="outline" onClick={onDuplicate}><Copy className="mr-2 h-4 w-4" />Duplicate application</Button>
            <Button variant="outline" onClick={onArchive}><Archive className="mr-2 h-4 w-4" />Archive</Button>
          </div>
        </div>
      </div>
    </StepCard>
  );
}

function RequirementsStep({
  title,
  description,
  groups,
  renderRequirement,
}: {
  title: string;
  description: string;
  groups: Record<string, ProfileRequirement[]>;
  renderRequirement: (item: ProfileRequirement) => ReactElement;
}) {
  return (
    <StepCard title={title} description={description}>
      <div className="space-y-5">
        {Object.entries(groups).map(([group, items]) => (
          <section key={group} className="space-y-2">
            <h3 className="text-base font-semibold">{group}</h3>
            <div className="space-y-2">{items.map(renderRequirement)}</div>
            {group === "Address" ? (
              <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                Tuman remains disabled for students until Viloyat is selected. The dependent location logic stays in the student profile workflow.
              </p>
            ) : null}
          </section>
        ))}
      </div>
    </StepCard>
  );
}

function RequirementRow({
  label,
  value,
  locked,
  reason,
  helper,
  onChange,
}: {
  label: string;
  value: RequirementState;
  locked?: boolean;
  reason?: string;
  helper?: string;
  onChange: (state: RequirementState) => void;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-medium">{label}</p>
          {locked && reason ? <p className="text-xs text-muted-foreground">{reason}</p> : null}
          {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-lg border bg-muted/30 p-1 text-xs">
          {(["required", "optional", "not_requested"] as RequirementState[]).map((state) => (
            <button
              key={state}
              type="button"
              disabled={locked && state !== "required"}
              onClick={() => onChange(state)}
              className={cn(
                "rounded-md px-3 py-1.5 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                value === state ? "bg-primary text-primary-foreground" : "hover:bg-card",
              )}
            >
              {state === "not_requested" ? "Not requested" : state[0].toUpperCase() + state.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepCard({ title, description, action, children }: { title: string; description: string; action?: ReactElement; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-sm font-medium">
        {label} {required ? <span className="text-destructive">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function BooleanRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <span className="text-sm font-medium">{label}</span>
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
    </label>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function SaveBanner({ state, error }: { state: SaveState; error: string | null }) {
  if (state === "idle") return null;
  if (state === "saving") {
    return <div className="rounded-lg border bg-card p-3 text-sm text-muted-foreground">Saving draft...</div>;
  }
  if (state === "failed") {
    return <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error ?? "Save failed"}</div>;
  }
  return <div className="rounded-lg border border-success/20 bg-success/8 p-3 text-sm text-success">Draft saved.</div>;
}

function ValidationPanel({ title, items, tone, empty }: { title: string; items: string[]; tone: "error" | "warning"; empty: string }) {
  const isError = tone === "error";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {isError ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CalendarDays className="h-4 w-4 text-warning" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {items.map((item) => (
              <li key={item} className={cn("rounded-lg border p-2", isError ? "border-destructive/20 bg-destructive/5 text-destructive" : "border-warning/20 bg-warning/5 text-warning")}>{item}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PreviewDialog({ open, onOpenChange, builder }: { open: boolean; onOpenChange: (open: boolean) => void; builder: BuilderSchema }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview as student</DialogTitle>
          <DialogDescription>This preview is generated from the current builder draft.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <aside className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            {["Program Selection", "Personal Information", "Education", "Documents", "Additional Questions", "Review", "Payment", "Submit"].map((item, index) => (
              <div key={item} className="flex items-center gap-2 rounded-md bg-card px-3 py-2">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-xs text-primary">{index + 1}</span>
                {item}
              </div>
            ))}
          </aside>
          <main className="space-y-4 rounded-lg border p-4">
            <div>
              <h2 className="text-xl font-semibold">{builder.overview.name}</h2>
              <p className="text-sm text-muted-foreground">{builder.overview.instructions}</p>
            </div>
            <section className="space-y-2">
              <h3 className="font-semibold">Program Selection</h3>
              {builder.programs.selectedProgramIds.length === 0 ? (
                <p className="text-sm text-muted-foreground">No program selection required.</p>
              ) : demoPrograms.filter((program) => builder.programs.selectedProgramIds.includes(program.id)).map((program) => (
                <div key={program.id} className="rounded-lg border p-3 text-sm">{program.name}</div>
              ))}
            </section>
            <section className="space-y-2">
              <h3 className="font-semibold">Imported from Kallisto profile</h3>
              {builder.profileRequirements.filter((item) => item.state !== "not_requested").slice(0, 6).map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>{item.label}</span>
                  <Badge variant={item.state === "required" ? "default" : "outline"}>{item.state}</Badge>
                </div>
              ))}
            </section>
            <section className="space-y-2">
              <h3 className="font-semibold">Documents</h3>
              {builder.documents.map((doc) => (
                <div key={doc.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{doc.name}</span>
                    {doc.required ? <Badge>Required</Badge> : <Badge variant="outline">Optional</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{doc.formats.join(", ")} / max {doc.maxFileSizeMb} MB</p>
                </div>
              ))}
            </section>
            <section className="space-y-2">
              <h3 className="font-semibold">Additional Questions</h3>
              {builder.questions.length === 0 ? <p className="text-sm text-muted-foreground">No additional questions.</p> : builder.questions.map((question) => (
                <div key={question.id} className="rounded-lg border p-3 text-sm">
                  <span className="font-medium">{question.text}</span>
                  {question.helperText ? <p className="mt-1 text-xs text-muted-foreground">{question.helperText}</p> : null}
                </div>
              ))}
            </section>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  actionDisabled,
  destructive,
  onAction,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionLabel: string;
  actionDisabled?: boolean;
  destructive?: boolean;
  onAction: () => void;
  children?: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant={destructive ? "destructive" : "default"} disabled={actionDisabled} onClick={onAction}>{actionLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function groupBy<T extends Record<K, string>, K extends keyof T>(items: T[], key: K): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const value = item[key];
    groups[value] = groups[value] ?? [];
    groups[value].push(item);
    return groups;
  }, {});
}
