import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  CheckCircle2,
  Download,
  FileText,
  Info,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Progress } from "../../components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { ErrorState } from "../../components/common/PageState";
import { COUNTRY_OPTIONS } from "../../data/countries";
import { useApplicationFlowData } from "../../hooks/useApplicationFlowData";
import { routes } from "../../routes/routeConfig";
import {
  fetchStudentApplication,
  fetchStudentApplications,
  importStudentProfileTestScoresToApplication,
  uploadStudentApplicationFiles,
  type ApplicationUploadedFile,
} from "../../services/client/applicationsService";
import { fetchStudentTestScores } from "../../services/client/profileService";
import { fetchUniversityById } from "../../services/client/universitiesService";
import type { StudentApplicationListItem, StudentTestScore } from "../../types/domain";

type Step = 1 | 2 | 3 | 4;

type SchemaFieldType =
  | "short-text"
  | "long-text"
  | "email"
  | "phone"
  | "date"
  | "number"
  | "radio"
  | "checkbox"
  | "dropdown"
  | "country"
  | "essay"
  | "agreement"
  | "file-upload"
  | "document"
  | "rating"
  | "address"
  | "repeating-group"
  | "recommender";

interface SchemaField {
  id: string;
  type: SchemaFieldType;
  label: string;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  dataKey?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    wordLimit?: number;
    fileTypes?: string[];
    maxFileSize?: number;
    maxFiles?: number;
  };
  visibility?: {
    applicant?: boolean;
    reviewer?: boolean;
    admin?: boolean;
  };
}

interface SchemaSection {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  order?: number;
  visible?: boolean;
  fields: SchemaField[];
}

interface RecommenderEntry {
  name: string;
  email: string;
  relationship: string;
}

const steps = [
  { number: 1, label: "Overview" },
  { number: 2, label: "Requirements" },
  { number: 3, label: "Application Form" },
  { number: 4, label: "Review" },
] as const;

const fallbackPersonalSection: SchemaSection = {
  id: "personal-info",
  title: "Personal Information",
  description: "Basic applicant details",
  fields: [
    { id: "full_name", type: "short-text", label: "Full Name", required: true, dataKey: "full_name" },
    { id: "email", type: "email", label: "Email", required: true, dataKey: "email" },
    { id: "dob", type: "date", label: "Date of Birth", required: true, dataKey: "dob" },
    { id: "citizenship", type: "country", label: "Country of Citizenship", required: true, dataKey: "citizenship" },
  ],
};

function fieldKey(field: SchemaField): string {
  return field.dataKey && field.dataKey.trim() ? field.dataKey : field.id;
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return !Number.isNaN(value);
  }
  if (Array.isArray(value)) {
    return value.some((item) => hasMeaningfulValue(item));
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((item) => hasMeaningfulValue(item));
  }
  return true;
}

function isMissingRequired(field: SchemaField, formData: Record<string, unknown>): boolean {
  if (!field.required) {
    return false;
  }
  return !hasMeaningfulValue(formData[fieldKey(field)]);
}

function formatTestScoreLabel(item: StudentTestScore): string {
  const title = item.testType === "OTHER" ? item.otherTestName ?? "Other" : item.testType;
  const score = `${item.score}/${item.outOf}`;
  return item.takenOn ? `${title} - ${score} (${item.takenOn})` : `${title} - ${score}`;
}

function buildDraftSignature(cycle: string, data: Record<string, unknown>): string {
  return JSON.stringify({ cycle: cycle.trim(), data });
}

function countWords(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

function normalizedFieldDescriptor(field: SchemaField): string {
  return `${field.label} ${field.dataKey ?? ""} ${field.id}`.toLowerCase();
}

function isEducationHistoryField(field: SchemaField): boolean {
  const descriptor = normalizedFieldDescriptor(field);
  return descriptor.includes("education") || descriptor.includes("transcript") || descriptor.includes("academic history");
}

function coerceString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return "";
}

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function coerceUploadedFiles(value: unknown): ApplicationUploadedFile[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const file = item as Record<string, unknown>;
      const id = typeof file.id === "string" ? file.id : "";
      if (!id) {
        return null;
      }
      return {
        id,
        name:
          typeof file.name === "string"
            ? file.name
            : typeof file.file_name === "string"
              ? file.file_name
              : "Uploaded file",
        type:
          typeof file.type === "string"
            ? file.type
            : typeof file.content_type === "string"
              ? file.content_type
              : "application/octet-stream",
        size:
          typeof file.size === "number"
            ? file.size
            : typeof file.file_size === "number"
              ? file.file_size
              : 0,
        storage: typeof file.storage === "string" ? file.storage : "application_file",
        downloadUrl:
          typeof file.download_url === "string"
            ? file.download_url
            : typeof file.downloadUrl === "string"
              ? file.downloadUrl
              : typeof file.url === "string"
                ? file.url
                : "",
      };
    })
    .filter((item): item is ApplicationUploadedFile => item !== null);
}

function coerceEducationEntries(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Array<{
      institutionName: string;
      country: string;
      degreeAwarded: string;
      gpa: string;
      graduationYear: string;
      transcriptFiles: ApplicationUploadedFile[];
    }>;
  }
  return value.map((item) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      institutionName: coerceString(row.institutionName ?? row.institution_name ?? row.school ?? row.school_name),
      country: coerceString(row.country),
      degreeAwarded: coerceString(row.degreeAwarded ?? row.degree_awarded ?? row.degree),
      gpa: coerceString(row.gpa),
      graduationYear: coerceString(row.graduationYear ?? row.graduation_year ?? row.year),
      transcriptFiles: coerceUploadedFiles(row.transcriptFiles ?? row.files),
    };
  });
}

