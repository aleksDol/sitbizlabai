import { useMemo } from "react";
import { AnalysisStepList } from "./AnalysisStepList";

export function AnalysisProgress({ steps, activeStep, progress }) {
  const safeProgress = useMemo(() => Math.max(0, Math.min(100, progress)), [progress]);

  return (
    <section className="analysis-progress fade-in delay-2" aria-live="polite">
      <h2>Собираем разбор под ваш бизнес</h2>
      <p>Смотрим, где теряются заявки, и что даст быстрый эффект по клиентам</p>

      <div className="analysis-progressbar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safeProgress}>
        <div className="analysis-progressbar-fill" style={{ width: `${safeProgress}%` }} />
      </div>

      <AnalysisStepList steps={steps} activeStep={activeStep} />
    </section>
  );
}
