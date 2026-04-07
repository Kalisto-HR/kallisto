export interface UniversityProfileUpdatePayload {
  name?: string;
  description?: string | null;
  city?: string | null;
  country?: string | null;
  ieltsMin?: number | null;
  toeflMin?: number | null;
  acceptanceRate?: number | null;
  ranking?: number | null;
  universityProfile?: Record<string, unknown> | null;
}

export function buildUniversityProfileUpdateBody(payload: UniversityProfileUpdatePayload) {
  return {
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.city !== undefined ? { city: payload.city } : {}),
    ...(payload.country !== undefined ? { country: payload.country } : {}),
    ...(payload.ieltsMin !== undefined ? { ielts_min: payload.ieltsMin } : {}),
    ...(payload.toeflMin !== undefined ? { toefl_min: payload.toeflMin } : {}),
    ...(payload.acceptanceRate !== undefined ? { acceptance_rate: payload.acceptanceRate } : {}),
    ...(payload.ranking !== undefined ? { ranking: payload.ranking } : {}),
    ...(payload.universityProfile !== undefined ? { university_profile: payload.universityProfile } : {}),
  };
}
