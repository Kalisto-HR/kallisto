import { adminApi } from "../api/httpClient";
import { readSessionUserFromCookie } from "../sessionCookie";
import type { SessionUser } from "../../types/session";

export async function signInManagement(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const result = await adminApi.post<{ msg: string }>("/v1.0/signin", { email, password });
  return { ok: result.ok, error: result.error ?? undefined };
}

export async function getManagementSessionUser(): Promise<SessionUser | null> {
  const user = readSessionUserFromCookie();
  if (!user || (user.role !== "partner" && user.role !== "staff" && user.role !== "superuser-ui")) {
    return null;
  }

  return {
    ...user,
    area: "management",
  };
}

export async function requestManagementPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
  const result = await adminApi.post<{ msg: string }>("/v1.0/password/forgot", { email });
  return { ok: result.ok, error: result.error ?? undefined };
}

export async function resetManagementPassword(token: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const result = await adminApi.post<{ msg: string }>("/v1.0/password/reset", {
    token,
    new_password: newPassword,
  });
  return { ok: result.ok, error: result.error ?? undefined };
}

export async function signOutManagement(): Promise<void> {
  await adminApi.get("/v1.0/signout");
}
