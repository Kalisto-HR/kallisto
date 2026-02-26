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

  const saveDraft = async () => {
    setLoading(true);
    setError(null);
    try {
      await createStudentApplication({ universityId, cycle, data: formData });
      await updateStudentApplication(universityId, cycle, formData);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
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
