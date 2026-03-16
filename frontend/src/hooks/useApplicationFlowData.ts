import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createStudentApplication, submitStudentApplication, updateStudentApplication } from "../services/client/applicationsService";

export type FlowStep = "draft" | "review" | "success";

interface SaveDraftOptions {
  advanceStep?: boolean;
  silent?: boolean;
}

function normalizeApplicationFlowError(error: unknown, cycle: string): string {
  const fallback = error instanceof Error ? error.message : "Failed to save application";
  const message = fallback.toLowerCase();
  const cycleLabel = cycle.trim() || "this cycle";

  if (message.includes("already exists for this cycle")) {
    return `You've already applied to this university for ${cycleLabel}.`;
  }
  if (message.includes("application already submitted")) {
    return "This application has already been submitted.";
  }
  return fallback;
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
        setError(normalizeApplicationFlowError(err, cycle));
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
      setError(normalizeApplicationFlowError(err, cycle));
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
