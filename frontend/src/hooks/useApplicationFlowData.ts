import { useMemo, useState } from "react";
import { createStudentApplication, submitStudentApplication, updateStudentApplication } from "../services/client/applicationsService";

export type FlowStep = "draft" | "review" | "success";

export function useApplicationFlowData(universityId: string) {
  const [cycle, setCycle] = useState("2026-Fall");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [step, setStep] = useState<FlowStep>("draft");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canReview = useMemo(() => Object.keys(formData).length > 0, [formData]);

  const saveDraft = async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      try {
        await createStudentApplication({ universityId, cycle, data: formData });
      } catch (err) {
        const message = err instanceof Error ? err.message.toLowerCase() : "";
        const isExistingDraft =
          message.includes("already exists") ||
          message.includes("409") ||
          message.includes("conflict");
        if (!isExistingDraft) {
          throw err;
        }
      }

      await updateStudentApplication(universityId, cycle, formData);
      setStep("review");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await submitStudentApplication(universityId, cycle);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit application");
    } finally {
      setLoading(false);
    }
  };

  return {
    cycle,
    setCycle,
    formData,
    setFormData,
    step,
    setStep,
    loading,
    error,
    canReview,
    saveDraft,
    submit,
  };
}
