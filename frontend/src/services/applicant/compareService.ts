import { apiRoutes } from "../api/routes";
import { api } from "../api/httpClient";
import { normalizeEnvelope } from "../mappers/responseMappers";
import type { CompareUniversityItem } from "../../types/domain";

export const MAX_COMPARE_ITEMS = 4;
export const COMPARE_LIMIT_MESSAGE =
  `You already have ${MAX_COMPARE_ITEMS} universities in Compare. Remove one to add this university.`;
export const PREMIUM_REQUIRED_CODE = "PREMIUM_REQUIRED";
export const PREMIUM_REQUIRED_MESSAGE = "PREMIUM_REQUIRED";

function isCompareLimitErrorMessage(message: string | null | undefined): boolean {
  const normalized = message?.toLowerCase() ?? "";
  return normalized.includes(`supports up to ${MAX_COMPARE_ITEMS} universities`);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNullableString(value: unknown): string | null {
  const text = toString(value).trim();
  return text || null;
}

function toNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function normalizeCompareUniversity(value: unknown): CompareUniversityItem {
  const source = asRecord(value);
  const financialSupport = asRecord(source.financialSupport);
  const accreditation = asRecord(source.accreditation);
  const partnerships = asRecord(source.internationalPartnerships);
  const mobility = asRecord(source.mobility);
  const careerSupport = asRecord(source.careerSupport);
  const admissions = asRecord(source.admissions);
  const universityApplicationFee = asRecord(admissions.universityApplicationFee);
  const kallistoApplicationFee = asRecord(admissions.kallistoApplicationFee);

  return {
    id: toString(source.id),
    slug: toNullableString(source.slug),
    name: toString(source.name),
    logoUrl: toNullableString(source.logoUrl),
    region: toNullableString(source.region),
    city: toNullableString(source.city),
    averageContractAmount: toNumber(source.averageContractAmount),
    contractCurrency: toString(source.contractCurrency) || "UZS",
    contractPeriod: toString(source.contractPeriod) || "year",
    universityType: toNullableString(source.universityType) as CompareUniversityItem["universityType"],
    languagesOfInstruction: toStringArray(source.languagesOfInstruction),
    studyFormats: toStringArray(source.studyFormats),
    financialSupport: {
      scholarships: toString(financialSupport.scholarships) as CompareUniversityItem["financialSupport"]["scholarships"],
      governmentGrants: toString(financialSupport.governmentGrants) as CompareUniversityItem["financialSupport"]["governmentGrants"],
      tuitionDiscounts: toString(financialSupport.tuitionDiscounts) as CompareUniversityItem["financialSupport"]["tuitionDiscounts"],
      otherSupport: toString(financialSupport.otherSupport) as CompareUniversityItem["financialSupport"]["otherSupport"],
    },
    dormitoryStatus: toString(source.dormitoryStatus) as CompareUniversityItem["dormitoryStatus"],
    dormitoryNote: toNullableString(source.dormitoryNote),
    accreditation: {
      licenceStatus: toString(accreditation.licenceStatus) as CompareUniversityItem["accreditation"]["licenceStatus"],
      nationalAccreditationStatus: toString(accreditation.nationalAccreditationStatus) as CompareUniversityItem["accreditation"]["nationalAccreditationStatus"],
      internationalAccreditationStatus: toString(accreditation.internationalAccreditationStatus) as CompareUniversityItem["accreditation"]["internationalAccreditationStatus"],
    },
    internationalPartnerships: {
      status: toString(partnerships.status) as CompareUniversityItem["internationalPartnerships"]["status"],
      verifiedCount: toNumber(partnerships.verifiedCount) ?? 0,
      partners: toStringArray(partnerships.partners),
    },
    mobility: {
      exchange: toString(mobility.exchange) as CompareUniversityItem["mobility"]["exchange"],
      academicMobility: toString(mobility.academicMobility) as CompareUniversityItem["mobility"]["academicMobility"],
      doubleDegree: toString(mobility.doubleDegree) as CompareUniversityItem["mobility"]["doubleDegree"],
      semesterAbroad: toString(mobility.semesterAbroad) as CompareUniversityItem["mobility"]["semesterAbroad"],
    },
    careerSupport: {
      careerCentre: toString(careerSupport.careerCentre) as CompareUniversityItem["careerSupport"]["careerCentre"],
      internshipSupport: toString(careerSupport.internshipSupport) as CompareUniversityItem["careerSupport"]["internshipSupport"],
      employerPartnerships: toString(careerSupport.employerPartnerships) as CompareUniversityItem["careerSupport"]["employerPartnerships"],
      jobFairs: toString(careerSupport.jobFairs) as CompareUniversityItem["careerSupport"]["jobFairs"],
      entrepreneurshipSupport: toString(careerSupport.entrepreneurshipSupport) as CompareUniversityItem["careerSupport"]["entrepreneurshipSupport"],
      employmentData: toNullableString(careerSupport.employmentData),
    },
    admissions: {
      deadline: toNullableString(admissions.deadline),
      deadlineStatus: (toString(admissions.deadlineStatus) || "not_provided") as CompareUniversityItem["admissions"]["deadlineStatus"],
      universityApplicationFee: {
        amount: toNumber(universityApplicationFee.amount),
        currency: toString(universityApplicationFee.currency) || "UZS",
        status: toString(universityApplicationFee.status) as CompareUniversityItem["admissions"]["universityApplicationFee"]["status"],
      },
      kallistoApplicationFee: {
        amount: toNumber(kallistoApplicationFee.amount),
        currency: toString(kallistoApplicationFee.currency) || "UZS",
        status: toString(kallistoApplicationFee.status) as CompareUniversityItem["admissions"]["kallistoApplicationFee"]["status"],
      },
      canApplyThroughKallisto: admissions.canApplyThroughKallisto === true,
      kallistoApplicationStatus: (toString(admissions.kallistoApplicationStatus) || "not_available") as CompareUniversityItem["admissions"]["kallistoApplicationStatus"],
    },
  };
}

export async function fetchCompareList(): Promise<CompareUniversityItem[]> {
  const result = await api.get<unknown>(apiRoutes.applicant.compare.list());
  if (!result.ok || !result.data) {
    if (result.error === PREMIUM_REQUIRED_CODE) {
      throw new Error(PREMIUM_REQUIRED_MESSAGE);
    }
    throw new Error(result.error ?? "Failed to load compare list");
  }

  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to load compare list");
  }

  if (!Array.isArray(envelope.data)) {
    return [];
  }

  return envelope.data.map(normalizeCompareUniversity).filter((item) => item.id.length > 0);
}

export async function addCompareItem(universityId: string): Promise<void> {
  const result = await api.post(apiRoutes.applicant.compare.item(universityId));
  if (!result.ok) {
    if (result.error === PREMIUM_REQUIRED_CODE) {
      throw new Error(PREMIUM_REQUIRED_MESSAGE);
    }
    if (isCompareLimitErrorMessage(result.error)) {
      throw new Error(COMPARE_LIMIT_MESSAGE);
    }
    throw new Error(result.error ?? "Failed to add compare item");
  }
}

export async function removeCompareItem(universityId: string): Promise<void> {
  const result = await api.delete(apiRoutes.applicant.compare.item(universityId));
  if (!result.ok) {
    if (result.error === PREMIUM_REQUIRED_CODE) {
      throw new Error(PREMIUM_REQUIRED_MESSAGE);
    }
    throw new Error(result.error ?? "Failed to remove compare item");
  }
}

export async function clearCompareList(): Promise<void> {
  const result = await api.delete(apiRoutes.applicant.compare.list());
  if (!result.ok) {
    if (result.error === PREMIUM_REQUIRED_CODE) {
      throw new Error(PREMIUM_REQUIRED_MESSAGE);
    }
    throw new Error(result.error ?? "Failed to clear compare list");
  }
}
