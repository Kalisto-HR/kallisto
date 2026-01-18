// universities.ts - API functions for university endpoints.
import { api } from './client';
import type { ApiResponse, PaginatedResponse, University, UniversityListItem, UniversitySearchParams } from './types';

export async function getUniversities(page = 1, limit = 10): Promise<ApiResponse<PaginatedResponse<UniversityListItem>>> {
  const res = await api<ApiResponse<PaginatedResponse<UniversityListItem>>>(`/v1.0/universities?page=${page}&limit=${limit}`);
  return res.data;
}

export async function getUniversity(id: string): Promise<ApiResponse<University>> {
  const res = await api<ApiResponse<University>>(`/v1.0/universities/${id}`);
  return res.data;
}

export async function searchUniversities(params: UniversitySearchParams): Promise<ApiResponse<PaginatedResponse<UniversityListItem>>> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.province) searchParams.set('province', params.province);
  if (params.minRanking !== undefined) searchParams.set('min_ranking', String(params.minRanking));
  if (params.maxRanking !== undefined) searchParams.set('max_ranking', String(params.maxRanking));
  if (params.maxFee !== undefined) searchParams.set('max_fee', String(params.maxFee));
  if (params.page !== undefined) searchParams.set('page', String(params.page));
  if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
  const res = await api<ApiResponse<PaginatedResponse<UniversityListItem>>>(`/v1.0/universities/search?${searchParams.toString()}`);
  return res.data;
}