function createEmptyEducationEntry() {
  return {
    institutionName: "",
    country: "",
    degreeAwarded: "",
    gpa: "",
    graduationYear: "",
    transcriptFiles: [] as ApplicationUploadedFile[],
  };
}

function coerceRepeatingGroupItems(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => coerceString(item)).filter((item) => item.trim().length > 0);
}

function coerceRecommenderEntries(value: unknown): RecommenderEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => {
    const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      name: coerceString(row.name ?? row.full_name ?? row.fullName),
      email: coerceString(row.email),
      relationship: coerceString(row.relationship ?? row.title ?? row.role),
    };
  });
}

function createEmptyRecommenderEntry(): RecommenderEntry {
  return {
    name: "",
    email: "",
    relationship: "",
  };
}

function createAddressValue(value: unknown) {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  return {
    street: coerceString(record.street),
    city: coerceString(record.city),
    state: coerceString(record.state),
    postalCode: coerceString(record.postalCode ?? record.postal_code),
    country: coerceString(record.country),
  };
}

function toggleCheckboxValue(currentValue: unknown, option: string, checked: boolean): string[] {
  const current = new Set(coerceStringArray(currentValue));
  if (checked) {
    current.add(option);
  } else {
    current.delete(option);
  }
  return Array.from(current);
}

