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
  logoUrl?: string | null;
  description?: string | null;
  province: string | null;
  city: string | null;
  country: string | null;
  applicationFee: number | null;
  acceptanceRate: number | null;
  tuitionFee: number | null;
  applicationDeadline: string | null;
  ieltsMin: number | null;
  toeflMin: number | null;
  scholarshipAvailable: boolean | null;
  cityType: string | null;
  campusVibe: string | null;
  programGroups?: string | null;
}

export type CompareStatus =
  | "available"
  | "not_available"
  | "limited"
  | "varies"
  | "not_provided"
  | "verified"
  | "active"
  | "pending_verification"
  | "provided"
  | "free"
  | "open"
  | "closed";

export interface CompareFinancialSupport {
  scholarships: CompareStatus;
  governmentGrants: CompareStatus;
  tuitionDiscounts: CompareStatus;
  otherSupport: CompareStatus;
}

export interface CompareAccreditation {
  licenceStatus: CompareStatus;
  nationalAccreditationStatus: CompareStatus;
  internationalAccreditationStatus: CompareStatus;
}

export interface CompareInternationalPartnerships {
  status: CompareStatus;
  verifiedCount: number;
  partners: string[];
}

export interface CompareMobility {
  exchange: CompareStatus;
  academicMobility: CompareStatus;
  doubleDegree: CompareStatus;
  semesterAbroad: CompareStatus;
}

export interface CompareCareerSupport {
  careerCentre: CompareStatus;
  internshipSupport: CompareStatus;
  employerPartnerships: CompareStatus;
  jobFairs: CompareStatus;
  entrepreneurshipSupport: CompareStatus;
  employmentData: string | null;
}

export interface CompareApplicationFee {
  amount: number | null;
  currency: string;
  status: CompareStatus;
}

export interface CompareAdmissions {
  deadline: string | null;
  deadlineStatus: "exact" | "open" | "closed" | "varies_by_program" | "not_provided";
  universityApplicationFee: CompareApplicationFee;
  kallistoApplicationFee: CompareApplicationFee;
  canApplyThroughKallisto: boolean;
  kallistoApplicationStatus: "open" | "closed" | "opening_soon" | "not_available";
}

export interface CompareUniversityItem {
  id: string;
  slug?: string | null;
  name: string;
  logoUrl?: string | null;
  region: string | null;
  city: string | null;
  averageContractAmount: number | null;
  contractCurrency: "UZS" | string;
  contractPeriod: "year" | string;
  universityType: "public" | "private" | "international_university" | "foreign_university_branch" | null;
  languagesOfInstruction: string[];
  studyFormats: string[];
  financialSupport: CompareFinancialSupport;
  dormitoryStatus: CompareStatus;
  dormitoryNote?: string | null;
  accreditation: CompareAccreditation;
  internationalPartnerships: CompareInternationalPartnerships;
  mobility: CompareMobility;
  careerSupport: CompareCareerSupport;
  admissions: CompareAdmissions;
}

