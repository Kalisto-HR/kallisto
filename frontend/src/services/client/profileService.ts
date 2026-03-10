import { clientApi } from "../api/httpClient";
import { normalizeEnvelope, normalizeProfile, normalizeStudentTestScore } from "../mappers/responseMappers";
import type { Profile, StudentTestScore, StudentTestScoreType } from "../../types/domain";

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

  const response = await clientApi.raw("/v1.0/profile/photo", {
    method: "PUT",
    body: formData,
  });

  if (!response.ok) {
    throw new Error((await extractApiError(response)) ?? "Failed to upload profile photo");
  }
}

export async function fetchStudentPhotoUrl(): Promise<string | null> {
  const response = await clientApi.raw("/v1.0/profile/photo", {
    method: "GET",
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

export async function fetchStudentTestScores(): Promise<StudentTestScore[]> {
  const result = await clientApi.get<unknown>("/v1.0/profile/test-scores");
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load test scores");
  }

  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to load test scores");
  }

  if (!Array.isArray(envelope.data)) {
    return [];
  }
  return envelope.data.map(normalizeStudentTestScore);
}

interface UpsertTestScorePayload {
  testType: StudentTestScoreType;
  otherTestName?: string | null;
  score: number;
  outOf: number;
  takenOn?: string | null;
}

export async function createStudentTestScore(payload: UpsertTestScorePayload): Promise<StudentTestScore> {
  const result = await clientApi.post<unknown>("/v1.0/profile/test-scores", {
    test_type: payload.testType,
    other_test_name: payload.otherTestName ?? null,
    score: payload.score,
    out_of: payload.outOf,
    taken_on: payload.takenOn ?? null,
  });
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to create test score");
  }

  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to create test score");
  }

  return normalizeStudentTestScore(envelope.data);
}

export async function updateStudentTestScore(id: string, payload: UpsertTestScorePayload): Promise<StudentTestScore> {
  const result = await clientApi.put<unknown>(`/v1.0/profile/test-scores/${id}`, {
    test_type: payload.testType,
    other_test_name: payload.otherTestName ?? null,
    score: payload.score,
    out_of: payload.outOf,
    taken_on: payload.takenOn ?? null,
  });
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to update test score");
  }

  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to update test score");
  }

  return normalizeStudentTestScore(envelope.data);
}

export async function deleteStudentTestScore(id: string): Promise<void> {
  const result = await clientApi.delete<{ msg: string }>(`/v1.0/profile/test-scores/${id}`);
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to delete test score");
  }
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
