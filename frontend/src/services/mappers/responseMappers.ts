import type {
  SubmittedApplication,
  ApiEnvelope,
  ApplicationTestScoreImportResult,
  BasketCheckoutPreview,
  BasketPlan,
  Pagination,
  Profile,
  ApplicantBasketState,
  ApplicantApplication,
  ApplicantApplicationListItem,
  ApplicantTestScore,
  University,
  UniversityListItem,
} from "../../types/domain";

export function toPortalRole(role: string): "applicant" | "partner" | "staff" {
  if (role === "partner") {
    return "partner";
  }
  if (role === "staff") {
    return "staff";
  }
  return "applicant";
}

export function normalizeEnvelope<T>(value: unknown): ApiEnvelope<T> {
  const fallback: ApiEnvelope<T> = {
    success: false,
    data: null as T,
    message: "Unexpected API response shape",
  };

  if (!value || typeof value !== "object") {
    return fallback;
  }

  const source = value as Record<string, unknown>;
  if (typeof source.success !== "boolean") {
    return fallback;
  }

  return {
    success: source.success,
    data: (source.data as T) ?? (null as T),
    message: typeof source.message === "string" ? source.message : "",
    timestamp: typeof source.timestamp === "number" ? source.timestamp : undefined,
  };
}

export function normalizePagination<T>(value: unknown): Pagination<T> {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    items: Array.isArray(source.items) ? (source.items as T[]) : [],
    total: toNumber(source.total),
    page: toNumber(source.page, 1),
    limit: toNumber(source.limit, 10),
    totalPages: toNumber(source.total_pages ?? source.totalPages, 1),
  };
}

export function normalizeUniversityListItem(value: unknown): UniversityListItem {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    id: toString(source.id),
    name: toString(source.name),
    description: toNullableString(source.description),
    province: toNullableString(source.province),
    city: toNullableString(source.city),
    country: toNullableString(source.country),
    ranking: toNullableNumber(source.ranking),
    applicationFee: toNullableNumber(source.application_fee ?? source.applicationFee),
    acceptanceRate: toNullableNumber(source.acceptance_rate ?? source.acceptanceRate),
    tuitionFee: toNullableNumber(source.tuition_fee ?? source.tuitionFee),
    applicationDeadline: toNullableString(source.application_deadline ?? source.applicationDeadline),
    ieltsMin: toNullableNumber(source.ielts_min ?? source.ieltsMin),
    toeflMin: toNullableNumber(source.toefl_min ?? source.toeflMin),
    scholarshipAvailable: toNullableBool(source.scholarship_available ?? source.scholarshipAvailable),
    cityType: toNullableString(source.city_type ?? source.cityType),
    campusVibe: toNullableString(source.campus_vibe ?? source.campusVibe),
    programGroups: toNullableString(source.program_groups ?? source.programGroups),
  };
}

export function normalizeUniversity(value: unknown): University {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    id: toString(source.id),
    managerId: toNullableString(source.manager_id ?? source.managerId),
    name: toString(source.name),
    description: toNullableString(source.description),
    province: toNullableString(source.province),
    city: toNullableString(source.city),
    country: toNullableString(source.country),
    ranking: toNullableNumber(source.ranking),
    applicationFee: toNullableNumber(source.application_fee ?? source.applicationFee),
    acceptanceRate: toNullableNumber(source.acceptance_rate ?? source.acceptanceRate),
    tuitionFee: toNullableNumber(source.tuition_fee ?? source.tuitionFee),
    applicationDeadline: toNullableString(source.application_deadline ?? source.applicationDeadline),
    ieltsMin: toNullableNumber(source.ielts_min ?? source.ieltsMin),
    toeflMin: toNullableNumber(source.toefl_min ?? source.toeflMin),
    scholarshipAvailable: toNullableBool(source.scholarship_available ?? source.scholarshipAvailable),
    cityType: toNullableString(source.city_type ?? source.cityType),
    campusVibe: toNullableString(source.campus_vibe ?? source.campusVibe),
    applicationSchema: toRecord(source.application_schema ?? source.applicationSchema),
    applicationStructurePublished: toNullableBool(
      source.application_structure_published ?? source.applicationStructurePublished,
    ) ?? false,
    universityProfile: toRecord(source.university_profile ?? source.universityProfile),
    metadata: toRecord(source.metadata),
    createdAt: toString(source.created_at ?? source.createdAt),
  };
}

export function normalizeBasketPlan(value: unknown): BasketPlan {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    id: toString(source.id),
    name: toString(source.name),
    capacity: toNumber(source.capacity),
    price: toNumber(source.price),
    perApp: toNumber(source.per_app ?? source.perApp),
    savings: toNumber(source.savings),
    featured: Boolean(source.featured),
    description: toString(source.description),
    priceCaption: toString(source.price_caption ?? source.priceCaption),
  };
}

