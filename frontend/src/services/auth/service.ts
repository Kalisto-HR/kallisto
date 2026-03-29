import { apiRoutes } from "../api/routes";
import { api } from "../api/httpClient";
import type { SessionUser } from "../../types/session";

export async function signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const result = await api.post<{ msg: string }>(apiRoutes.auth.signIn(), { email, password });
  return { ok: result.ok, error: result.error ?? undefined };
}

export async function signUpApplicant(
  email: string,
  firstName: string,
  lastName: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const result = await api.post<{ msg: string }>(apiRoutes.auth.signUp(), {
    email,
    first_name: firstName,
    last_name: lastName,
    password,
  });
  return { ok: result.ok, error: result.error ?? undefined };
}

export async function signOut(): Promise<void> {
  await api.post(apiRoutes.auth.signOut());
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const result = await api.get<{ user?: BackendSessionUser }>(apiRoutes.auth.session());
  if (!result.ok) {
    if (result.status === 401) {
      return null;
    }
    throw new Error(result.error ?? "Failed to resolve session");
  }
  if (!result.data?.user) {
    return null;
  }
  return normalizeSessionUser(result.data.user);
}

interface BackendSessionUser {
  id?: unknown;
  email?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  role?: unknown;
  permissions?: unknown;
  university_linked?: unknown;
}

function normalizeSessionUser(value: BackendSessionUser): SessionUser {
  return {
    id: toString(value.id),
    email: toOptionalString(value.email) ?? undefined,
    firstName: toString(value.first_name),
    lastName: toString(value.last_name),
    role: normalizeRole(value.role),
    permissions: normalizePermissions(value.permissions),
    universityLinked: toOptionalString(value.university_linked),
  };
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function normalizePermissions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

function normalizeRole(value: unknown): SessionUser["role"] {
  switch (value) {
    case "partner":
      return "partner";
    case "staff":
      return "staff";
    default:
      return "applicant";
  }
}
