export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp?: number;
}

export interface Pagination<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UniversityListItem {
  id: string;
  name: string;
  province: string | null;
  city: string | null;
  country: string | null;
  ranking: number | null;
  applicationFee: number | null;
  acceptanceRate: number | null;
  tuitionFee: number | null;
  applicationDeadline: string | null;
  ieltsMin: number | null;
  toeflMin: number | null;
  scholarshipAvailable: boolean | null;
  cityType: string | null;
  campusVibe: string | null;
}

export interface University {
  id: string;
  managerId: string | null;
  name: string;
  description: string | null;
  province: string | null;
  city: string | null;
  country: string | null;
  ranking: number | null;
  applicationFee: number | null;
  acceptanceRate: number | null;
  tuitionFee: number | null;
  applicationDeadline: string | null;
  ieltsMin: number | null;
  toeflMin: number | null;
  scholarshipAvailable: boolean | null;
  cityType: string | null;
  campusVibe: string | null;
  applicationSchema: Record<string, unknown> | null;
  applicationStructurePublished: boolean;
  universityProfile: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface BasketPlan {
  id: string;
  name: string;
  capacity: number;
  price: number;
  perApp: number;
  savings: number;
  featured: boolean;
  description: string;
  priceCaption: string;
}

export interface ApplicantBasketState {
  items: UniversityListItem[];
  selectedPlanId: string | null;
  recommendedPlanId: string | null;
  totalUniversities: number;
  maxPlanCapacity: number;
}

export interface BasketCheckoutPreview {
  plan: BasketPlan;
  universities: UniversityListItem[];
  applicationCount: number;
  estimatedTotal: number;
  status: string;
  readyForPaymentApi: boolean;
  warnings: string[];
}

export interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  data: Record<string, unknown> | null;
  lastSeen: string | null;
}

export type ApplicantTestScoreType = "IELTS" | "SAT" | "TOEFL" | "ACT" | "OTHER";

export interface ApplicantTestScore {
  id: string;
  userId: string;
  testType: ApplicantTestScoreType;
  otherTestName: string | null;
  score: number;
  outOf: number;
  takenOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ApplicantApplicationStatus = "draft" | "submitted";

export interface ApplicantApplicationListItem {
  universityId: string;
  universityName: string;
  applicationCycle: string;
  status: ApplicantApplicationStatus;
  createdAt: string;
  submittedAt: string | null;
}

export interface ApplicantApplication {
  userId: string;
  universityId: string;
  applicationCycle: string;
  status: ApplicantApplicationStatus;
  data: Record<string, unknown> | null;
  submittedAt: string | null;
  createdAt: string;
}

export interface ApplicationTestScoreImportResult {
  importedCount: number;
  testScores: Array<{
    id: string;
    testType: ApplicantTestScoreType;
    otherTestName: string | null;
    score: number;
    outOf: number;
    takenOn: string | null;
    normalized: number | null;
  }>;
}

export type SubmissionStatus = "submitted";

export interface SubmittedApplication {
  id: string;
  userId: string;
  universityId: string;
  applicationCycle: string;
  applicantInfo: Record<string, unknown>;
  applicationData: Record<string, unknown>;
  submittedAt: string | null;
  receivedAt: string;
  status: SubmissionStatus;
}

export interface PartnerDashboardRecentApplication {
  id: string;
  name: string;
  program: string;
  citizenship: string;
  status: SubmissionStatus;
  submittedAt: string | null;
}

export interface PartnerDashboardNotification {
  id: string;
  type: string;
  message: string;
  time: string;
  read: boolean;
}

export interface PartnerDashboardPayload {
  newApplications: number;
  totalApplicants: number;
  avgSAT: number;
  avgIELTS: number;
  maleCount: number;
  femaleCount: number;
  recentApplications: PartnerDashboardRecentApplication[];
  notifications: PartnerDashboardNotification[];
}

export interface ApplicationStructureVersion {
  id: string;
  universityId: string;
  versionNo: number;
  schema: Record<string, unknown> | null;
  published: boolean;
  changedBy: string | null;
  changeNote: string | null;
  createdAt: string;
}
