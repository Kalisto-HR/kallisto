import { CheckCircle2, ClipboardCheck, DollarSign, GraduationCap, Languages, MapPin, Save } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Progress } from "../ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { calculateDocumentReadiness, REQUIRED_MATCH_DOCUMENTS } from "./applicantMatchProfile";

export interface ApplicantMatchProfileForm {
  nationality: string;
  educationLevel: string;
  gpa: string;
  gpaScale: string;
  intendedMajor: string;
  budgetPerYear: string;
  preferredLanguage: string;
  preferredCity: string;
  documentsReady: string[];
  achievements: string;
}

const EDUCATION_LEVELS = [
  { value: "high_school", label: "High school" },
  { value: "foundation", label: "Foundation" },
  { value: "bachelor", label: "Bachelor" },
  { value: "master", label: "Master" },
  { value: "phd", label: "PhD" },
];

const LANGUAGE_OPTIONS = [
  { value: "English", label: "English" },
  { value: "Chinese", label: "Chinese" },
  { value: "Russian", label: "Russian" },
  { value: "Any", label: "Any" },
];

interface ApplicantMatchProfileEditorProps {
  value: ApplicantMatchProfileForm;
  saving?: boolean;
  onChange: (value: ApplicantMatchProfileForm) => void;
  onSave: () => void;
  onReset: () => void;
}

function updateField(
  value: ApplicantMatchProfileForm,
  key: keyof ApplicantMatchProfileForm,
  nextValue: string | string[],
): ApplicantMatchProfileForm {
  return { ...value, [key]: nextValue };
}

function toggleDocument(value: ApplicantMatchProfileForm, documentName: string): ApplicantMatchProfileForm {
  const ready = new Set(value.documentsReady);
  if (ready.has(documentName)) {
    ready.delete(documentName);
  } else {
    ready.add(documentName);
  }
  return { ...value, documentsReady: Array.from(ready) };
}

export function ApplicantMatchProfileEditor({
  value,
  saving = false,
  onChange,
  onSave,
  onReset,
}: ApplicantMatchProfileEditorProps) {
  const readiness = calculateDocumentReadiness(value.documentsReady);
  const readyCount = REQUIRED_MATCH_DOCUMENTS.filter((documentName) => value.documentsReady.includes(documentName)).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Match Profile
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            These fields feed Kallisto Match Score on university and program pages.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="match-nationality">Nationality</Label>
              <Input
                id="match-nationality"
                value={value.nationality}
                onChange={(event) => onChange(updateField(value, "nationality", event.target.value))}
                placeholder="e.g. Uzbekistan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="match-education-level">Education level</Label>
              <Select
                value={value.educationLevel}
                onValueChange={(nextValue) => onChange(updateField(value, "educationLevel", nextValue))}
              >
                <SelectTrigger id="match-education-level">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="match-gpa">GPA</Label>
              <Input
                id="match-gpa"
                type="number"
                min="0"
                step="0.01"
                value={value.gpa}
                onChange={(event) => onChange(updateField(value, "gpa", event.target.value))}
                placeholder="e.g. 3.6"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="match-gpa-scale">GPA scale</Label>
              <Input
                id="match-gpa-scale"
                type="number"
                min="0"
                step="0.01"
                value={value.gpaScale}
                onChange={(event) => onChange(updateField(value, "gpaScale", event.target.value))}
                placeholder="e.g. 4.0"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="match-intended-major">Intended major</Label>
              <Input
                id="match-intended-major"
                value={value.intendedMajor}
                onChange={(event) => onChange(updateField(value, "intendedMajor", event.target.value))}
                placeholder="e.g. Computer Science"
              />
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="match-budget" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                Budget per year
              </Label>
              <Input
                id="match-budget"
                type="number"
                min="0"
                step="100"
                value={value.budgetPerYear}
                onChange={(event) => onChange(updateField(value, "budgetPerYear", event.target.value))}
                placeholder="RMB"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="match-language" className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-muted-foreground" />
                Preferred language
              </Label>
              <Select
                value={value.preferredLanguage}
                onValueChange={(nextValue) => onChange(updateField(value, "preferredLanguage", nextValue))}
              >
                <SelectTrigger id="match-language">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="match-city" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Preferred city
              </Label>
              <Input
                id="match-city"
                value={value.preferredCity}
                onChange={(event) => onChange(updateField(value, "preferredCity", event.target.value))}
                placeholder="e.g. Shanghai"
              />
            </div>
          </section>

          <section className="space-y-3">
            <Label htmlFor="match-achievements">Achievements</Label>
            <Textarea
              id="match-achievements"
              rows={4}
              value={value.achievements}
              onChange={(event) => onChange(updateField(value, "achievements", event.target.value))}
              placeholder="One achievement per line"
            />
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onReset} disabled={saving}>
              Reset
            </Button>
            <Button type="button" onClick={onSave} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save match profile"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Document Readiness
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Mark documents that are ready to use in applications.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Readiness</span>
              <Badge variant="secondary">{readyCount}/{REQUIRED_MATCH_DOCUMENTS.length}</Badge>
            </div>
            <Progress value={readiness} className="h-2" />
            <p className="mt-2 text-xs text-muted-foreground">{readiness}% ready for document-based scoring.</p>
          </div>

          <div className="space-y-2">
            {REQUIRED_MATCH_DOCUMENTS.map((documentName) => {
              const checked = value.documentsReady.includes(documentName);
              return (
                <label
                  key={documentName}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-secondary/60"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => onChange(toggleDocument(value, documentName))}
                    aria-label={documentName}
                  />
                  <span className="min-w-0 flex-1">{documentName}</span>
                  {checked ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
