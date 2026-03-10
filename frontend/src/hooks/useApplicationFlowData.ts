import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createStudentApplication, submitStudentApplication, updateStudentApplication } from "../services/client/applicationsService";

export type FlowStep = "draft" | "review" | "success";

interface SaveDraftOptions {
  advanceStep?: boolean;
  silent?: boolean;
}

export function useApplicationFlowData(universityId: string) {
  const [cycle, setCycle] = useState("2026-Fall");
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [step, setStep] = useState<FlowStep>("draft");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const knownDraftCyclesRef = useRef<Set<string>>(new Set());
  const cycleRef = useRef(cycle);

  const canReview = useMemo(() => Object.keys(formData).length > 0, [formData]);

  useEffect(() => {
    cycleRef.current = cycle;
  }, [cycle]);

  const markDraftLoaded = useCallback((loadedCycle?: string) => {
    const key = (loadedCycle ?? cycleRef.current).trim();
    if (!key) {
      return;
    }
    knownDraftCyclesRef.current.add(key);
  }, []);

  const saveDraft = useCallback(async (options: SaveDraftOptions = {}): Promise<boolean> => {
    const { advanceStep = true, silent = false } = options;
    const cycleKey = cycle.trim();

    setLoading(true);
    if (!silent) {
      setError(null);
    }
    try {
      if (!knownDraftCyclesRef.current.has(cycleKey)) {
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
        knownDraftCyclesRef.current.add(cycleKey);
      }

      await updateStudentApplication(universityId, cycle, formData);
      knownDraftCyclesRef.current.add(cycleKey);
      if (advanceStep) {
        setStep("review");
      }
      return true;
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : "Failed to save draft");
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [cycle, formData, universityId]);

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
    markDraftLoaded,
    step,
    setStep,
    loading,
    error,
    canReview,
    saveDraft,
    submit,
  };
}
