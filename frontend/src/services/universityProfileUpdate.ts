export interface UniversityProfileUpdatePayload {
  name?: string;
  description?: string | null;
  city?: string | null;
  country?: string | null;
  tuitionFee?: number | null;
  applicationFee?: number | null;
  applicationDeadline?: string | null;
  ieltsMin?: number | null;
  toeflMin?: number | null;
  scholarshipAvailable?: boolean | null;
  acceptanceRate?: number | null;
  universityProfile?: Record<string, unknown> | null;
}

export function buildUniversityProfileUpdateBody(payload: UniversityProfileUpdatePayload) {
  return {
    ...(payload.name !== undefined ? { name: payload.name } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.city !== undefined ? { city: payload.city } : {}),
    ...(payload.country !== undefined ? { country: payload.country } : {}),
    ...(payload.tuitionFee !== undefined ? { tuition_fee: payload.tuitionFee } : {}),
    ...(payload.applicationFee !== undefined ? { application_fee: payload.applicationFee } : {}),
    ...(payload.applicationDeadline !== undefined ? { application_deadline: payload.applicationDeadline } : {}),
    ...(payload.ieltsMin !== undefined ? { ielts_min: payload.ieltsMin } : {}),
    ...(payload.toeflMin !== undefined ? { toefl_min: payload.toeflMin } : {}),
    ...(payload.scholarshipAvailable !== undefined ? { scholarship_available: payload.scholarshipAvailable } : {}),
    ...(payload.acceptanceRate !== undefined ? { acceptance_rate: payload.acceptanceRate } : {}),
    ...(payload.universityProfile !== undefined ? { university_profile: payload.universityProfile } : {}),
  };
}
