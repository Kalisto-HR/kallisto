import { apiRoutes } from "../api/routes";
import { api } from "../api/httpClient";
import {
  normalizeApplicationTestScoreImportResult,
  normalizeEnvelope,
  normalizeApplicantApplication,
  normalizeApplicantApplicationListItem,
} from "../mappers/responseMappers";
import type { ApplicationTestScoreImportResult, ApplicantApplication, ApplicantApplicationListItem } from "../../types/domain";

export interface ApplicationUploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  storage: string;
  downloadUrl: string;
}

export async function fetchApplicantApplications(): Promise<ApplicantApplicationListItem[]> {
  const result = await api.get<unknown>(apiRoutes.applicant.applications.list());
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
  return envelope.data.map(normalizeApplicantApplicationListItem);
}

export async function fetchApplicantApplication(universityId: string, cycle: string): Promise<ApplicantApplication> {
  const result = await api.get<unknown>(apiRoutes.applicant.applications.detail(universityId, cycle));
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load application");
  }
  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to load application");
  }
  return normalizeApplicantApplication(envelope.data);
}

export async function createApplicantApplication(payload: {
  universityId: string;
  cycle: string;
  data: Record<string, unknown>;
}): Promise<void> {
  const result = await api.post<{ msg: string }>(apiRoutes.applicant.applications.list(), {
    university_id: payload.universityId,
    application_cycle: payload.cycle,
    data: payload.data,
  });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to create application");
  }
}

export async function updateApplicantApplication(
  universityId: string,
  cycle: string,
  data: Record<string, unknown>,
): Promise<void> {
  const result = await api.put<{ msg: string }>(apiRoutes.applicant.applications.detail(universityId, cycle), { data });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to update application");
  }
}

export async function submitApplicantApplication(universityId: string, cycle: string): Promise<void> {
  const result = await api.post<{ msg: string }>(apiRoutes.applicant.applications.submit(universityId, cycle));
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to submit application");
  }
}

export async function deleteApplicantApplicationDraft(universityId: string, cycle: string): Promise<void> {
  const result = await api.delete<{ msg: string }>(apiRoutes.applicant.applications.detail(universityId, cycle));
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to delete draft application");
  }
}

export async function importApplicantProfileTestScoresToApplication(
  universityId: string,
  cycle: string,
  testScoreIds?: string[],
): Promise<ApplicationTestScoreImportResult> {
  const result = await api.post<unknown>(apiRoutes.applicant.applications.importTestScores(universityId, cycle), {
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

export async function respondToApplicantApplicationTask(
  universityId: string,
  cycle: string,
  taskId: string,
  response: string,
): Promise<void> {
  const result = await api.post<{ msg: string }>(
    apiRoutes.applicant.applications.respondTask(universityId, cycle, taskId),
    { response },
  );
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to submit task response");
  }
}

export async function uploadApplicantApplicationFiles(
  universityId: string,
  cycle: string,
  files: File[],
  fieldKey?: string,
): Promise<ApplicationUploadedFile[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  const response = await api.raw(
    apiRoutes.applicant.applications.uploadFiles({
      university_id: universityId,
      cycle,
      field_key: fieldKey,
    }),
    {
      method: "POST",
      body: formData,
    },
  );
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
