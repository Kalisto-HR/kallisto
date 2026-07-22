import type { TFunction } from "i18next";
import type { ApplicationStatus } from "../types/domain";

export const applicationStatuses: ApplicationStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "additional_information_required",
  "decision_pending",
  "accepted",
  "waitlisted",
  "rejected",
];

export function getApplicationStatusLabel(t: TFunction, status: string): string {
  return t(`common:applicationStatuses.${status}`, { defaultValue: fallbackStatusLabel(status) });
}

export function getApplicationStageLabel(t: TFunction, stage: string): string {
  return t(`common:applicationProgressStages.${stage}`, { defaultValue: fallbackStageLabel(stage) });
}

export function getApplicationStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "accepted") return "default";
  if (status === "rejected") return "destructive";
  if (status === "waitlisted" || status === "additional_information_required") return "outline";
  return "secondary";
}

function fallbackStatusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "submitted":
      return "Submitted";
    case "under_review":
      return "Under review";
    case "additional_information_required":
      return "Additional information required";
    case "decision_pending":
      return "Decision pending";
    case "accepted":
      return "Accepted";
    case "waitlisted":
      return "Waitlisted";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

function fallbackStageLabel(stage: string): string {
  switch (stage) {
    case "application_preparation":
      return "Application preparation";
    case "application_received":
      return "Application received";
    case "review_in_progress":
      return "Review in progress";
    case "decision_pending":
      return "Decision pending";
    case "final_decision":
      return "Final decision";
    default:
      return "Unknown";
  }
}
