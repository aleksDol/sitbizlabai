import { useMemo, useState } from "react";
import { reachMetrikaGoal } from "../../utils/metrika";

const CLIENT_SOURCES = [
  "Реклама",
  "SEO",
  "Telegram / соцсети",
  "Рекомендации",
  "Холодные продажи",
  "Несколько источников"
];

const MAIN_GOALS = [
  "Получать больше заявок",
  "Не терять текущих клиентов",
  "Повысить окупаемость рекламы",
  "Навести порядок в обработке заявок",
  "Увеличить повторные продажи"
];

function parseWebsite(rawValue) {
  const value = rawValue.trim();
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (["http:", "https:"].includes(parsed.protocol)) {
      return parsed.href;
    }
  } catch {
    // Try plain domain below.
  }

  const looksLikeDomain = !/\s/.test(value) && value.includes(".");
  if (looksLikeDomain) {
    try {
      const parsed = new URL(`https://${value}`);
      return parsed.href;
    } catch {
      return null;
    }
  }

  return null;
}

export function AnalyzerQuiz({ onComplete }) {
  const [step, setStep] = useState(1);
  const [websiteInput, setWebsiteInput] = useState("");
  const [clientSource, setClientSource] = useState("");
  const [mainGoal, setMainGoal] = useState("");
  const [contact, setContact] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canProceed = useMemo(() => {
    if (step === 1) return Boolean(parseWebsite(websiteInput));
    if (step === 2) return Boolean(clientSource);
    if (step === 3) return Boolean(mainGoal);
    if (step === 4) return contact.trim().length > 3 && !isSubmitting;
    return false;
  }, [step, websiteInput, clientSource, mainGoal, contact, isSubmitting]);

  function onNext() {
    if (!canProceed) return;
    setStep((prev) => Math.min(prev + 1, 4));
  }

  function onBack() {
    setStep((prev) => Math.max(prev - 1, 1));
  }

  async function onFinish() {
    if (!canProceed || isSubmitting) return;

    const parsedWebsite = parseWebsite(websiteInput);
    if (!parsedWebsite) return;

    try {
      window.dispatchEvent(
        new CustomEvent("sitebizai_quiz_go_to_analysis_click", {
          detail: {
            hasWebsite: true,
            clientSource,
            mainGoal
          }
        })
      );
    } catch {
      // Tracking should never block the quiz flow.
    }
    reachMetrikaGoal("quiz_go_to_analysis_click");

    setIsSubmitting(true);
    try {
      await onComplete({
        niche: null,
        hasWebsite: true,
        websiteUrl: parsedWebsite,
        acquisitionChannels: [clientSource],
        hasRepeatSales: "unknown",
        clientSource,
        mainGoal,
        contact: contact.trim()
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="quiz-card fade-in delay-1">
      <div className="quiz-progress">Шаг {step} из 4</div>

      <div key={step} className="quiz-step fade-slide-in">
        {step === 1 && (
          <>
            <h2>Укажите сайт компании</h2>
            <input
              type="text"
              value={websiteInput}
              onChange={(event) => setWebsiteInput(event.target.value)}
              placeholder="https://site.ru"
            />
            <p className="quiz-input-hint">Проанализируем, где могут теряться заявки и рекламный трафик</p>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Откуда сейчас приходят клиенты?</h2>
            <div className="quiz-options-grid">
              {CLIENT_SOURCES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`quiz-option ${clientSource === option ? "selected" : ""}`}
                  onClick={() => setClientSource(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Что сейчас важнее всего?</h2>
            <div className="quiz-options-grid">
              {MAIN_GOALS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`quiz-option ${mainGoal === option ? "selected" : ""}`}
                  onClick={() => setMainGoal(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2>Укажите контакт для обратной связи</h2>
            <input
              type="text"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              placeholder="@telegram или номер телефона"
            />
            <p className="quiz-input-hint">Анализ откроется сразу. Контакт нужен для сохранения разбора.</p>
          </>
        )}
      </div>

      <div className="quiz-actions">
        <div>
          {step > 1 && (
            <button type="button" className="quiz-ghost-btn" onClick={onBack}>
              Назад
            </button>
          )}
        </div>

        {step < 4 ? (
          <button type="button" className="quiz-primary-btn" disabled={!canProceed} onClick={onNext}>
            Далее
          </button>
        ) : (
          <button type="button" className="quiz-primary-btn" disabled={!canProceed} onClick={onFinish}>
            {isSubmitting ? "Отправляем..." : "Показать результат"}
          </button>
        )}
      </div>
    </section>
  );
}
