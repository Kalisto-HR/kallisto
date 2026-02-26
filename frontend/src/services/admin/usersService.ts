import { adminApi } from "../api/httpClient";
import type { ManagementUser } from "../../types/domain";

interface UsersResponse {
  users: ManagementUser[];
}

export interface CreateUniversityUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export async function fetchUniversityUsers(universityId: string): Promise<ManagementUser[]> {
  const result = await adminApi.get<UsersResponse>(`/v1.0/universities/${universityId}/users`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load users");
  }
  return result.data.users ?? [];
}

export async function createUniversityUser(universityId: string, payload: CreateUniversityUserPayload): Promise<void> {
  const result = await adminApi.post<{ msg: string }>(`/v1.0/universities/${universityId}/users`, {
    email: payload.email,
    password: payload.password,
    first_name: payload.firstName,
    last_name: payload.lastName,
  });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to create user");
  }
}
