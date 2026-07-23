import type {
  ApplicantTestScore,
  FitScoreProgram,
  FitScoreStudentProfile,
  Profile,
  University,
  UniversityListItem,
} from "../types/domain";

interface UniversityProgramLike {
  id: string;
  name: string;
  level: string | null;
  duration?: string | null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function toStringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toNumberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
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
      const row = toRecord(item);
      return (
        toStringValue(row?.name) ??
        toStringValue(row?.title) ??
        toStringValue(row?.label) ??
        toStringValue(row?.value) ??
        ""
      );
    })
    .filter((item) => item.length > 0);
}

function pickString(data: Record<string, unknown> | null | undefined, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = toStringValue(data?.[key]);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function pickNumber(data: Record<string, unknown> | null | undefined, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = toNumberValue(data?.[key]);
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

function pickStringArray(data: Record<string, unknown> | null | undefined, keys: string[]): string[] {
  for (const key of keys) {
    const value = toStringArray(data?.[key]);
    if (value.length > 0) {
      return value;
    }
  }
  return [];
}

function highestTestScore(testScores: ApplicantTestScore[], type: string): number | undefined {
  const scores = testScores
    .filter((score) => {
      if (score.testType === type) {
        return true;
      }
      return type === "HSK" && score.testType === "OTHER" && score.otherTestName?.toLowerCase().includes("hsk");
    })
    .map((score) => score.score)
    .filter((score) => Number.isFinite(score));
  return scores.length > 0 ? Math.max(...scores) : undefined;
}

export function buildFitScoreStudentProfile(
  profile: Profile | null,
  testScores: ApplicantTestScore[],
): FitScoreStudentProfile {
  const data = profile?.data ?? {};
  return {
    nationality: pickString(data, ["nationality", "country", "citizenship"]),
    educationLevel: pickString(data, ["educationLevel", "education_level", "currentEducationLevel"]),
    gpa: pickNumber(data, ["gpa", "GPA"]),
    gpaScale: pickNumber(data, ["gpaScale", "gpa_scale"]),
    ielts: highestTestScore(testScores, "IELTS") ?? pickNumber(data, ["ielts", "ieltsScore"]),
    toefl: highestTestScore(testScores, "TOEFL") ?? pickNumber(data, ["toefl", "toeflScore"]),
    hsk: highestTestScore(testScores, "HSK") ?? pickNumber(data, ["hsk", "hskLevel"]),
    sat: highestTestScore(testScores, "SAT") ?? pickNumber(data, ["sat", "satScore"]),
    intendedMajor: pickString(data, ["intendedMajor", "intended_major", "major", "fieldOfStudy"]),
    budgetPerYear: pickNumber(data, ["budgetPerYear", "budget_per_year", "annualBudget"]),
    preferredLanguage: pickString(data, ["preferredLanguage", "preferred_language"]),
    preferredCity: pickString(data, ["preferredCity", "preferred_city"]),
    documentsReady: pickStringArray(data, ["documentsReady", "documents_ready", "readyDocuments"]),
    achievements: pickStringArray(data, ["achievements", "awards"]),
  };
}

export function buildFitScoreProgramFromUniversity(
  university: University,
  primaryProgram: UniversityProgramLike | null,
  requiredDocuments: string[],
): FitScoreProgram {
  const profile = toRecord(university.universityProfile);
  const testRequirements = toRecord(profile?.testRequirements);
  const admissions = toRecord(profile?.admissions);
  return {
    universityId: university.id,
    universityName: university.name,
    programId: primaryProgram?.id ?? university.id,
    majorName: primaryProgram?.name ?? pickString(profile, ["programGroups"]) ?? university.name,
    degreeLevel: primaryProgram?.level ?? pickString(profile, ["degreeLevel", "degree_level"]),
    language: pickString(profile, ["language", "programLanguage", "teachingLanguage"]) ?? "English",
    minGpa: pickNumber(admissions, ["minGpa", "min_gpa"]) ?? pickNumber(profile, ["minGpa", "min_gpa"]),
    minIelts: pickNumber(testRequirements, ["ieltsMin", "ielts_min"]) ?? university.ieltsMin ?? undefined,
    minToefl: pickNumber(testRequirements, ["toeflMin", "toefl_min"]) ?? university.toeflMin ?? undefined,
    minHsk: pickNumber(testRequirements, ["hskLevel", "hsk_level", "minHsk", "min_hsk"]),
    tuition: university.tuitionFee ?? pickNumber(profile, ["tuition", "tuitionFee"]) ?? undefined,
    scholarshipAvailable: university.scholarshipAvailable ?? undefined,
    deadline: university.applicationDeadline ?? "",
    requiredDocuments,
    competitivenessLevel: pickString(profile, ["competitivenessLevel", "competitiveness_level"]),
  };
}

export function buildFitScoreProgramFromUniversityListItem(item: UniversityListItem): FitScoreProgram {
  return {
    universityId: item.id,
    universityName: item.name,
    programId: item.id,
    majorName: item.programGroups ?? item.name,
    language: "English",
    minIelts: item.ieltsMin ?? undefined,
    minToefl: item.toeflMin ?? undefined,
    tuition: item.tuitionFee ?? undefined,
    scholarshipAvailable: item.scholarshipAvailable ?? undefined,
    deadline: item.applicationDeadline ?? "",
    requiredDocuments: [],
  };
}