function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) {
    return "Unknown size";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function StudentApplicationCreatePage() {
  const { universityId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const flow = useApplicationFlowData(universityId);
  const draftCycle = (searchParams.get("cycle") ?? "").trim();
  const openDraftMode = searchParams.get("mode") === "draft";
  const shouldLoadDraft = openDraftMode && draftCycle.length > 0;

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [schemaSections, setSchemaSections] = useState<SchemaSection[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [universityName, setUniversityName] = useState("Selected University");
  const [universityMeta, setUniversityMeta] = useState("");
  const [profileTestScores, setProfileTestScores] = useState<StudentTestScore[]>([]);
  const [selectedTestScoreIds, setSelectedTestScoreIds] = useState<string[]>([]);
  const [testScoresLoading, setTestScoresLoading] = useState(false);
  const [testScoresError, setTestScoresError] = useState<string | null>(null);
  const [importingScores, setImportingScores] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [uploadingFieldKey, setUploadingFieldKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [existingApplications, setExistingApplications] = useState<StudentApplicationListItem[]>([]);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [draftSaveState, setDraftSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const lastSavedSignatureRef = useRef(buildDraftSignature(flow.cycle, flow.formData));
  const hasUnsavedChangesRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const loadSchema = async () => {
      if (!universityId) {
        setSchemaLoading(false);
        return;
      }
      setSchemaLoading(true);
      setSchemaError(null);
      try {
        const university = await fetchUniversityById(universityId);
        if (!mounted) {
          return;
        }
        setUniversityName(university.name || "Selected University");
        setUniversityMeta([university.city, university.country].filter(Boolean).join(", "));

        const rawSchema = university.applicationSchema;
        const sectionsRaw = Array.isArray(rawSchema?.sections) ? rawSchema.sections : [];
        const sections = sectionsRaw
          .filter((section): section is SchemaSection => {
            if (!section || typeof section !== "object") {
              return false;
            }
            const maybeSection = section as Record<string, unknown>;
            return Array.isArray(maybeSection.fields);
          })
          .map((section) => {
            const current = section as unknown as SchemaSection;
            const fields = current.fields
              .filter((field): field is SchemaField => !!field && typeof field === "object")
              .filter((field) => field.visibility?.applicant !== false)
              .sort((left, right) => {
                const leftOrder = typeof (left as SchemaField & { order?: number }).order === "number"
                  ? (left as SchemaField & { order?: number }).order ?? 0
                  : 0;
                const rightOrder = typeof (right as SchemaField & { order?: number }).order === "number"
                  ? (right as SchemaField & { order?: number }).order ?? 0
                  : 0;
                return leftOrder - rightOrder;
              });
            return {
              ...current,
              fields,
            };
          })
          .filter((section) => section.visible !== false)
          .filter((section) => section.fields.length > 0);

        sections.sort((left, right) => (left.order ?? 0) - (right.order ?? 0));

        setSchemaSections(sections.length > 0 ? sections : [fallbackPersonalSection]);
      } catch (err) {
        if (!mounted) {
          return;
        }
        setSchemaError(err instanceof Error ? err.message : "Failed to load application schema");
        setSchemaSections([fallbackPersonalSection]);
      } finally {
        if (mounted) {
          setSchemaLoading(false);
        }
      }
    };

    void loadSchema();
    return () => {
      mounted = false;
    };
  }, [universityId]);

  useEffect(() => {
    let mounted = true;
    const loadDraft = async () => {
      setDraftHydrated(false);
      if (!universityId) {
        if (mounted) {
          setExistingApplications([]);
          setDraftHydrated(true);
        }
        return;
      }

      setDraftLoading(true);
      setDraftError(null);
      try {
        const applications = await fetchStudentApplications();
        const matchingApplications = applications.filter((item) => item.universityId === universityId);
        if (!mounted) {
          return;
        }
        setExistingApplications(matchingApplications);

        let cycleToLoad = shouldLoadDraft ? draftCycle : "";
        if (!cycleToLoad) {
          const latestDraft = matchingApplications.find(
            (item) => item.status === "draft",
          );
          cycleToLoad = latestDraft?.applicationCycle ?? "";
        }
        if (!cycleToLoad) {
          if (!mounted) {
            return;
          }
          flow.setCycle("2026-Fall");
          flow.setFormData({});
          lastSavedSignatureRef.current = buildDraftSignature("2026-Fall", {});
          hasUnsavedChangesRef.current = false;
          setDraftSaveState("idle");
          return;
        }

        const application = await fetchStudentApplication(universityId, cycleToLoad);
        if (!mounted) {
          return;
        }

        if (application.status === "draft") {
          flow.setCycle(application.applicationCycle);
          const existingData =
            application.data && typeof application.data === "object" && !Array.isArray(application.data)
              ? (application.data as Record<string, unknown>)
              : {};
          flow.setFormData(existingData);
          flow.markDraftLoaded(application.applicationCycle);
          lastSavedSignatureRef.current = buildDraftSignature(application.applicationCycle, existingData);
          hasUnsavedChangesRef.current = false;
          setDraftSaveState("saved");
          if (!shouldLoadDraft) {
            setCurrentStep(3);
          }
          return;
        }

        if (shouldLoadDraft) {
          setDraftError("This application is no longer a draft and cannot be edited here.");
        }
      } catch (err) {
        if (!mounted) {
          return;
        }
        if (shouldLoadDraft) {
          setDraftError(err instanceof Error ? err.message : "Failed to load existing draft");
        } else {
          setDraftError(null);
        }
      } finally {
        if (mounted) {
          setDraftLoading(false);
          setDraftHydrated(true);
        }
      }
    };

    void loadDraft();
    return () => {
      mounted = false;
    };
  }, [
    draftCycle,
    shouldLoadDraft,
    universityId,
    flow.markDraftLoaded,
    flow.setCycle,
    flow.setFormData,
  ]);

  useEffect(() => {
    let mounted = true;
    const loadProfileTestScores = async () => {
      setTestScoresLoading(true);
      setTestScoresError(null);
      try {
        const scores = await fetchStudentTestScores();
        if (!mounted) {
          return;
        }
        setProfileTestScores(scores);
        setSelectedTestScoreIds(scores.map((item) => item.id));
      } catch (err) {
        if (!mounted) {
          return;
        }
        setTestScoresError(err instanceof Error ? err.message : "Failed to load profile test scores");
      } finally {
        if (mounted) {
          setTestScoresLoading(false);
        }
      }
    };

    void loadProfileTestScores();
    return () => {
      mounted = false;
    };
  }, []);

  const progress = useMemo(() => ((currentStep - 1) / (steps.length - 1)) * 100, [currentStep]);

  const requiredMissing = useMemo(() => {
    return schemaSections.flatMap((section) =>
      section.fields
        .filter((field) => isMissingRequired(field, flow.formData))
        .map((field) => `${section.title ?? section.name ?? "Section"}: ${field.label}`),
    );
  }, [schemaSections, flow.formData]);

  const essayLimitErrors = useMemo(() => {
    return schemaSections.flatMap((section) =>
      section.fields.flatMap((field) => {
        if (field.type !== "essay" || typeof field.validation?.wordLimit !== "number") {
          return [];
        }
        const wordLimit = field.validation.wordLimit;
        const wordCount = countWords(coerceString(flow.formData[fieldKey(field)]));
        if (wordCount <= wordLimit) {
          return [];
        }
        return [`${section.title ?? section.name ?? "Section"}: ${field.label} exceeds ${wordLimit} words (${wordCount})`];
      }),
    );
  }, [schemaSections, flow.formData]);

  const currentCycle = flow.cycle.trim();
  const duplicateApplication = useMemo(
    () =>
      existingApplications.find(
        (item) => item.applicationCycle === currentCycle && item.status !== "draft",
      ) ?? null,
    [currentCycle, existingApplications],
  );

  const canSubmit =
    requiredMissing.length === 0 &&
    essayLimitErrors.length === 0 &&
    Object.keys(flow.formData).length > 0 &&
    !duplicateApplication;
  const hasFormContent = Object.keys(flow.formData).length > 0;
  const draftSignature = useMemo(
    () => buildDraftSignature(flow.cycle, flow.formData),
    [flow.cycle, flow.formData],
  );
  const duplicateApplicationHref = duplicateApplication
    ? routes.student.applicationDetail(duplicateApplication.universityId, duplicateApplication.applicationCycle)
    : null;

  useEffect(() => {
    if (!draftHydrated || !hasFormContent || flow.loading || duplicateApplication) {
      return;
    }
    if (draftSignature === lastSavedSignatureRef.current) {
      hasUnsavedChangesRef.current = false;
      return;
    }

    hasUnsavedChangesRef.current = true;
    if (draftSaveState !== "idle" && draftSaveState !== "saving") {
      setDraftSaveState("idle");
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        setDraftSaveState("saving");
        const saved = await flow.saveDraft({ advanceStep: false, silent: true });
        if (saved) {
          lastSavedSignatureRef.current = draftSignature;
          hasUnsavedChangesRef.current = false;
          setDraftSaveState("saved");
        } else {
          hasUnsavedChangesRef.current = true;
          setDraftSaveState("error");
        }
      })();
    }, 1200);

    return () => {
      window.clearTimeout(handle);
    };
  }, [draftHydrated, draftSaveState, draftSignature, duplicateApplication, hasFormContent, flow.loading, flow.saveDraft]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChangesRef.current || !hasFormContent || duplicateApplication) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
      void flow.saveDraft({ advanceStep: false, silent: true });
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [duplicateApplication, flow.saveDraft, hasFormContent]);

  const draftStatusMessage = useMemo(() => {
    if (!hasFormContent || !draftHydrated) {
      return null;
    }
    if (draftSaveState === "saving") {
      return "Saving draft...";
    }
    if (draftSaveState === "saved") {
      return "Draft saved";
    }
    if (draftSaveState === "error") {
      return "Save failed. Changes will retry on next edit.";
    }
    return "Draft changes pending...";
  }, [draftHydrated, draftSaveState, hasFormContent]);

  useEffect(() => {
    return () => {
      if (!hasUnsavedChangesRef.current || !hasFormContent || duplicateApplication) {
        return;
      }
      void flow.saveDraft({ advanceStep: false, silent: true });
    };
  }, [duplicateApplication, flow.saveDraft, hasFormContent]);

  const setFieldValue = (field: SchemaField, value: unknown) => {
    const key = fieldKey(field);
    flow.setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const updateObjectFieldValue = (
    field: SchemaField,
    property: string,
    propertyValue: unknown,
    createDefault: () => Record<string, unknown>,
  ) => {
    const key = fieldKey(field);
    flow.setFormData((previous) => {
      const current =
        previous[key] && typeof previous[key] === "object" && !Array.isArray(previous[key])
          ? { ...(previous[key] as Record<string, unknown>) }
          : createDefault();
      return {
        ...previous,
        [key]: {
          ...current,
          [property]: propertyValue,
        },
      };
    });
  };

  const updateArrayEntryValue = <T extends object>(
    field: SchemaField,
    index: number,
    property: keyof T,
    propertyValue: unknown,
    currentEntries: T[],
  ) => {
    const next = currentEntries.map((entry, entryIndex) =>
      entryIndex === index
        ? {
            ...entry,
            [property]: propertyValue,
          }
        : entry,
    );
    setFieldValue(field, next);
  };

  const uploadFilesForField = async (field: SchemaField, files: File[]) => {
    if (!universityId || files.length === 0) {
      return;
    }

    setUploadingFieldKey(fieldKey(field));
    setUploadError(null);
    try {
      const uploadedFiles = await uploadStudentApplicationFiles(universityId, flow.cycle, files, fieldKey(field));
      const existingFiles = coerceUploadedFiles(flow.formData[fieldKey(field)]);
      const maxFiles = field.validation?.maxFiles;
      const mergedFiles = [...existingFiles, ...uploadedFiles];
      setFieldValue(field, typeof maxFiles === "number" && maxFiles > 0 ? mergedFiles.slice(0, maxFiles) : mergedFiles);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload files");
    } finally {
      setUploadingFieldKey(null);
    }
  };

  const uploadEducationFiles = async (field: SchemaField, index: number, files: File[]) => {
    if (!universityId || files.length === 0) {
      return;
    }

    setUploadingFieldKey(fieldKey(field));
    setUploadError(null);
    try {
      const uploadedFiles = await uploadStudentApplicationFiles(universityId, flow.cycle, files, fieldKey(field));
      const entries = coerceEducationEntries(flow.formData[fieldKey(field)]);
      const nextEntries = entries.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              transcriptFiles: [...entry.transcriptFiles, ...uploadedFiles],
            }
          : entry,
      );
      setFieldValue(field, nextEntries);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload transcript files");
    } finally {
      setUploadingFieldKey(null);
    }
  };

  const removeUploadedFile = (field: SchemaField, fileId: string) => {
    const remaining = coerceUploadedFiles(flow.formData[fieldKey(field)]).filter((item) => item.id !== fileId);
    setFieldValue(field, remaining);
  };

  const renderUploadedFiles = (field: SchemaField, files: ApplicationUploadedFile[]) => {
    if (files.length === 0) {
      return null;
    }

    return (
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
              <p className="text-xs text-slate-500">
                {file.type} · {formatFileSize(file.size)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {file.downloadUrl ? (
                <Button type="button" size="sm" variant="outline" asChild>
                  <a href={file.downloadUrl} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="ghost" onClick={() => removeUploadedFile(field, file.id)}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderEducationRepeatingGroup = (field: SchemaField) => {
    const key = fieldKey(field);
    const entries = coerceEducationEntries(flow.formData[key]);
    return (
      <div key={field.id} className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
            {field.label}
            {field.required ? <span className="text-red-600">*</span> : null}
          </div>
          {field.helperText ? <p className="text-xs text-muted-foreground">{field.helperText}</p> : null}
        </div>
        <div className="space-y-4">
          {entries.map((entry, index) => (
            <div key={`${key}-${index}`} className="space-y-4 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-900">Institution {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFieldValue(field, entries.filter((_, entryIndex) => entryIndex !== index))}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Remove
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Institution Name</Label>
                  <Input
                    value={entry.institutionName}
                    onChange={(event) =>
                      updateArrayEntryValue(field, index, "institutionName", event.target.value, entries)
                    }
                    placeholder="e.g. Westminster International University"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    list={`${key}-education-country-options`}
                    value={entry.country}
                    onChange={(event) => updateArrayEntryValue(field, index, "country", event.target.value, entries)}
                    placeholder="Type country name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Degree Awarded</Label>
                  <Input
                    value={entry.degreeAwarded}
                    onChange={(event) =>
                      updateArrayEntryValue(field, index, "degreeAwarded", event.target.value, entries)
                    }
                    placeholder="e.g. Bachelor of Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label>GPA</Label>
                  <Input
                    value={entry.gpa}
                    onChange={(event) => updateArrayEntryValue(field, index, "gpa", event.target.value, entries)}
                    placeholder="e.g. 3.8"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Graduation Year</Label>
                  <Input
                    value={entry.graduationYear}
                    onChange={(event) =>
                      updateArrayEntryValue(field, index, "graduationYear", event.target.value, entries)
                    }
                    placeholder="e.g. 2024"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor={`${key}-transcripts-${index}`}>Academic Transcripts</Label>
                  <Input
                    id={`${key}-transcripts-${index}`}
                    type="file"
                    multiple
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      if (files.length === 0) {
                        return;
                      }
                      void uploadEducationFiles(field, index, files);
                      event.currentTarget.value = "";
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Upload transcript files for this institution.</p>
                </div>
                {entry.transcriptFiles.length > 0 ? (
                  <div className="space-y-2">
                    {entry.transcriptFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
                          <p className="text-xs text-slate-500">
                            {file.type} · {formatFileSize(file.size)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {file.downloadUrl ? (
                            <Button type="button" size="sm" variant="outline" asChild>
                              <a href={file.downloadUrl} target="_blank" rel="noreferrer">
                                Open
                              </a>
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              updateArrayEntryValue(
                                field,
                                index,
                                "transcriptFiles",
                                entry.transcriptFiles.filter((item) => item.id !== file.id),
                                entries,
                              )
                            }
                          >
                            <Trash2 className="mr-1.5 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          <datalist id={`${key}-education-country-options`}>
            {COUNTRY_OPTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          <Button
            type="button"
            variant="outline"
            onClick={() => setFieldValue(field, [...entries, createEmptyEducationEntry()])}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add education entry
          </Button>
        </div>
      </div>
    );
  };

  const renderRecommenderField = (field: SchemaField) => {
    const entries = coerceRecommenderEntries(flow.formData[fieldKey(field)]);
    return (
      <div key={field.id} className="space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
            {field.label}
            {field.required ? <span className="text-red-600">*</span> : null}
          </div>
          {field.helperText ? <p className="text-xs text-muted-foreground">{field.helperText}</p> : null}
        </div>
        {entries.map((entry, index) => (
          <div key={`${field.id}-${index}`} className="space-y-4 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-900">Recommender {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFieldValue(field, entries.filter((_, entryIndex) => entryIndex !== index))}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Remove
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={entry.name}
                  onChange={(event) => updateArrayEntryValue(field, index, "name", event.target.value, entries)}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={entry.email}
                  onChange={(event) => updateArrayEntryValue(field, index, "email", event.target.value, entries)}
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Relationship</Label>
                <Input
                  value={entry.relationship}
                  onChange={(event) =>
                    updateArrayEntryValue(field, index, "relationship", event.target.value, entries)
                  }
                  placeholder="Professor, counselor, employer..."
                />
              </div>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => setFieldValue(field, [...entries, createEmptyRecommenderEntry()])}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add recommender
        </Button>
      </div>
    );
  };

  const toggleTestScoreSelection = (id: string, checked: boolean) => {
    setSelectedTestScoreIds((current) => {
      if (checked) {
        if (current.includes(id)) {
          return current;
        }
        return [...current, id];
      }
      return current.filter((value) => value !== id);
    });
  };

  const toggleSelectAllTestScores = (checked: boolean) => {
    if (checked) {
      setSelectedTestScoreIds(profileTestScores.map((item) => item.id));
      return;
    }
    setSelectedTestScoreIds([]);
  };

  const importSelectedTestScores = async () => {
    if (!universityId) {
      return;
    }
    if (profileTestScores.length === 0) {
      setImportFeedback("No profile test scores available to import.");
      return;
    }
    if (selectedTestScoreIds.length === 0) {
      setImportFeedback("Select at least one test score to import.");
      return;
    }

    setImportingScores(true);
    setImportFeedback(null);
    try {
      const saved = await flow.saveDraft({ advanceStep: false });
      if (!saved) {
        return;
      }
      lastSavedSignatureRef.current = draftSignature;
      hasUnsavedChangesRef.current = false;
      setDraftSaveState("saved");

      const result = await importStudentProfileTestScoresToApplication(universityId, flow.cycle, selectedTestScoreIds);
      const scoreRows = result.testScores.map((score) => ({
        id: score.id,
        test_type: score.testType,
        other_test_name: score.otherTestName,
        score: score.score,
        out_of: score.outOf,
        taken_on: score.takenOn,
        normalized: score.normalized,
      }));

      flow.setFormData((previous) => {
        const next: Record<string, unknown> = { ...previous, test_scores: scoreRows };
        const bestByType: Record<string, { score: number; normalized: number }> = {};
        for (const score of result.testScores) {
          if (score.testType === "OTHER") {
            continue;
          }
          const normalized = score.normalized ?? (score.outOf > 0 ? score.score / score.outOf : 0);
          const existing = bestByType[score.testType];
          if (!existing || normalized > existing.normalized || (normalized === existing.normalized && score.score > existing.score)) {
            bestByType[score.testType] = { score: score.score, normalized };
          }
        }

        const mapping: Record<string, string> = {
          IELTS: "ielts",
          SAT: "sat",
          TOEFL: "toefl",
          ACT: "act",
        };
        for (const [type, key] of Object.entries(mapping)) {
          if (bestByType[type]) {
            next[key] = bestByType[type].score;
          } else {
            delete next[key];
          }
        }
        return next;
      });

      setImportFeedback(`Imported ${result.importedCount} test score(s) into this draft.`);
    } catch (err) {
      setImportFeedback(err instanceof Error ? err.message : "Failed to import test scores");
    } finally {
      setImportingScores(false);
    }
  };

  const renderField = (field: SchemaField) => {
    const key = fieldKey(field);
    const value = flow.formData[key];
    const options = Array.isArray(field.options) ? field.options.filter((option) => option.trim().length > 0) : [];
    const commonLabel = (
      <Label htmlFor={key} className="flex items-center gap-1.5">
        {field.label}
        {field.required ? <span className="text-red-600">*</span> : null}
      </Label>
    );
    const helpText = field.helperText ? <p className="text-xs text-muted-foreground">{field.helperText}</p> : null;

    if (field.type === "repeating-group" && isEducationHistoryField(field)) {
      return renderEducationRepeatingGroup(field);
    }

    if (field.type === "recommender") {
      return renderRecommenderField(field);
    }

    if (field.type === "repeating-group") {
      const items = coerceRepeatingGroupItems(value);
      return (
        <div key={field.id} className="space-y-3">
          {commonLabel}
          {helpText}
          {items.map((item, index) => (
            <div key={`${key}-${index}`} className="flex items-center gap-2">
              <Input
                value={item}
                placeholder={field.placeholder ?? `Entry ${index + 1}`}
                onChange={(event) =>
                  setFieldValue(
                    field,
                    items.map((current, currentIndex) => (currentIndex === index ? event.target.value : current)),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setFieldValue(field, items.filter((_, currentIndex) => currentIndex !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => setFieldValue(field, [...items, ""])}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add entry
          </Button>
        </div>
      );
    }

    if (field.type === "address") {
      const address = createAddressValue(value);
      return (
        <div key={field.id} className="space-y-3">
          {commonLabel}
          {helpText}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`${key}-street`}>Street Address</Label>
              <Input
                id={`${key}-street`}
                value={address.street}
                onChange={(event) =>
                  updateObjectFieldValue(field, "street", event.target.value, () => createAddressValue(undefined))
                }
                placeholder="Street address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${key}-city`}>City</Label>
              <Input
                id={`${key}-city`}
                value={address.city}
                onChange={(event) =>
                  updateObjectFieldValue(field, "city", event.target.value, () => createAddressValue(undefined))
                }
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${key}-state`}>State / Province</Label>
              <Input
                id={`${key}-state`}
                value={address.state}
                onChange={(event) =>
                  updateObjectFieldValue(field, "state", event.target.value, () => createAddressValue(undefined))
                }
                placeholder="State or province"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${key}-postal`}>Postal Code</Label>
              <Input
                id={`${key}-postal`}
                value={address.postalCode}
                onChange={(event) =>
                  updateObjectFieldValue(field, "postalCode", event.target.value, () => createAddressValue(undefined))
                }
                placeholder="Postal code"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${key}-country`}>Country</Label>
              <Input
                id={`${key}-country`}
                list={`${key}-address-country-options`}
                value={address.country}
                onChange={(event) =>
                  updateObjectFieldValue(field, "country", event.target.value, () => createAddressValue(undefined))
                }
                placeholder="Type country name"
              />
              <datalist id={`${key}-address-country-options`}>
                {COUNTRY_OPTIONS.map((option) => (
                  <option key={option} value={option} />
                ))}
              </datalist>
            </div>
          </div>
        </div>
      );
    }

    if (field.type === "file-upload" || field.type === "document") {
      const files = coerceUploadedFiles(value);
      const accept = field.validation?.fileTypes?.join(",");
      return (
        <div key={field.id} className="space-y-3">
          {commonLabel}
          {helpText}
          <Input
            id={key}
            type="file"
            multiple={(field.validation?.maxFiles ?? 1) > 1}
            accept={accept}
            onChange={(event) => {
              const filesToUpload = Array.from(event.target.files ?? []);
              if (filesToUpload.length === 0) {
                return;
              }
              void uploadFilesForField(field, filesToUpload);
              event.currentTarget.value = "";
            }}
          />
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {typeof field.validation?.maxFiles === "number" ? <span>Max files: {field.validation.maxFiles}</span> : null}
            {typeof field.validation?.maxFileSize === "number" ? <span>Max size: {field.validation.maxFileSize} MB</span> : null}
            {field.validation?.fileTypes?.length ? <span>Allowed: {field.validation.fileTypes.join(", ")}</span> : null}
          </div>
          {uploadingFieldKey === key ? <p className="text-xs text-[#4F46E5]">Uploading files...</p> : null}
          {renderUploadedFiles(field, files)}
        </div>
      );
    }

    if (field.type === "country") {
      const countryOptions = options.length > 0 ? options : COUNTRY_OPTIONS;
      return (
        <div key={field.id} className="space-y-2">
          {commonLabel}
          <Input
            id={key}
            list={`${key}-country-options`}
            placeholder={field.placeholder ?? "Type country name..."}
            value={coerceString(value)}
            onChange={(event) => setFieldValue(field, event.target.value)}
          />
          <datalist id={`${key}-country-options`}>
            {countryOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          {helpText}
        </div>
      );
    }

    if (field.type === "radio") {
      return (
        <div key={field.id} className="space-y-3">
          {commonLabel}
          {helpText}
          <div className="space-y-2">
            {options.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={key}
                  checked={coerceString(value) === option}
                  onChange={() => setFieldValue(field, option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (field.type === "checkbox") {
      const selectedValues = coerceStringArray(value);
      return (
        <div key={field.id} className="space-y-3">
          {commonLabel}
          {helpText}
          <div className="space-y-2">
            {options.map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedValues.includes(option)}
                  onCheckedChange={(checked) => setFieldValue(field, toggleCheckboxValue(value, option, checked === true))}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (field.type === "dropdown") {
      return (
        <div key={field.id} className="space-y-2">
          {commonLabel}
          <Select value={coerceString(value)} onValueChange={(nextValue) => setFieldValue(field, nextValue)}>
            <SelectTrigger id={key}>
              <SelectValue placeholder={field.placeholder ?? "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {helpText}
        </div>
      );
    }

    if (field.type === "agreement") {
      return (
        <div key={field.id} className="space-y-2 rounded-lg border border-slate-200 p-4">
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={value === true}
              onCheckedChange={(checked) => setFieldValue(field, checked === true)}
            />
            <span className="leading-6">
              {field.label}
              {field.required ? <span className="ml-1 text-red-600">*</span> : null}
            </span>
          </label>
          {helpText}
        </div>
      );
    }

    if (field.type === "long-text" || field.type === "essay") {
      const wordLimit = typeof field.validation?.wordLimit === "number" ? field.validation.wordLimit : null;
      const wordCount = field.type === "essay" ? countWords(coerceString(value)) : 0;
      const exceedsWordLimit = wordLimit !== null && wordCount > wordLimit;
      return (
        <div key={field.id} className="space-y-2">
          {commonLabel}
          <Textarea
            id={key}
            rows={field.type === "essay" ? 8 : 5}
            placeholder={field.placeholder ?? ""}
            value={coerceString(value)}
            className={exceedsWordLimit ? "border-red-500 focus-visible:ring-red-500" : undefined}
            onChange={(event) => setFieldValue(field, event.target.value)}
          />
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {helpText}
            {wordLimit !== null ? (
              <span className={exceedsWordLimit ? "font-medium text-red-600" : undefined}>
                {wordCount}/{wordLimit} words
              </span>
            ) : null}
          </div>
          {exceedsWordLimit ? (
            <p className="text-xs text-red-600">Reduce this essay to {wordLimit} words or fewer before submitting.</p>
          ) : null}
        </div>
      );
    }

    const inputType: InputHTMLAttributes<HTMLInputElement>["type"] =
      field.type === "date"
        ? "date"
        : field.type === "email"
        ? "email"
        : field.type === "phone"
        ? "tel"
        : field.type === "number" || field.type === "rating"
        ? "number"
        : "text";

    return (
      <div key={field.id} className="space-y-2">
        {commonLabel}
        <Input
          id={key}
          type={inputType}
          placeholder={field.placeholder ?? ""}
          min={field.validation?.min}
          max={field.validation?.max}
          value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
          onChange={(event) => setFieldValue(field, event.target.value)}
        />
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {helpText}
          {typeof field.validation?.min === "number" ? <span>Min: {field.validation.min}</span> : null}
          {typeof field.validation?.max === "number" ? <span>Max: {field.validation.max}</span> : null}
        </div>
      </div>
    );
  };

  if (flow.step === "success") {
    return (
      <div className="mx-auto max-w-4xl">
        <Card className="border-2 border-green-500/20">
          <CardHeader className="space-y-4 py-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCheck className="h-10 w-10 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-3xl">Application Submitted</CardTitle>
              <p className="mt-2 text-muted-foreground">
                Your application for <strong>{universityName}</strong> was submitted.
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-[#4F46E5]/30 bg-[#4F46E5]/5">
              <Info className="h-4 w-4 text-[#4F46E5]" />
              <AlertDescription>You can track status updates from your applications dashboard.</AlertDescription>
            </Alert>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to={routes.student.applications} className="flex-1">
                <Button variant="outline" className="w-full">
                  View Applications
                </Button>
              </Link>
              <Link to={routes.student.universities} className="flex-1">
                <Button className="w-full">Return to Search</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Application Process</h1>
        <Badge variant="secondary">{universityName}</Badge>
      </div>
      {draftStatusMessage ? (
        <p className={`text-sm ${draftSaveState === "error" ? "text-red-600" : "text-muted-foreground"}`}>
          {draftStatusMessage}
        </p>
      ) : null}

      {duplicateApplication ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p>
              You've already applied to this university for <strong>{duplicateApplication.applicationCycle}</strong>.
            </p>
            {duplicateApplicationHref ? (
              <Link className="font-medium text-[#4F46E5] underline-offset-4 hover:underline" to={duplicateApplicationHref}>
                Open existing application
              </Link>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {shouldLoadDraft && draftLoading ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>Loading your saved draft...</AlertDescription>
        </Alert>
      ) : null}

      {shouldLoadDraft && draftError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{draftError}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardContent className="pt-6">
          <div className="mb-6">
            <Progress value={progress} className="h-2" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div
                  className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                    currentStep > step.number
                      ? "border-[#4F46E5] bg-[#4F46E5] text-white"
                      : currentStep === step.number
                      ? "border-[#4F46E5] bg-[#4F46E5]/10 text-[#4F46E5]"
                      : "border-muted-foreground/30 text-muted-foreground"
                  }`}
                >
                  {currentStep > step.number ? <CheckCircle2 className="h-5 w-5" /> : step.number}
                </div>
                <div className="text-xs font-medium leading-tight">{step.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {currentStep === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Application Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="text-sm text-muted-foreground">Target university</div>
              <div className="text-lg font-semibold">{universityName}</div>
              {universityMeta ? <div className="text-sm text-muted-foreground">{universityMeta}</div> : null}
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>This flow follows the application structure published by the university.</AlertDescription>
            </Alert>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to={routes.student.universities} className="flex-1">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to search
                </Button>
              </Link>
              <Button className="flex-1" disabled={Boolean(duplicateApplication)} onClick={() => setCurrentStep(2)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {currentStep === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Eligibility and Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {schemaLoading ? <p>Loading requirements...</p> : null}
            {schemaError ? <p className="text-red-600">{schemaError}</p> : null}
            <p>{schemaSections.length} section(s) configured.</p>
            <p>{schemaSections.reduce((acc, section) => acc + section.fields.length, 0)} total field(s).</p>
            <p>
              {schemaSections.reduce((acc, section) => acc + section.fields.filter((field) => field.required).length, 0)}
              {" "}required field(s).
            </p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button className="flex-1" disabled={Boolean(duplicateApplication)} onClick={() => setCurrentStep(3)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {currentStep === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Application Form</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cycle">Application cycle</Label>
              <Input id="cycle" value={flow.cycle} onChange={(event) => flow.setCycle(event.target.value)} />
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-medium">Import Test Scores</h3>
                  <p className="text-sm text-muted-foreground">
                    Pull saved profile test scores into this application draft.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={Boolean(duplicateApplication) || importingScores || testScoresLoading || profileTestScores.length === 0}
                  onClick={() => void importSelectedTestScores()}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {importingScores ? "Importing..." : "Import selected"}
                </Button>
              </div>

              {testScoresLoading ? <p className="text-sm text-muted-foreground">Loading profile test scores...</p> : null}
              {testScoresError ? <p className="text-sm text-red-600">{testScoresError}</p> : null}
              {importFeedback ? <p className="text-sm text-[#4F46E5]">{importFeedback}</p> : null}
              {uploadError ? <p className="text-sm text-red-600">{uploadError}</p> : null}

              {!testScoresLoading && !testScoresError && profileTestScores.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No saved test scores yet. Add them in Settings / Profile / Test Scores.
                </p>
              ) : null}

              {profileTestScores.length > 0 ? (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={selectedTestScoreIds.length > 0 && selectedTestScoreIds.length === profileTestScores.length}
                      onCheckedChange={(checked) => toggleSelectAllTestScores(checked === true)}
                    />
                    Select all
                  </label>
                  {profileTestScores.map((item) => (
                    <label key={item.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={selectedTestScoreIds.includes(item.id)}
                        onCheckedChange={(checked) => toggleTestScoreSelection(item.id, checked === true)}
                      />
                      <span>{formatTestScoreLabel(item)}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-6">
              {schemaSections.map((section) => (
                <div key={section.id} className="space-y-4 rounded-lg border p-4">
                  <div>
                    <h3 className="font-medium">{section.title ?? section.name ?? "Section"}</h3>
                    {section.description ? <p className="text-xs text-muted-foreground">{section.description}</p> : null}
                  </div>
                  <div className="space-y-4">{section.fields.map((field) => renderField(field))}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button className="flex-1" disabled={Boolean(duplicateApplication)} onClick={() => setCurrentStep(4)}>
                Review
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {currentStep === 4 ? (
        <Card>
          <CardHeader>
            <CardTitle>Review and Submit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-accent p-4">
              <div className="font-medium">Submission checklist</div>
              <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                <FileText className="mt-0.5 h-4 w-4" />
                Confirm all required university application fields before submission.
              </div>
            </div>

            {requiredMissing.length > 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Missing required fields: {requiredMissing.slice(0, 5).join(", ")}
                  {requiredMissing.length > 5 ? "..." : ""}
                </AlertDescription>
              </Alert>
            ) : null}

            {essayLimitErrors.length > 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Essay limit issues: {essayLimitErrors.slice(0, 3).join(", ")}
                  {essayLimitErrors.length > 3 ? "..." : ""}
                </AlertDescription>
              </Alert>
            ) : null}

            {flow.error ? (
              <ErrorState message={flow.error} />
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Submitted applications cannot be edited after confirmation.</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={() => setCurrentStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA]"
                disabled={flow.loading || !canSubmit}
                onClick={() =>
                  void (async () => {
                    const saved = await flow.saveDraft({ advanceStep: false });
                    if (!saved) {
                      return;
                    }
                    lastSavedSignatureRef.current = draftSignature;
                    hasUnsavedChangesRef.current = false;
                    setDraftSaveState("saved");
                    await flow.submit();
                  })()
                }
              >
                <Send className="mr-2 h-4 w-4" />
                {flow.loading ? "Submitting..." : "Submit Application"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
