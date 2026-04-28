export function AnalysisStepList({ steps, activeStep }) {
  return (
    <ul className="analysis-steps">
      {steps.map((step, index) => {
        const isDone = index < activeStep;
        const isActive = index === activeStep;

        return (
          <li
            key={step.id}
            className={`analysis-step ${isDone ? "done" : ""} ${isActive ? "active" : ""}`.trim()}
          >
            <span className="analysis-step-icon">{isDone ? "✓" : index + 1}</span>
            <span className="analysis-step-label">{step.label}</span>
            {isActive && <span className="analysis-step-dots" aria-hidden="true" />}
          </li>
        );
      })}
    </ul>
  );
}
