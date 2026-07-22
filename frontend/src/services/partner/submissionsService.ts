import { apiRoutes, buildApiProxyUrl } from "../api/routes";
import { api } from "../api/httpClient";
import { normalizeSubmittedApplication, normalizePagination } from "../mappers/responseMappers";
import type { ApplicationStatus, SubmittedApplication, Pagination } from "../../types/domain";

export interface PartnerApplicationsQuery {
  universityId?: string;
  search?: string;
  program?: string;
  citizenship?: string;
  intake?: string;
  status?: Exclude<ApplicationStatus, "draft">;
  sortBy?: "received_at" | "submitted_at" | "gpa" | "status";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ApplicationStatusTaskInput {
  title: string;
  description?: string | null;
  required: boolean;
  due_at?: string | null;
}

export interface ApplicationStatusTransitionInput {
  status: Exclude<ApplicationStatus, "draft">;
  public_comment?: string | null;
  internal_note?: string | null;
  internal_explanation?: string | null;
  confirm_final_correction?: boolean;
  tasks?: ApplicationStatusTaskInput[];
}

export async function fetchPartnerApplications(query: PartnerApplicationsQuery = {}): Promise<Pagination<SubmittedApplication>> {
  const result = await api.get<unknown>(apiRoutes.partner.submissions.list({
    search: query.search,
    program: query.program,
    citizenship: query.citizenship,
    intake: query.intake,
    status: query.status,
    sort_by: query.sortBy,
    sort_order: query.sortOrder,
    page: query.page ?? 1,
    limit: query.limit ?? 20,
  }));
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load submissions");
  }

  const pageData = normalizePagination<unknown>(result.data);
  return {
    ...pageData,
    items: pageData.items.map(normalizeSubmittedApplication),
  };
}

export async function updatePartnerApplicationStatus(id: string, input: ApplicationStatusTransitionInput): Promise<SubmittedApplication> {
  const result = await api.patch<unknown>(apiRoutes.partner.submissions.status(id), input);
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to update application status");
  }
  return normalizeSubmittedApplication(result.data);
}

export async function fetchPartnerApplication(id: string): Promise<SubmittedApplication> {
  const result = await api.get<unknown>(apiRoutes.partner.submissions.detail(id));
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load submission");
  }
  return normalizeSubmittedApplication(result.data);
}

export function buildPartnerApplicationFileDownloadUrl(applicationId: string, fileId: string): string {
  return buildApiProxyUrl(apiRoutes.partner.submissions.fileDownload(applicationId, fileId));
}