export interface University {
  id: string;
  managerId: string | null;
  name: string;
  logoUrl?: string | null;
  description: string | null;
  province: string | null;
  city: string | null;
  country: string | null;
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

export type ApplicantTestScoreType = "IELTS" | "SAT" | "TOEFL" | "ACT" | "HSK" | "CSCA" | "OTHER";

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

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "additional_information_required"
  | "decision_pending"
  | "accepted"
  | "waitlisted"
  | "rejected";

export type ApplicationStatusStage =
  | "application_preparation"
  | "application_received"
  | "review_in_progress"
  | "decision_pending"
  | "final_decision"
  | "unknown";

export type ApplicantApplicationStatus = ApplicationStatus;

export interface ApplicantApplicationListItem {
  id: string;
  universityId: string;
  universityName: string;
  applicationCycle: string;
  status: ApplicantApplicationStatus;
  createdAt: string;
  submittedAt: string | null;
  statusProgress: number;
  statusStage: ApplicationStatusStage;
  isFinal: boolean;
  isSuccessfulOutcome: boolean;
}

export interface ApplicationStatusEvent {
  id: string;
  applicationId: string;
  fromStatus: ApplicationStatus;
  toStatus: ApplicationStatus;
  publicComment: string | null;
  internalNote?: string | null;
  changedBy: string | null;
  changedByRole: string | null;
  changedAt: string;
  notificationCreated: boolean;
}

export type ApplicationTaskStatus = "pending" | "in_progress" | "submitted" | "completed" | "rejected" | "not_applicable";

export interface ApplicationTask {
  id: string;
  applicationId: string;
  title: string;
  description: string | null;
  category: string;
  status: ApplicationTaskStatus;
  assignedRole: string;
  required: boolean;
  dueAt: string | null;
  completedAt: string | null;
  verifiedAt: string | null;
  relatedDocumentId: string | null;
  studentResponse: string | null;
  universityFeedback: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationDecision {
  applicationId: string;
  decisionStatus: Exclude<ApplicationStatus, "draft" | "submitted" | "under_review" | "additional_information_required" | "decision_pending">;
  decisionDate: string;
  publicMessage: string;
  studentVisibleReason: string | null;
  responseDeadline: string | null;
  waitlistPosition: number | null;
  decisionDocumentId: string | null;
}

export interface ApplicantApplication {
  id: string;
  userId: string;
  universityId: string;
  applicationCycle: string;
  status: ApplicantApplicationStatus;
  data: Record<string, unknown> | null;
  submittedAt: string | null;
  createdAt: string;
  statusProgress: number;
  statusStage: ApplicationStatusStage;
  isFinal: boolean;
  isSuccessfulOutcome: boolean;
  history: ApplicationStatusEvent[];
  tasks: ApplicationTask[];
  decision: ApplicationDecision | null;
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

export type SubmissionStatus = Exclude<ApplicationStatus, "draft">;

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
  statusProgress: number;
  statusStage: ApplicationStatusStage;
  isFinal: boolean;
  isSuccessfulOutcome: boolean;
  history: ApplicationStatusEvent[];
  tasks: ApplicationTask[];
  decision: ApplicationDecision | null;
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

export interface PartnerStudentOriginStat {
  country: string;
  count: number;
  percentage: number;
}

export interface PartnerDashboardPayload {
  newApplications: number;
  totalApplicants: number;
  avgSAT: number;
  avgIELTS: number;
  maleCount: number;
  femaleCount: number;
  nonBinaryCount: number;
  preferNotToSayCount: number;
  suspectsCount: number;
  prospectsCount: number;
  studentOriginStats: PartnerStudentOriginStat[];
  recentApplications: PartnerDashboardRecentApplication[];
  notifications: PartnerDashboardNotification[];
}

export type PartnerAnalyticsStage = "suspect" | "prospect";

export interface PartnerAnalyticsContact {
  userId: string;
  name: string;
  email: string;
  country: string;
  stage: PartnerAnalyticsStage;
  lastActivityAt: string | null;
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

export interface FitScoreStudentProfile {
  nationality?: string;
  educationLevel?: string;
  gpa?: number;
  gpaScale?: number;
  ielts?: number;
  toefl?: number;
  hsk?: number;
  sat?: number;
  intendedMajor?: string;
  budgetPerYear?: number;
  preferredLanguage?: string;
  preferredCity?: string;
  documentsReady?: string[];
  achievements?: string[];
}

export interface FitScoreProgram {
  universityId?: string;
  universityName?: string;
  programId?: string;
  majorName?: string;
  degreeLevel?: string;
  language?: string;
  minGpa?: number;
  minIelts?: number;
  minToefl?: number;
  minHsk?: number;
  tuition?: number;
  scholarshipAvailable?: boolean;
  deadline?: string;
  requiredDocuments?: string[];
  competitivenessLevel?: string;
}

export interface FitScoreBreakdown {
  academicScore: number;
  languageScore: number;
  majorScore: number;
  budgetScore: number;
  documentScore: number;
  deadlineScore: number;
}

export interface FitScoreResult {
  finalScore: number;
  label: string;
  breakdown: FitScoreBreakdown;
  reasons: string[];
  recommendations: string[];
  explanation?: string;
}

export interface BillingProduct {
  id: string;
  productType: "application_credit" | "subscription" | string;
  name: string;
  description: string | null;
  credits: number;
  priceAmount: number;
  currency: string;
  interval: string | null;
  intervalCount: number | null;
  active: boolean;
}

export interface BillingOrder {
  id: string;
  userId: string;
  productId: string;
  orderNumber: string;
  orderType: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  status: string;
  paymentProvider: string;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreditLedgerEntry {
  id: string;
  userId: string;
  transactionType: string;
  creditChange: number;
  balanceAfter: number;
  sourceType: string;
  sourceId: string | null;
  applicationId: string | null;
  description: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: string;
  startsAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  paymentProvider: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingSummary {
  creditBalance: number;
  creditsPurchased: number;
  creditsUsed: number;
  draftApplications: number;
  submittedApplications: number;
  products: BillingProduct[];
  orders: BillingOrder[];
  creditHistory: CreditLedgerEntry[];
  subscription: Subscription | null;
  hasActivePremium: boolean;
}
