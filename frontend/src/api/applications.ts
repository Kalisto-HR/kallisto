// applications.ts - API functions for application endpoints.
import { api } from './client';
import type { ApiResponse, Application, ApplicationListItem, ApplicationCreateRequest, ApplicationUpdateRequest } from './types';

export async function getApplications(): Promise<ApiResponse<ApplicationListItem[]>> {
  const res = await api<ApiResponse<ApplicationListItem[]>>('/v1.0/applications');
  return res.data;
}

export async function getApplication(universityId: string, cycle: string): Promise<ApiResponse<Application>> {
  const res = await api<ApiResponse<Application>>(`/v1.0/applications/${universityId}/${cycle}`);
  return res.data;
}

export async function createApplication(req: ApplicationCreateRequest): Promise<{ status: number; data: ApiResponse<null> }> {
  const res = await api<ApiResponse<null>>('/v1.0/applications', {
    method: 'POST',
    body: JSON.stringify(req),
  });
  return { status: res.status, data: res.data };
}

export async function updateApplication(universityId: string, cycle: string, req: ApplicationUpdateRequest): Promise<ApiResponse<null>> {
  const res = await api<ApiResponse<null>>(`/v1.0/applications/${universityId}/${cycle}`, {
    method: 'PUT',
    body: JSON.stringify(req),
  });
  return res.data;
}

export async function submitApplication(universityId: string, cycle: string): Promise<ApiResponse<null>> {
  const res = await api<ApiResponse<null>>(`/v1.0/applications/${universityId}/${cycle}/submit`, { method: 'POST' });
  return res.data;
}

export async function deleteApplication(universityId: string, cycle: string): Promise<ApiResponse<null>> {
  const res = await api<ApiResponse<null>>(`/v1.0/applications/${universityId}/${cycle}`, { method: 'DELETE' });
  return res.data;
}
