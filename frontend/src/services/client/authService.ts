import { clientApi } from "../api/httpClient";
import { readSessionUserFromCookie } from "../sessionCookie";
import type { SessionUser } from "../../types/session";

interface SignInResponse {
  msg: string;
}

interface SignUpResponse {
  msg: string;
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
  const user = readSessionUserFromCookie();
  if (!user || user.role !== "student") {
    return null;
  }

  return {
    ...user,
    area: "student",
  };
}

export async function requestStudentPasswordReset(email: string): Promise<{ ok: boolean; error?: string }> {
  const result = await clientApi.post<{ msg: string }>("/v1.0/password/forgot", { email });
  return { ok: result.ok, error: result.error ?? undefined };
}

export async function resetStudentPassword(token: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const result = await clientApi.post<{ msg: string }>("/v1.0/password/reset", {
    token,
    new_password: newPassword,
  });
  return { ok: result.ok, error: result.error ?? undefined };
}

export async function signOutStudent(): Promise<void> {
  await clientApi.get("/v1.0/signout");
}
