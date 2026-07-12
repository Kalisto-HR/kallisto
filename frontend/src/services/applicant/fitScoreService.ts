import { apiRoutes } from "../api/routes";
import { api } from "../api/httpClient";
import { normalizeEnvelope } from "../mappers/responseMappers";
import type { FitScoreProgram, FitScoreResult, FitScoreStudentProfile } from "../../types/domain";

export async function calculateFitScore(
  studentProfile: FitScoreStudentProfile,
  program: FitScoreProgram,
): Promise<FitScoreResult> {
  const result = await api.post<unknown>(apiRoutes.applicant.fitScore.calculate(), {
    studentProfile,
    program,
  });
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? "Failed to calculate fit score");
  }

  const envelope = normalizeEnvelope<unknown>(result.data);
  if (!envelope.success) {
    throw new Error(envelope.message || "Failed to calculate fit score");
  }

  return normalizeFitScoreResult(envelope.data);
}

function normalizeFitScoreResult(value: unknown): FitScoreResult {
  const source = toRecord(value) ?? {};
  const breakdown = toRecord(source.breakdown) ?? {};
  return {
    finalScore: clampScore(toNumber(source.finalScore ?? source.final_score)),
    label: toString(source.label) || "Moderate Fit",
    breakdown: {
      academicScore: clampScore(toNumber(breakdown.academicScore ?? breakdown.academic_score)),
      languageScore: clampScore(toNumber(breakdown.languageScore ?? breakdown.language_score)),
      majorScore: clampScore(toNumber(breakdown.majorScore ?? breakdown.major_score)),
      budgetScore: clampScore(toNumber(breakdown.budgetScore ?? breakdown.budget_score)),
      documentScore: clampScore(toNumber(breakdown.documentScore ?? breakdown.document_score)),
      deadlineScore: clampScore(toNumber(breakdown.deadlineScore ?? breakdown.deadline_score)),
    },
    reasons: toStringArray(source.reasons),
    recommendations: toStringArray(source.recommendations),
    explanation: toOptionalString(source.explanation),
  };
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
