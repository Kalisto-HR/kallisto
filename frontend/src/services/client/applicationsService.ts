import { clientApi } from "../api/httpClient";
import {
  normalizeApplicationTestScoreImportResult,
  normalizeEnvelope,
  normalizeStudentApplication,
  normalizeStudentApplicationListItem,
} from "../mappers/responseMappers";
import type { ApplicationTestScoreImportResult, StudentApplication, StudentApplicationListItem } from "../../types/domain";

export interface ApplicationUploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  storage: string;
  downloadUrl: string;
}

export async function fetchStudentApplications(): Promise<StudentApplicationListItem[]> {
  const result = await clientApi.get<unknown>("/v1.0/applicant/applications");
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
  const result = await clientApi.get<unknown>(`/v1.0/applicant/applications/${universityId}/${cycle}`);
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
  const result = await clientApi.post<{ msg: string }>("/v1.0/applicant/applications", {
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
  const result = await clientApi.put<{ msg: string }>(`/v1.0/applicant/applications/${universityId}/${cycle}`, { data });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to update application");
  }
}

export async function submitStudentApplication(universityId: string, cycle: string): Promise<void> {
  const result = await clientApi.post<{ msg: string }>(`/v1.0/applicant/applications/${universityId}/${cycle}/submit`);
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to submit application");
  }
}

export async function importStudentProfileTestScoresToApplication(
  universityId: string,
  cycle: string,
  testScoreIds?: string[],
): Promise<ApplicationTestScoreImportResult> {
  const result = await clientApi.post<unknown>(`/v1.0/applicant/applications/${universityId}/${cycle}/import-test-scores`, {
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

export async function uploadStudentApplicationFiles(
  universityId: string,
  cycle: string,
  files: File[],
  fieldKey?: string,
): Promise<ApplicationUploadedFile[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const query = new URLSearchParams({
    university_id: universityId,
    cycle,
  });
  if (fieldKey) {
    query.set("field_key", fieldKey);
  }

  const response = await clientApi.raw(`/v1.0/applicant/application-files/upload?${query.toString()}`, {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json().catch(() => null)) as unknown;
  const envelope = normalizeEnvelope<unknown>(payload);
  if (!response.ok || !envelope.success) {
    throw new Error(envelope.message || "Failed to upload application files");
  }
  if (!Array.isArray(envelope.data)) {
    return [];
  }

  return envelope.data
    .map((value) => {
      const item = (value ?? {}) as Record<string, unknown>;
      return {
        id: typeof item.id === "string" ? item.id : "",
        name: typeof item.name === "string" ? item.name : "Uploaded file",
        type: typeof item.type === "string" ? item.type : "application/octet-stream",
        size: typeof item.size === "number" ? item.size : 0,
        storage: typeof item.storage === "string" ? item.storage : "application_file",
        downloadUrl:
          typeof item.download_url === "string"
            ? item.download_url
            : typeof item.downloadUrl === "string"
              ? item.downloadUrl
              : "",
      };
    })
    .filter((item) => item.id.length > 0);
}
