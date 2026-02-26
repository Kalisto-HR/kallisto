import { clientApi } from "../api/httpClient";
import { normalizeEnvelope, toPortalRole } from "../mappers/responseMappers";
import type { SessionUser } from "../../types/session";

interface SignInResponse {
  msg: string;
}

interface SignUpResponse {
  msg: string;
}

interface MeResponse {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

export async function signInStudent(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  const result = await clientApi.post<SignInResponse>("/v1.0/signin", { email, password });
  return { ok: result.ok, error: result.error ?? undefined };
}

export async function signUpStudent(
  email: string,
  firstName: string,
  lastName: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const result = await clientApi.post<SignUpResponse>("/v1.0/signup", {
    email,
    first_name: firstName,
    last_name: lastName,
    password,
  });
  return { ok: result.ok, error: result.error ?? undefined };
}

export async function getStudentSessionUser(): Promise<SessionUser | null> {
  const result = await clientApi.get<unknown>("/v1.0/me");
  if (!result.ok || !result.data) {
    return null;
  }

  const envelope = normalizeEnvelope<MeResponse>(result.data);
  if (!envelope.success) {
    return null;
  }

  return {
    id: envelope.data.id,
    firstName: envelope.data.first_name,
    lastName: envelope.data.last_name,
    role: toPortalRole(envelope.data.role),
    area: "student",
  };
}

export async function signOutStudent(): Promise<void> {
  await clientApi.get("/v1.0/signout");
}
