import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Building2, Globe, Mail, MapPin, Plus, Save, Trash2 } from "lucide-react";
import { ErrorState, LoadingState, SuccessState } from "../common/PageState";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { useSession } from "../../hooks/useSession";
import {
  fetchPartnerUniversityProfile,
  updatePartnerUniversityProfile,
} from "../../services/partner/universityService";
import type { University } from "../../types/domain";
import { isValidUUID } from "../../utils/validation";

interface UniversityProfileProps {
  onNavigate?: (page: string) => void;
}

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
  ranking: string;
  accreditations: string[];
}

interface ProgramDraft {
  id: string;
  name: string;
  level: "Undergraduate" | "Graduate" | "Doctorate";
  duration: string;
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
  ranking: "",
  accreditations: [],
};

const EMPTY_TEST_REQUIREMENTS: TestRequirementsDraft = {
  satMin: "",
  actMin: "",
  ieltsMin: "",
  toeflMin: "",
};

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function toPrograms(value: unknown): ProgramDraft[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const source = toRecord(item);
      if (!source) {
        return null;
      }

      const rawLevel = toString(source.level);
      const level: ProgramDraft["level"] =
        rawLevel === "Graduate" || rawLevel === "Doctorate" ? rawLevel : "Undergraduate";

      return {
        id: toString(source.id) || createId("program"),
        name: toString(source.name),
        level,
        duration: toString(source.duration),
      };
    })
    .filter((item): item is ProgramDraft => item !== null);
}

function toIntakeTerms(value: unknown): IntakeTermDraft[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const source = toRecord(item);
      if (!source) {
        return null;
      }

      return {
        id: toString(source.id) || createId("term"),
        term: toString(source.term),
        deadline: toString(source.deadline),
      };
    })
    .filter((item): item is IntakeTermDraft => item !== null);
}

function buildProfileDraft(university: University): {
  profile: ProfileDraft;
  programs: ProgramDraft[];
  intakeTerms: IntakeTermDraft[];
  testRequirements: TestRequirementsDraft;
} {
  const universityProfile = toRecord(university.universityProfile) ?? {};
  const testRequirements = toRecord(universityProfile.testRequirements) ?? {};

  const location = [university.city, university.country].filter(Boolean).join(", ");

  return {
    profile: {
      universityName: university.name,
      description: university.description ?? "",
      location,
      website: toString(universityProfile.website),
      contactEmail: toString(universityProfile.contactEmail),
      foundedYear: toString(universityProfile.foundedYear),
      studentCount: toString(universityProfile.studentCount),
      facultyCount: toString(universityProfile.facultyCount),
      acceptanceRate:
        university.acceptanceRate !== null && university.acceptanceRate !== undefined
          ? String(university.acceptanceRate)
          : toString(universityProfile.acceptanceRate),
      ranking: university.ranking !== null && university.ranking !== undefined ? String(university.ranking) : "",
      accreditations: toStringArray(universityProfile.accreditations),
    },
    programs: toPrograms(universityProfile.programs),
    intakeTerms: toIntakeTerms(universityProfile.intakeTerms),
    testRequirements: {
      satMin: toString(testRequirements.satMin),
      actMin: toString(testRequirements.actMin),
      ieltsMin:
        university.ieltsMin !== null && university.ieltsMin !== undefined
          ? String(university.ieltsMin)
          : toString(testRequirements.ieltsMin),
      toeflMin:
        university.toeflMin !== null && university.toeflMin !== undefined
          ? String(university.toeflMin)
          : toString(testRequirements.toeflMin),
    },
  };
}

function parseNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function UniversityProfile({ onNavigate }: UniversityProfileProps) {
  const { universityId } = useParams();
  const { user } = useSession();
  const routeUniversityId = universityId && isValidUUID(universityId) ? universityId : null;
  const linkedUniversityId =
    user?.universityLinked && isValidUUID(user.universityLinked) ? user.universityLinked : null;
  const resolvedUniversityId = routeUniversityId ?? linkedUniversityId;

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

  const load = useCallback(async () => {
    if (!resolvedUniversityId) {
      setLoadError("Missing valid university context. Re-open this page from the partner dashboard.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const university = await fetchPartnerUniversityProfile();
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
  }, [resolvedUniversityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = useCallback(async () => {
    if (!resolvedUniversityId) {
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    const [cityPart, countryPart] = profileDraft.location
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    try {
      await updatePartnerUniversityProfile({
        name: profileDraft.universityName.trim(),
        description: profileDraft.description.trim() || null,
        city: cityPart || null,
        country: countryPart || null,
        acceptanceRate: parseNullableNumber(profileDraft.acceptanceRate),
        ranking: parseNullableNumber(profileDraft.ranking),
        ieltsMin: parseNullableNumber(testRequirements.ieltsMin),
        toeflMin: parseNullableNumber(testRequirements.toeflMin),
        universityProfile: {
          website: profileDraft.website.trim(),
          contactEmail: profileDraft.contactEmail.trim(),
          foundedYear: profileDraft.foundedYear.trim(),
          studentCount: profileDraft.studentCount.trim(),
          facultyCount: profileDraft.facultyCount.trim(),
          programs,
          intakeTerms,
          testRequirements: {
            satMin: parseNullableNumber(testRequirements.satMin),
            actMin: parseNullableNumber(testRequirements.actMin),
            ieltsMin: parseNullableNumber(testRequirements.ieltsMin),
            toeflMin: parseNullableNumber(testRequirements.toeflMin),
          },
          accreditations: profileDraft.accreditations,
        },
      });
      setSaveSuccess("Profile saved successfully.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save university profile");
    } finally {
      setSaving(false);
    }
  }, [intakeTerms, profileDraft, programs, resolvedUniversityId, testRequirements]);

  const addProgram = () => {
    setPrograms((current) => [
      ...current,
      { id: createId("program"), name: "", level: "Undergraduate", duration: "" },
    ]);
  };

  const updateProgram = (id: string, patch: Partial<ProgramDraft>) => {
    setPrograms((current) => current.map((program) => (program.id === id ? { ...program, ...patch } : program)));
  };

  const removeProgram = (id: string) => {
    setPrograms((current) => current.filter((program) => program.id !== id));
  };

  const addIntakeTerm = () => {
    setIntakeTerms((current) => [...current, { id: createId("term"), term: "", deadline: "" }]);
  };

  const updateIntakeTerm = (id: string, patch: Partial<IntakeTermDraft>) => {
    setIntakeTerms((current) => current.map((term) => (term.id === id ? { ...term, ...patch } : term)));
  };

  const removeIntakeTerm = (id: string) => {
    setIntakeTerms((current) => current.filter((term) => term.id !== id));
  };

  const addAccreditation = () => {
    const value = newAccreditation.trim();
    if (!value) {
      return;
    }
    setProfileDraft((current) => ({
      ...current,
      accreditations: current.accreditations.includes(value)
        ? current.accreditations
        : [...current.accreditations, value],
    }));
    setNewAccreditation("");
  };

  const removeAccreditation = (value: string) => {
    setProfileDraft((current) => ({
      ...current,
      accreditations: current.accreditations.filter((item) => item !== value),
    }));
  };

  if (loading) {
    return <LoadingState label="Loading university profile..." />;
  }

  if (loadError) {
    return <ErrorState message={loadError} onRetry={() => void load()} />;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">University Profile</h1>
            <p className="mt-1 text-muted-foreground">
              Manage the live university profile shown to applicants and staff.
            </p>
          </div>
          <Button className="w-full md:w-auto" onClick={() => void handleSave()} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {saveError ? <ErrorState message={saveError} /> : null}
        {saveSuccess ? <SuccessState message={saveSuccess} /> : null}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="brand-icon-tile flex h-12 w-12 items-center justify-center rounded-xl">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Your institution&apos;s public profile details.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="university-name">University Name</Label>
              <Input
                id="university-name"
                value={profileDraft.universityName}
                onChange={(event) => setProfileDraft((current) => ({ ...current, universityName: event.target.value }))}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={5}
                value={profileDraft.description}
                onChange={(event) => setProfileDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Describe your institution and its strengths."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="location"
                  className="pl-9"
                  value={profileDraft.location}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, location: event.target.value }))}
                  placeholder="City, Country"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="website"
                  className="pl-9"
                  value={profileDraft.website}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, website: event.target.value }))}
                  placeholder="https://example.edu"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact-email">Contact Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="contact-email"
                  className="pl-9"
                  value={profileDraft.contactEmail}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, contactEmail: event.target.value }))}
                  placeholder="admissions@example.edu"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="founded-year">Founded Year</Label>
              <Input
                id="founded-year"
                value={profileDraft.foundedYear}
                onChange={(event) => setProfileDraft((current) => ({ ...current, foundedYear: event.target.value }))}
                placeholder="1890"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Programs Offered</CardTitle>
                <CardDescription>List academic programs visible to applicants.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addProgram}>
                <Plus className="mr-2 h-4 w-4" />
                Add Program
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {programs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No programs are configured yet. Add your first program to populate the profile.
              </p>
            ) : null}
            {programs.map((program, index) => (
              <div key={program.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_180px_180px_auto]">
                <div className="space-y-2">
                  <Label htmlFor={`program-name-${index}`}>Program Name</Label>
                  <Input
                    id={`program-name-${index}`}
                    value={program.name}
                    onChange={(event) => updateProgram(program.id, { name: event.target.value })}
                    placeholder="Computer Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`program-level-${index}`}>Level</Label>
                  <Select value={program.level} onValueChange={(value: ProgramDraft["level"]) => updateProgram(program.id, { level: value })}>
                    <SelectTrigger id={`program-level-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                      <SelectItem value="Graduate">Graduate</SelectItem>
                      <SelectItem value="Doctorate">Doctorate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`program-duration-${index}`}>Duration</Label>
                  <Input
                    id={`program-duration-${index}`}
                    value={program.duration}
                    onChange={(event) => updateProgram(program.id, { duration: event.target.value })}
                    placeholder="4 years"
                  />
                </div>
                <div className="flex items-end">
                  <Button variant="ghost" size="icon" onClick={() => removeProgram(program.id)} aria-label={`Remove ${program.name || "program"}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Intake Terms</CardTitle>
                <CardDescription>Set the application terms and deadlines.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={addIntakeTerm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Intake
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {intakeTerms.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No intake terms are configured yet. Add one or more terms to guide applicants.
              </p>
            ) : null}
            {intakeTerms.map((term, index) => (
              <div key={term.id} className="grid gap-3 rounded-lg border p-4 md:grid-cols-[1fr_220px_auto]">
                <div className="space-y-2">
                  <Label htmlFor={`term-name-${index}`}>Term</Label>
                  <Input
                    id={`term-name-${index}`}
                    value={term.term}
                    onChange={(event) => updateIntakeTerm(term.id, { term: event.target.value })}
                    placeholder="Fall 2027"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`term-deadline-${index}`}>Deadline</Label>
                  <Input
                    id={`term-deadline-${index}`}
                    type="date"
                    value={term.deadline}
                    onChange={(event) => updateIntakeTerm(term.id, { deadline: event.target.value })}
                  />
                </div>
                <div className="flex items-end">
                  <Button variant="ghost" size="icon" onClick={() => removeIntakeTerm(term.id)} aria-label={`Remove ${term.term || "intake term"}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Score Requirements</CardTitle>
            <CardDescription>Optional minimum score guidance for applicants.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="sat-min">SAT</Label>
              <Input
                id="sat-min"
                value={testRequirements.satMin}
                onChange={(event) => setTestRequirements((current) => ({ ...current, satMin: event.target.value }))}
                placeholder="1200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="act-min">ACT</Label>
              <Input
                id="act-min"
                value={testRequirements.actMin}
                onChange={(event) => setTestRequirements((current) => ({ ...current, actMin: event.target.value }))}
                placeholder="24"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ielts-min">IELTS</Label>
              <Input
                id="ielts-min"
                value={testRequirements.ieltsMin}
                onChange={(event) => setTestRequirements((current) => ({ ...current, ieltsMin: event.target.value }))}
                placeholder="6.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toefl-min">TOEFL</Label>
              <Input
                id="toefl-min"
                value={testRequirements.toeflMin}
                onChange={(event) => setTestRequirements((current) => ({ ...current, toeflMin: event.target.value }))}
                placeholder="80"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
            <CardDescription>Enrollment, ranking, and accreditation details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="student-count">Total Students</Label>
                <Input
                  id="student-count"
                  value={profileDraft.studentCount}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, studentCount: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="faculty-count">Faculty Members</Label>
                <Input
                  id="faculty-count"
                  value={profileDraft.facultyCount}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, facultyCount: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="acceptance-rate">Acceptance Rate (%)</Label>
                <Input
                  id="acceptance-rate"
                  value={profileDraft.acceptanceRate}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, acceptanceRate: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ranking">Ranking</Label>
                <Input
                  id="ranking"
                  value={profileDraft.ranking}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, ranking: event.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="new-accreditation">Accreditations</Label>
              <div className="flex flex-wrap gap-2">
                {profileDraft.accreditations.length > 0 ? (
                  profileDraft.accreditations.map((item) => (
                    <Badge key={item} variant="secondary" className="gap-1">
                      {item}
                      <button type="button" onClick={() => removeAccreditation(item)} aria-label={`Remove ${item}`}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No accreditations have been added yet.</p>
                )}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  id="new-accreditation"
                  value={newAccreditation}
                  onChange={(event) => setNewAccreditation(event.target.value)}
                  placeholder="AACSB"
                />
                <Button variant="outline" onClick={addAccreditation}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Accreditation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onNavigate?.("university-dashboard")}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
