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
  livingCost: number | null;
  totalCost: number | null;
  applicationDeadline: string | null;
  ieltsMin: number | null;
  toeflMin: number | null;
  scholarshipAvailable: boolean | null;
  competitiveness: string | null;
  cityType: string | null;
  safetyLevel: string | null;
  campusVibe: string | null;
  visaRequired: boolean | null;
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
  livingCost: number | null;
  totalCost: number | null;
  applicationDeadline: string | null;
  ieltsMin: number | null;
  toeflMin: number | null;
  scholarshipAvailable: boolean | null;
  competitiveness: string | null;
  cityType: string | null;
  safetyLevel: string | null;
  campusVibe: string | null;
  visaRequired: boolean | null;
  applicationSchema: Record<string, unknown> | null;
  managementProfile: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  data: Record<string, unknown> | null;
  lastSeen: string | null;
}

export type StudentTestScoreType = "IELTS" | "SAT" | "TOEFL" | "ACT" | "OTHER";

export interface StudentTestScore {
  id: string;
  userId: string;
  testType: StudentTestScoreType;
  otherTestName: string | null;
  score: number;
  outOf: number;
  takenOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StudentApplicationStatus = "draft" | "submitted" | "accepted" | "rejected";

export interface StudentApplicationListItem {
  universityId: string;
  universityName: string;
  applicationCycle: string;
  status: StudentApplicationStatus;
  createdAt: string;
  submittedAt: string | null;
}

export interface StudentApplication {
  userId: string;
  universityId: string;
  applicationCycle: string;
  status: StudentApplicationStatus;
  data: Record<string, unknown> | null;
  submittedAt: string | null;
  createdAt: string;
}

export interface ApplicationTestScoreImportResult {
  importedCount: number;
  testScores: Array<{
    id: string;
    testType: StudentTestScoreType;
    otherTestName: string | null;
    score: number;
    outOf: number;
    takenOn: string | null;
    normalized: number | null;
  }>;
}

export type ReviewStatus = "pending" | "reviewing" | "accepted" | "rejected";

export interface AdminSubmittedApplication {
  id: string;
  userId: string;
  universityId: string;
  applicationCycle: string;
  applicantInfo: Record<string, unknown>;
  applicationData: Record<string, unknown>;
  submittedAt: string | null;
  receivedAt: string;
  status: ReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  notes: string | null;
}

export interface ManagementUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "partner" | "staff";
  university_linked: string | null;
  created_at: string;
}

export interface ManagerDashboardRecentApplication {
  id: string;
  name: string;
  program: string;
  citizenship: string;
  status: ReviewStatus;
  submittedAt: string | null;
}

export interface ManagerDashboardNotification {
  id: string;
  type: string;
  message: string;
  time: string;
  read: boolean;
}

export interface ManagerDashboardPayload {
  newApplications: number;
  totalApplicants: number;
  avgSAT: number;
  avgIELTS: number;
  maleCount: number;
  femaleCount: number;
  recentApplications: ManagerDashboardRecentApplication[];
  notifications: ManagerDashboardNotification[];
}

export type ManagementStaffStatus = "active" | "suspended" | "pending" | "deactivated";
export type ManagementStaffRole = "University Manager" | "Admissions Officer" | "Reviewer" | "Read-only";

export interface ManagementStaffMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  staffRole: ManagementStaffRole;
  status: ManagementStaffStatus;
  lastActiveAt: string | null;
  createdAt: string;
}

export interface ManagementStaffInvitation {
  id: string;
  email: string;
  staffRole: ManagementStaffRole;
  status: "pending" | "accepted" | "expired" | "cancelled";
  createdAt: string;
  expiresAt: string;
}

export interface ManagementStaffRoleDefinition {
  id: string;
  name: ManagementStaffRole;
  description: string;
  userCount: number;
  permissions: string[];
}

export interface ManagementStaffPagePayload extends Pagination<ManagementStaffMember> {
  invitations: ManagementStaffInvitation[];
  roles: ManagementStaffRoleDefinition[];
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
