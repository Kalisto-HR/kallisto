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
