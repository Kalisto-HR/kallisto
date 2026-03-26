import type { ManagementUser } from "../../types/domain";

export interface CreateUniversityUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export async function fetchUniversityUsers(universityId: string): Promise<ManagementUser[]> {
  void universityId;
  throw new Error("University-side user management has been removed");
}

export async function createUniversityUser(universityId: string, payload: CreateUniversityUserPayload): Promise<void> {
  void universityId;
  void payload;
  throw new Error("University-side user management has been removed");
}
