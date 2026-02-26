import { clientApi } from "../api/httpClient";
import { normalizeEnvelope, normalizeProfile } from "../mappers/responseMappers";
import type { Profile } from "../../types/domain";

export async function fetchStudentProfile(): Promise<Profile> {
  const result = await clientApi.get<unknown>("/v1.0/profile");
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load profile");
  }
  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to load profile");
  }
  return normalizeProfile(envelope.data);
}

export async function updateStudentProfile(payload: {
  firstName?: string;
  lastName?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const result = await clientApi.put<{ msg: string }>("/v1.0/profile", {
    first_name: payload.firstName,
    last_name: payload.lastName,
    data: payload.data,
  });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to update profile");
  }
}

export async function updateStudentPassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const result = await clientApi.put<{ msg: string }>("/v1.0/profile/password", {
    current_password: payload.currentPassword,
    new_password: payload.newPassword,
  });

  if (!result.ok) {
    throw new Error(result.error ?? "Failed to update password");
  }
}

export async function uploadStudentPhoto(photo: File): Promise<void> {
  const formData = new FormData();
  formData.append("photo", photo);

  const response = await fetch("/api/v1.0/profile/photo", {
    method: "PUT",
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    throw new Error((await extractApiError(response)) ?? "Failed to upload profile photo");
  }
}

export async function fetchStudentPhotoUrl(): Promise<string | null> {
  const response = await fetch("/api/v1.0/profile/photo", {
    method: "GET",
    credentials: "include",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error((await extractApiError(response)) ?? "Failed to load profile photo");
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

async function extractApiError(response: Response): Promise<string | null> {
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data) {
    return null;
  }

  const maybeMsg = data.msg;
  if (typeof maybeMsg === "string") {
    return maybeMsg;
  }

  const maybeMessage = data.message;
  if (typeof maybeMessage === "string") {
    return maybeMessage;
  }

  return null;
}
