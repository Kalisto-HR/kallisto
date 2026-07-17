import { apiRoutes } from "../api/routes";
import { api } from "../api/httpClient";
import type {
  ApplicationStructureVersion,
  PartnerDashboardPayload,
} from "../../types/domain";

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toBool(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function normalizeDashboard(value: unknown): PartnerDashboardPayload {
  const source = (value ?? {}) as Record<string, unknown>;
  const recentsRaw: unknown[] = Array.isArray(source.recent_applications ?? source.recentApplications)
    ? ((source.recent_applications ?? source.recentApplications) as unknown[])
    : [];
  const notificationsRaw: unknown[] = Array.isArray(source.notifications) ? (source.notifications as unknown[]) : [];
  const originRaw: unknown[] = Array.isArray(source.student_origin_stats ?? source.studentOriginStats)
    ? ((source.student_origin_stats ?? source.studentOriginStats) as unknown[])
    : [];
  const totalApplicants = toNumber(source.total_applicants ?? source.totalApplicants);
  const maleCount = toNumber(source.male_count ?? source.maleCount);
  const femaleCount = toNumber(source.female_count ?? source.femaleCount);
  const nonBinaryCount = toNumber(source.non_binary_count ?? source.nonBinaryCount);
  const preferNotToSayRaw = source.prefer_not_to_say_count ?? source.preferNotToSayCount;
  const preferNotToSayCount = typeof preferNotToSayRaw === "undefined"
    ? Math.max(totalApplicants - maleCount - femaleCount - nonBinaryCount, 0)
    : toNumber(preferNotToSayRaw);

  return {
    newApplications: toNumber(source.new_applications ?? source.newApplications),
    totalApplicants,
    avgSAT: toNumber(source.avg_sat ?? source.avgSAT),
    avgIELTS: toNumber(source.avg_ielts ?? source.avgIELTS),
    maleCount,
    femaleCount,
    nonBinaryCount,
    preferNotToSayCount,
    suspectsCount: toNumber(source.suspects_count ?? source.suspectsCount),
    prospectsCount: toNumber(source.prospects_count ?? source.prospectsCount),
    studentOriginStats: originRaw.map((value) => {
      const item = (value ?? {}) as Record<string, unknown>;
      return {
        regionCode: toNullableString(item.region_code ?? item.regionCode) ?? toNullableString(item.country),
        count: toNumber(item.count),
        percentage: toNumber(item.percentage),
      };
    }),
    recentApplications: recentsRaw.map((value) => {
      const item = (value ?? {}) as Record<string, unknown>;
      return {
        id: toString(item.id),
        name: toString(item.name),
        program: toString(item.program),
        citizenship: toString(item.citizenship),
        status: toString(item.status) as PartnerDashboardPayload["recentApplications"][number]["status"],
        submittedAt: toNullableString(item.submitted_at ?? item.submittedAt),
      };
    }),
    notifications: notificationsRaw.map((value) => {
      const item = (value ?? {}) as Record<string, unknown>;
      return {
        id: toString(item.id),
        type: toString(item.type),
        message: toString(item.message),
        time: toString(item.time),
        read: toBool(item.read),
      };
    }),
  };
}

export async function fetchPartnerDashboard(_universityId: string): Promise<PartnerDashboardPayload> {
  void _universityId;
  const result = await api.get<unknown>(apiRoutes.partner.dashboard());
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load dashboard");
  }
  return normalizeDashboard(result.data);
}

export async function fetchPartnerApplicationStructureHistory(
  _universityId: string,
  limit = 20,
): Promise<ApplicationStructureVersion[]> {
  void _universityId;
  const result = await api.get<{ items?: unknown[] }>(
    apiRoutes.partner.university.applicationStructureHistory(limit),
  );
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to load structure history");
  }
  const items = Array.isArray(result.data.items) ? result.data.items : [];
  return items.map((value) => {
    const item = (value ?? {}) as Record<string, unknown>;
    return {
      id: toString(item.id),
      universityId: toString(item.university_id ?? item.universityId),
      versionNo: toNumber(item.version_no ?? item.versionNo),
      schema: toRecord(item.schema),
      published: toBool(item.published),
      changedBy: toNullableString(item.changed_by ?? item.changedBy),
      changeNote: toNullableString(item.change_note ?? item.changeNote),
      createdAt: toString(item.created_at ?? item.createdAt),
    };
  });
}

export async function publishPartnerApplicationStructure(_universityId: string, changeNote?: string): Promise<void> {
  void _universityId;
  const result = await api.post<{ id: string }>(apiRoutes.partner.university.publishApplicationStructure(), {
    change_note: changeNote,
  });
  if (!result.ok) {
    throw new Error(result.error ?? "Failed to publish application structure");
  }
}
