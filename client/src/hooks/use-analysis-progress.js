import { useEffect, useMemo, useRef, useState } from "react";

const STEP_DURATION_MS = 900;

export function useAnalysisProgress(steps, isLoading) {
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);

  const totalSteps = steps.length;

  const clear = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (!isLoading) {
      clear();
      return;
    }

    setActiveStep(0);
    setProgress(totalSteps > 0 ? Math.round((1 / totalSteps) * 22) : 8);

    timerRef.current = setInterval(() => {
      setActiveStep((prev) => {
        const next = Math.min(prev + 1, Math.max(0, totalSteps - 1));
        return next;
      });
    }, STEP_DURATION_MS);

    return clear;
  }, [isLoading, totalSteps]);

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const normalized = totalSteps > 0 ? (activeStep + 1) / totalSteps : 0;
    const nextProgress = Math.min(92, Math.max(12, Math.round(normalized * 92)));
    setProgress(nextProgress);
  }, [activeStep, isLoading, totalSteps]);

  const completeProgress = useMemo(() => () => {
    clear();
    setActiveStep(Math.max(0, totalSteps - 1));
    setProgress(100);
  }, [totalSteps]);

  const stopProgress = useMemo(() => () => {
    clear();
    setProgress(0);
    setActiveStep(0);
  }, []);

  return {
    activeStep,
    progress,
    completeProgress,
    stopProgress
  };
}
