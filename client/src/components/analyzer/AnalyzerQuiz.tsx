import { useMemo, useState } from "react";
import { reachMetrikaGoal } from "../../utils/metrika";

const MAIN_PAIN_OPTIONS = [
  "Мало заявок",
  "Дорогая реклама",
  "Теряются клиенты",
  "Долго отвечаем клиентам",
  "Все приходится делать вручную",
  "Нет стабильного потока клиентов"
];

const COMMUNICATION_METHOD_OPTIONS = [
  "Через Telegram",
  "Через сайт",
  "Через WhatsApp",
  "Через менеджеров",
  "Через CRM",
  "В основном вручную"
];

export function AnalyzerQuiz({ onComplete }) {
  const [step, setStep] = useState(1);
  const [businessDescription, setBusinessDescription] = useState("");
  const [mainPain, setMainPain] = useState("");
  const [communicationMethod, setCommunicationMethod] = useState("");
  const [contact, setContact] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canProceed = useMemo(() => {
    if (step === 1) return businessDescription.trim().length >= 3;
    if (step === 2) return Boolean(mainPain);
    if (step === 3) return Boolean(communicationMethod);
    if (step === 4) return contact.trim().length > 3 && !isSubmitting;
    return false;
  }, [step, businessDescription, mainPain, communicationMethod, contact, isSubmitting]);

  function onNext() {
    if (!canProceed) return;
    setStep((prev) => Math.min(prev + 1, 4));
  }

  function onBack() {
    setStep((prev) => Math.max(prev - 1, 1));
  }

  async function onFinish() {
    if (!canProceed || isSubmitting) return;

    try {
      window.dispatchEvent(
        new CustomEvent("sitebizai_quiz_go_to_analysis_click", {
          detail: {
            hasWebsite: false,
            mainPain,
            communicationMethod
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
        niche: businessDescription.trim(),
        hasWebsite: false,
        websiteUrl: null,
        acquisitionChannels: [communicationMethod],
        hasRepeatSales: "unknown",
        clientSource: communicationMethod,
        mainGoal: mainPain,
        businessDescription: businessDescription.trim(),
        mainPain,
        communicationMethod,
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
            <h2>Чем занимаетесь?</h2>
            <p className="quiz-input-hint">Коротко: чем занимаетесь и кто ваш клиент</p>
            <input
              type="text"
              value={businessDescription}
              onChange={(event) => setBusinessDescription(event.target.value)}
              placeholder="Например: студия кухни, продажа одежды в Telegram, юридические услуги"
            />
          </>
        )}

        {step === 2 && (
          <>
            <h2>Что сейчас беспокоит больше всего?</h2>
            <div className="quiz-options-grid">
              {MAIN_PAIN_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`quiz-option ${mainPain === option ? "selected" : ""}`}
                  onClick={() => setMainPain(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Как сейчас общаетесь с клиентами?</h2>
            <div className="quiz-options-grid">
              {COMMUNICATION_METHOD_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`quiz-option ${communicationMethod === option ? "selected" : ""}`}
                  onClick={() => setCommunicationMethod(option)}
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
            <p className="quiz-input-hint">Результат откроется сразу. Контакт нужен, чтобы сохранить разбор.</p>
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
            {isSubmitting ? "Запускаем разбор..." : "Показать результат"}
          </button>
        )}
      </div>
    </section>
  );
}
