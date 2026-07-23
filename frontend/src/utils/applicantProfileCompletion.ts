import type { Profile } from "../types/domain";

export interface ApplicantProfileCompletion {
  complete: boolean;
  missing: string[];
}

function valuePresent(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return Boolean(value);
}

export function getApplicantProfileCompletion(profile: Profile | null): ApplicantProfileCompletion {
  if (!profile) {
    return { complete: false, missing: ["profile"] };
  }

  const data = profile.data ?? {};
  const requiredFields: Array<[string, unknown]> = [
    ["last name", profile.lastName],
    ["first name", profile.firstName],
    ["gender", data.gender],
    ["date of birth", data.dateOfBirth],
    ["region", data.regionCode],
    ["district or city", data.districtCode],
    ["GPA", data.gpa],
    ["GPA scale", data.gpaScale],
    ["intended major", data.intendedMajor],
    ["budget per year", data.budgetPerYear],
    ["preferred language", data.preferredLanguage],
    ["preferred city", data.preferredCity],
    ["documents readiness", data.documentsReady],
  ];

  const missing = requiredFields
    .filter(([, value]) => !valuePresent(value))
    .map(([label]) => label);

  return {
    complete: missing.length === 0,
    missing,
  };
}
