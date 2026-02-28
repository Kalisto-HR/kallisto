import { clientApi } from "../api/httpClient";
import {
  normalizeApplicationTestScoreImportResult,
  normalizeEnvelope,
  normalizeStudentApplication,
  normalizeStudentApplicationListItem,
} from "../mappers/responseMappers";
import type { ApplicationTestScoreImportResult, StudentApplication, StudentApplicationListItem } from "../../types/domain";

export async function fetchStudentApplications(): Promise<StudentApplicationListItem[]> {
  const result = await clientApi.get<unknown>("/v1.0/applications");
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load applications");
  }
  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to load applications");
  }
  if (!Array.isArray(envelope.data)) {
    return [];
  }
  return envelope.data.map(normalizeStudentApplicationListItem);
}

export async function fetchStudentApplication(universityId: string, cycle: string): Promise<StudentApplication> {
  const result = await clientApi.get<unknown>(`/v1.0/applications/${universityId}/${cycle}`);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load application");
  }
  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to load application");
  }
  return normalizeStudentApplication(envelope.data);
}

export async function createStudentApplication(payload: {
  universityId: string;
  cycle: string;
  data: Record<string, unknown>;
}): Promise<void> {
  const result = await clientApi.post<{ msg: string }>("/v1.0/applications", {
    university_id: payload.universityId,
    application_cycle: payload.cycle,
    data: payload.data,
  });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to create application");
  }
}

export async function updateStudentApplication(
  universityId: string,
  cycle: string,
  data: Record<string, unknown>,
): Promise<void> {
  const result = await clientApi.put<{ msg: string }>(`/v1.0/applications/${universityId}/${cycle}`, { data });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to update application");
  }
}

export async function submitStudentApplication(universityId: string, cycle: string): Promise<void> {
  const result = await clientApi.post<{ msg: string }>(`/v1.0/applications/${universityId}/${cycle}/submit`);
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to submit application");
  }
}

export async function importStudentProfileTestScoresToApplication(
  universityId: string,
  cycle: string,
  testScoreIds?: string[],
): Promise<ApplicationTestScoreImportResult> {
  const result = await clientApi.post<unknown>(`/v1.0/applications/${universityId}/${cycle}/import-test-scores`, {
    test_score_ids: testScoreIds,
  });
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to import test scores");
  }

  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to import test scores");
  }

  return normalizeApplicationTestScoreImportResult(envelope.data);
}
