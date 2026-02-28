import { useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
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
  Send,
} from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Progress } from "../../components/ui/progress";
import { ErrorState } from "../../components/common/PageState";
import { COUNTRY_OPTIONS } from "../../data/countries";
import { useApplicationFlowData } from "../../hooks/useApplicationFlowData";
import { routes } from "../../routes/routeConfig";
import {
  fetchStudentApplication,
  importStudentProfileTestScoresToApplication,
} from "../../services/client/applicationsService";
import { fetchStudentTestScores } from "../../services/client/profileService";
import { fetchUniversityById } from "../../services/client/universitiesService";
import type { StudentTestScore } from "../../types/domain";

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
  | "agreement";

interface SchemaField {
  id: string;
  type: SchemaFieldType;
  label: string;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
  dataKey?: string;
  options?: string[];
}

interface SchemaSection {
  id: string;
  title?: string;
  name?: string;
  description?: string;
  fields: SchemaField[];
}

const steps = [
  { number: 1, label: "Overview" },
  { number: 2, label: "Requirements" },
  { number: 3, label: "Personal Info" },
  { number: 4, label: "Review" },
] as const;

const BASIC_PERSONAL_FIELD_TYPES = new Set<SchemaFieldType>([
  "short-text",
  "email",
  "phone",
  "date",
  "country",
]);

const fallbackPersonalSection: SchemaSection = {
  id: "personal-info",
  title: "Personal Information",
  description: "Basic personal information",
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

function isMissingRequired(field: SchemaField, formData: Record<string, unknown>): boolean {
  if (!field.required) {
    return false;
  }
  const value = formData[fieldKey(field)];
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim() === "";
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return false;
}

function isBasicPersonalField(field: SchemaField): boolean {
  if (!BASIC_PERSONAL_FIELD_TYPES.has(field.type)) {
    return false;
  }
  const normalized = `${field.label} ${field.dataKey ?? field.id}`.toLowerCase();
  return (
    normalized.includes("name") ||
    normalized.includes("email") ||
    normalized.includes("phone") ||
    normalized.includes("dob") ||
    normalized.includes("birth") ||
    normalized.includes("citizenship") ||
    normalized.includes("country")
  );
}

function formatTestScoreLabel(item: StudentTestScore): string {
  const title = item.testType === "OTHER" ? item.otherTestName ?? "Other" : item.testType;
  const score = `${item.score}/${item.outOf}`;
  return item.takenOn ? `${title} - ${score} (${item.takenOn})` : `${title} - ${score}`;
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
            return {
              ...current,
              fields: current.fields.filter(
                (field) => !!field && typeof field === "object" && isBasicPersonalField(field as SchemaField),
              ),
            };
          })
          .filter((section) => section.fields.length > 0);

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
      if (!universityId || !shouldLoadDraft) {
        return;
      }

      setDraftLoading(true);
      setDraftError(null);
      try {
        const application = await fetchStudentApplication(universityId, draftCycle);
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
          return;
        }

        setDraftError("This application is no longer a draft and cannot be edited here.");
      } catch (err) {
        if (!mounted) {
          return;
        }
        setDraftError(err instanceof Error ? err.message : "Failed to load existing draft");
      } finally {
        if (mounted) {
          setDraftLoading(false);
        }
      }
    };

    void loadDraft();
    return () => {
      mounted = false;
    };
  }, [draftCycle, shouldLoadDraft, universityId, flow.setCycle, flow.setFormData]);

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

  const canSubmit = requiredMissing.length === 0 && Object.keys(flow.formData).length > 0;

  const setFieldValue = (field: SchemaField, value: unknown) => {
    const key = fieldKey(field);
    flow.setFormData((prev) => ({ ...prev, [key]: value }));
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
      const saved = await flow.saveDraft();
      if (!saved) {
        return;
      }

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
    const commonLabel = (
      <Label htmlFor={key} className="flex items-center gap-1.5">
        {field.label}
        {field.required ? <span className="text-red-600">*</span> : null}
      </Label>
    );

    const helpText = field.helperText ? <p className="text-xs text-muted-foreground">{field.helperText}</p> : null;

    if (field.type === "country") {
      const options = Array.isArray(field.options) && field.options.length > 0 ? field.options : COUNTRY_OPTIONS;
      const listId = `${key}-country-options`;
      return (
        <div key={field.id} className="space-y-2">
          {commonLabel}
          <Input
            id={key}
            list={listId}
            placeholder={field.placeholder ?? "Type country name..."}
            value={typeof value === "string" ? value : ""}
            onChange={(event) => setFieldValue(field, event.target.value)}
          />
          <datalist id={listId}>
            {options.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          {helpText}
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
        : "text";

    return (
      <div key={field.id} className="space-y-2">
        {commonLabel}
        <Input
          id={key}
          type={inputType}
          placeholder={field.placeholder ?? ""}
          value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
          onChange={(event) => setFieldValue(field, event.target.value)}
        />
        {helpText}
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
            <div className="flex gap-3">
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Application Process</h1>
        <Badge variant="secondary">{universityName}</Badge>
      </div>

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
          <div className="grid grid-cols-4 gap-2">
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
                <div className="text-xs font-medium">{step.label}</div>
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
              <AlertDescription>This flow uses personal-information-only fields.</AlertDescription>
            </Alert>
            <div className="flex gap-3">
              <Link to={routes.student.universities} className="flex-1">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to search
                </Button>
              </Link>
              <Button className="flex-1" onClick={() => setCurrentStep(2)}>
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
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button className="flex-1" onClick={() => setCurrentStep(3)}>
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
            <CardTitle>Personal Information</CardTitle>
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
                  disabled={importingScores || testScoresLoading || profileTestScores.length === 0}
                  onClick={() => void importSelectedTestScores()}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {importingScores ? "Importing..." : "Import selected"}
                </Button>
              </div>

              {testScoresLoading ? <p className="text-sm text-muted-foreground">Loading profile test scores...</p> : null}
              {testScoresError ? <p className="text-sm text-red-600">{testScoresError}</p> : null}
              {importFeedback ? <p className="text-sm text-[#4F46E5]">{importFeedback}</p> : null}

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

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button className="flex-1" onClick={() => setCurrentStep(4)}>
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
                Confirm all personal information before submission.
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

            {flow.error ? (
              <ErrorState message={flow.error} />
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>Submitted applications cannot be edited after confirmation.</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCurrentStep(3)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA]"
                disabled={flow.loading || !canSubmit}
                onClick={() =>
                  void (async () => {
                    const saved = await flow.saveDraft();
                    if (!saved) {
                      return;
                    }
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