export function normalizeApplicantBasketState(value: unknown): ApplicantBasketState {
  const source = (value ?? {}) as Record<string, unknown>;
  const rawItems = Array.isArray(source.items) ? source.items : [];
  return {
    items: rawItems.map(normalizeUniversityListItem).filter((item) => item.id.length > 0),
    selectedPlanId: toNullableString(source.selected_plan_id ?? source.selectedPlanId),
    recommendedPlanId: toNullableString(source.recommended_plan_id ?? source.recommendedPlanId),
    totalUniversities: toNumber(source.total_universities ?? source.totalUniversities),
    maxPlanCapacity: toNumber(source.max_plan_capacity ?? source.maxPlanCapacity),
  };
}

export function normalizeBasketCheckoutPreview(value: unknown): BasketCheckoutPreview {
  const source = (value ?? {}) as Record<string, unknown>;
  const rawUniversities = Array.isArray(source.universities) ? source.universities : [];
  const rawWarnings = Array.isArray(source.warnings) ? source.warnings : [];

  return {
    plan: normalizeBasketPlan(source.plan),
    universities: rawUniversities.map(normalizeUniversityListItem).filter((item) => item.id.length > 0),
    applicationCount: toNumber(source.application_count ?? source.applicationCount),
    estimatedTotal: toNumber(source.estimated_total ?? source.estimatedTotal),
    status: toString(source.status),
    readyForPaymentApi: Boolean(source.ready_for_payment_api ?? source.readyForPaymentApi),
    warnings: rawWarnings.filter((warning): warning is string => typeof warning === "string"),
  };
}

export function normalizeProfile(value: unknown): Profile {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    id: toString(source.id),
    email: toString(source.email),
    firstName: toString(source.first_name ?? source.firstName),
    lastName: toString(source.last_name ?? source.lastName),
    data: toRecord(source.data),
    lastSeen: toNullableString(source.last_seen ?? source.lastSeen),
  };
}

export function normalizeApplicantApplicationListItem(value: unknown): ApplicantApplicationListItem {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    universityId: toString(source.university_id ?? source.universityId),
    universityName: toString(source.university_name ?? source.universityName),
    applicationCycle: toString(source.application_cycle ?? source.applicationCycle),
    status: toString(source.status) as ApplicantApplicationListItem["status"],
    createdAt: toString(source.created_at ?? source.createdAt),
    submittedAt: toNullableString(source.submitted_at ?? source.submittedAt),
  };
}

export function normalizeApplicantApplication(value: unknown): ApplicantApplication {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    userId: toString(source.user_id ?? source.userId),
    universityId: toString(source.university_id ?? source.universityId),
    applicationCycle: toString(source.application_cycle ?? source.applicationCycle),
    status: toString(source.status) as ApplicantApplication["status"],
    data: toRecord(source.data),
    submittedAt: toNullableString(source.submitted_at ?? source.submittedAt),
    createdAt: toString(source.created_at ?? source.createdAt),
  };
}

export function normalizeApplicantTestScore(value: unknown): ApplicantTestScore {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    id: toString(source.id),
    userId: toString(source.user_id ?? source.userId),
    testType: toString(source.test_type ?? source.testType) as ApplicantTestScore["testType"],
    otherTestName: toNullableString(source.other_test_name ?? source.otherTestName),
    score: toNumber(source.score),
    outOf: toNumber(source.out_of ?? source.outOf),
    takenOn: toNullableString(source.taken_on ?? source.takenOn),
    createdAt: toString(source.created_at ?? source.createdAt),
    updatedAt: toString(source.updated_at ?? source.updatedAt),
  };
}

export function normalizeApplicationTestScoreImportResult(value: unknown): ApplicationTestScoreImportResult {
  const source = (value ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(source.test_scores ?? source.testScores)
    ? ((source.test_scores ?? source.testScores) as unknown[])
    : [];

  return {
    importedCount: toNumber(source.imported_count ?? source.importedCount),
    testScores: rows.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      return {
        id: toString(item.id),
        testType: toString(item.test_type ?? item.testType) as ApplicantTestScore["testType"],
        otherTestName: toNullableString(item.other_test_name ?? item.otherTestName),
        score: toNumber(item.score),
        outOf: toNumber(item.out_of ?? item.outOf),
        takenOn: toNullableString(item.taken_on ?? item.takenOn),
        normalized: toNullableNumber(item.normalized),
      };
    }),
  };
}

export function normalizeSubmittedApplication(value: unknown): SubmittedApplication {
  const source = (value ?? {}) as Record<string, unknown>;
  return {
    id: toString(source.id),
    userId: toString(source.user_id ?? source.userId),
    universityId: toString(source.university_id ?? source.universityId),
    applicationCycle: toString(source.application_cycle ?? source.applicationCycle),
    applicantInfo: toRecord(source.applicant_info ?? source.applicantInfo) ?? {},
    applicationData: toRecord(source.application_data ?? source.applicationData) ?? {},
    submittedAt: toNullableString(source.submitted_at ?? source.submittedAt),
    receivedAt: toString(source.received_at ?? source.receivedAt),
    status: toString(source.status) as SubmittedApplication["status"],
  };
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toNullableBool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}
