import { apiRoutes } from "../api/routes";
import { api } from "../api/httpClient";
import { normalizeEnvelope, normalizeProfile, normalizeApplicantTestScore } from "../mappers/responseMappers";
import type { Profile, ApplicantTestScore, ApplicantTestScoreType } from "../../types/domain";

export const APPLICANT_PHOTO_UPDATED_EVENT = "kallisto:applicant-photo-updated";

export async function fetchApplicantProfile(): Promise<Profile> {
  const result = await api.get<unknown>(apiRoutes.applicant.profile.base());
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load profile");
  }
  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to load profile");
  }
  return normalizeProfile(envelope.data);
}

export async function updateApplicantProfile(payload: {
  firstName?: string;
  lastName?: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const result = await api.put<{ msg: string }>(apiRoutes.applicant.profile.base(), {
    first_name: payload.firstName,
    last_name: payload.lastName,
    data: payload.data,
  });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to update profile");
  }
}

export async function updateApplicantPassword(payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ reauthRequired: boolean; reason?: string }> {
  const result = await api.put<{ msg: string; reauth_required?: boolean; reason?: string }>(
    apiRoutes.applicant.profile.password(),
    {
      current_password: payload.currentPassword,
      new_password: payload.newPassword,
    },
  );

  if (!result.ok) {
    throw new Error(result.error ?? "Failed to update password");
  }

  return {
    reauthRequired: result.data?.reauth_required === true,
    reason: typeof result.data?.reason === "string" ? result.data.reason : undefined,
  };
}

export async function uploadApplicantPhoto(photo: File): Promise<void> {
  const formData = new FormData();
  formData.append("photo", photo);

  const response = await api.raw(apiRoutes.applicant.profile.photo(), {
    method: "PUT",
    body: formData,
  });

  if (!response.ok) {
    throw new Error((await extractApiError(response)) ?? "Failed to upload profile photo");
  }
}

export async function fetchApplicantPhotoUrl(): Promise<string | null> {
  const response = await api.raw(apiRoutes.applicant.profile.photo(), {
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

export async function fetchApplicantTestScores(): Promise<ApplicantTestScore[]> {
  const result = await api.get<unknown>(apiRoutes.applicant.profile.testScores());
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
  return envelope.data.map(normalizeApplicantTestScore);
}

interface UpsertTestScorePayload {
  testType: ApplicantTestScoreType;
  otherTestName?: string | null;
  score: number;
  outOf: number;
  takenOn?: string | null;
}

export async function createApplicantTestScore(payload: UpsertTestScorePayload): Promise<ApplicantTestScore> {
  const result = await api.post<unknown>(apiRoutes.applicant.profile.testScores(), {
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

  return normalizeApplicantTestScore(envelope.data);
}

export async function updateApplicantTestScore(id: string, payload: UpsertTestScorePayload): Promise<ApplicantTestScore> {
  const result = await api.put<unknown>(apiRoutes.applicant.profile.testScore(id), {
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

  return normalizeApplicantTestScore(envelope.data);
}

export async function deleteApplicantTestScore(id: string): Promise<void> {
  const result = await api.delete<{ msg: string }>(apiRoutes.applicant.profile.testScore(id));
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
