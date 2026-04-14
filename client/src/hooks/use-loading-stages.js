import { useCallback, useEffect, useRef, useState } from "react";
import { STAGE_INTERVAL_MS } from "../constants/analyze-ui.constants";

export function useLoadingStages(totalStages) {
  const [loadingStep, setLoadingStep] = useState(0);
  const intervalRef = useRef(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stop();
    setLoadingStep(0);
    let currentStep = 0;

    intervalRef.current = setInterval(() => {
      currentStep = Math.min(currentStep + 1, totalStages - 1);
      setLoadingStep(currentStep);
    }, STAGE_INTERVAL_MS);
  }, [stop, totalStages]);

  const complete = useCallback(() => {
    setLoadingStep(Math.max(0, totalStages - 1));
  }, [totalStages]);

  useEffect(() => stop, [stop]);

  return { loadingStep, start, stop, complete };
}
