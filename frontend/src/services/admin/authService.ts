import { adminApi } from "../api/httpClient";
import { toPortalRole } from "../mappers/responseMappers";
import type { SessionUser } from "../../types/session";

interface MeResponse {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  university_linked?: string | null;
}

export async function signInManagement(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const result = await adminApi.post<{ msg: string }>("/v1.0/signin", { email, password });
  return { ok: result.ok, error: result.error ?? undefined };
}

export async function getManagementSessionUser(): Promise<SessionUser | null> {
  const result = await adminApi.get<MeResponse>("/v1.0/me");
  if (!result.ok || !result.data) {
    return null;
  }

  const data = result.data;
  const role = toPortalRole(data.role);

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    role,
    area: "management",
    universityLinked: data.university_linked ?? null,
  };
}

export async function signOutManagement(): Promise<void> {
  await adminApi.get("/v1.0/signout");
}
