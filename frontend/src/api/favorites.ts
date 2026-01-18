// favorites.ts - API functions for favorites endpoints.
import { api } from './client';
import type { ApiResponse } from './types';

export async function getFavorites(): Promise<ApiResponse<string[]>> {
  const res = await api<ApiResponse<string[]>>('/v1.0/favorites');
  return res.data;
}

export async function addFavorite(universityId: string): Promise<ApiResponse<null>> {
  const res = await api<ApiResponse<null>>(`/v1.0/universities/${universityId}/favorite`, { method: 'POST' });
  return res.data;
}

export async function removeFavorite(universityId: string): Promise<ApiResponse<null>> {
  const res = await api<ApiResponse<null>>(`/v1.0/universities/${universityId}/favorite`, { method: 'DELETE' });
  return res.data;
}

export async function isFavorite(universityId: string): Promise<ApiResponse<{ is_favorite: boolean }>> {
  const res = await api<ApiResponse<{ is_favorite: boolean }>>(`/v1.0/universities/${universityId}/favorite`);
  return res.data;
}
