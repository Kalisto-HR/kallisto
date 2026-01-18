/**
 * types.ts
 * TypeScript types matching backend API models.
 * All interfaces are properly typed to avoid 'unknown' type issues in JSX.
 */

// =============================================================================
// API Response Wrappers
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// =============================================================================
// User & Profile
// =============================================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

export interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  data: ProfileData | null;
  photo: string | null;
  lastSeen: string | null;
}

export interface ProfileData {
  bio?: string;
  phone?: string;
  address?: string;
  [key: string]: string | undefined;
}

export interface ProfileUpdateRequest {
  firstName?: string;
  lastName?: string;
  data?: ProfileData;
}

// =============================================================================
// University
// =============================================================================

/**
 * University admission requirements
 */
export interface UniversityRequirements {
  recommendation_letters?: number;
  essay_required?: boolean;
  standardized_tests?: string[];
  minimum_gpa?: number;
  application_deadline?: string;
}

/**
 * University contact information
 */
export interface UniversityContact {
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
}

/**
 * University metadata containing requirements, contact info, etc.
 */
export interface UniversityMetadata {
  requirements?: UniversityRequirements;
  contact?: UniversityContact;
  accreditation?: string;
  founded?: number;
  student_population?: number;
  [key: string]: unknown; // Allow additional fields
}

/**
 * Application form schema field definition
 */
export interface ApplicationSchemaField {
  name: string;
  type: 'text' | 'textarea' | 'number' | 'email' | 'date' | 'select' | 'checkbox';
  label: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

/**
 * Application form schema
 */
export interface ApplicationSchema {
  fields?: ApplicationSchemaField[];
  sections?: {
    title: string;
    fields: ApplicationSchemaField[];
  }[];
}

/**
 * Full university details
 */
export interface University {
  id: string;
  managerId: string | null;
  name: string;
  logo: string | null;
  description: string | null;
  province: string | null;
  applicationSchema: ApplicationSchema | null;
  ranking: number | null;
  createdAt: string;
  metadata: UniversityMetadata | null;
  applicationFee: number | null;
}

/**
 * Lightweight university for list views
 */
export interface UniversityListItem {
  id: string;
  name: string;
  province: string | null;
  ranking: number | null;
  applicationFee: number | null;
}

export interface UniversitySearchParams {
  q?: string;
  province?: string;
  minRanking?: number;
  maxRanking?: number;
  maxFee?: number;
  page?: number;
  limit?: number;
}

// =============================================================================
// Applications
// =============================================================================

export type ApplicationStatus = 'draft' | 'submitted' | 'accepted' | 'rejected';

/**
 * Application form data submitted by user
 * Uses Record<string, unknown> to allow flexible nested structures
 */
export type ApplicationData = Record<string, unknown>;

export interface Application {
  user_id: string;
  university_id: string;
  application_cycle: string;
  status: ApplicationStatus;
  data: ApplicationData | null;
  submitted_at: string | null;
  created_at: string;
}

export interface ApplicationListItem {
  university_id: string;
  university_name: string;
  application_cycle: string;
  status: ApplicationStatus;
  created_at: string;
  submitted_at: string | null;
}

export interface ApplicationCreateRequest {
  university_id: string;
  application_cycle: string;
  data?: ApplicationData;
}

export interface ApplicationUpdateRequest {
  data?: ApplicationData;
  status?: ApplicationStatus;
}

// =============================================================================
// Favorites
// =============================================================================

export interface IsFavoriteResponse {
  is_favorite: boolean;
}
