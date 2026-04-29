import { useMemo, useState } from "react";
import { reachMetrikaGoal } from "../../utils/metrika";

const ACQUISITION_CHANNELS = [
  "Telegram",
  "Instagram / соцсети",
  "Сайт",
  "Реклама",
  "Сарафанное радио",
  "Рассылки",
  "Другое"
];

const REPEAT_SALES_OPTIONS = ["Да", "Нет", "Не знаю"];

function parseBusinessOrSite(rawValue) {
  const value = rawValue.trim();
  if (!value) {
    return { hasWebsite: false, websiteUrl: null, niche: null };
  }

  try {
    const parsed = new URL(value);
    if (["http:", "https:"].includes(parsed.protocol)) {
      return { hasWebsite: true, websiteUrl: parsed.href, niche: null };
    }
  } catch {
    // Not a full URL, try plain domain below.
  }

  const looksLikeDomain = !/\s/.test(value) && value.includes(".");
  if (looksLikeDomain) {
    try {
      const parsed = new URL(`https://${value}`);
      return { hasWebsite: true, websiteUrl: parsed.href, niche: null };
    } catch {
      // Fall back to niche text.
    }
  }

  return { hasWebsite: false, websiteUrl: null, niche: value };
}

export function AnalyzerQuiz({ onComplete }) {
  const [step, setStep] = useState(1);
  const [businessOrSite, setBusinessOrSite] = useState("");
  const [channels, setChannels] = useState([]);
  const [repeatSales, setRepeatSales] = useState("");

  const canProceed = useMemo(() => {
    if (step === 1) return businessOrSite.trim().length > 1;
    if (step === 2) return channels.length > 0;
    if (step === 3) return Boolean(repeatSales);
    return false;
  }, [step, businessOrSite, channels, repeatSales]);

  function onToggleChannel(channel) {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((item) => item !== channel) : [...prev, channel]
    );
  }

  function onNext() {
    if (!canProceed) return;
    setStep((prev) => Math.min(prev + 1, 3));
  }

  function onBack() {
    setStep((prev) => Math.max(prev - 1, 1));
  }

  function onFinish() {
    if (!canProceed) return;

    const parsedInput = parseBusinessOrSite(businessOrSite);
    const repeatSalesMap = {
      Да: "yes",
      Нет: "no",
      "Не знаю": "unknown"
    };

    try {
      window.dispatchEvent(
        new CustomEvent("sitebizai_quiz_go_to_analysis_click", {
          detail: {
            hasWebsite: parsedInput.hasWebsite,
            channelsCount: channels.length,
            hasRepeatSales: repeatSalesMap[repeatSales] || "unknown"
          }
        })
      );
    } catch {
      // Tracking should never block the quiz flow.
    }
    reachMetrikaGoal("quiz_go_to_analysis_click");

    onComplete({
      niche: parsedInput.niche,
      hasWebsite: parsedInput.hasWebsite,
      websiteUrl: parsedInput.websiteUrl,
      acquisitionChannels: channels,
      hasRepeatSales: repeatSalesMap[repeatSales] || "unknown"
    });
  }

  return (
    <section className="quiz-card fade-in delay-1">
      <div className="quiz-progress">Шаг {step} из 3</div>

      <div key={step} className="quiz-step fade-slide-in">
        {step === 1 && (
          <>
            <h2>Вставьте сайт или опишите ваш бизнес</h2>
            <input
              type="text"
              value={businessOrSite}
              onChange={(event) => setBusinessOrSite(event.target.value)}
              placeholder="https://site.ru или опишите ваш бизнес, если сайта нет"
            />
            <p className="quiz-input-hint">
              Если вставите сайт - мы автоматически проанализируем его. Если сайта нет - подскажем,
              как выстроить воронку продаж.
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <h2>Как сейчас привлекаете клиентов?</h2>
            <div className="quiz-checkbox-list">
              {ACQUISITION_CHANNELS.map((channel) => (
                <label key={channel} className={`quiz-option ${channels.includes(channel) ? "selected" : ""}`}>
                  <input
                    className="quiz-channel-checkbox"
                    type="checkbox"
                    checked={channels.includes(channel)}
                    onChange={() => onToggleChannel(channel)}
                  />
                  <span className="quiz-channel-label">{channel}</span>
                </label>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Есть ли повторные продажи?</h2>
            <div className="quiz-options-grid">
              {REPEAT_SALES_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`quiz-option ${repeatSales === option ? "selected" : ""}`}
                  onClick={() => setRepeatSales(option)}
                >
                  {option}
                </button>
              ))}
            </div>
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

        {step < 3 ? (
          <button type="button" className="quiz-primary-btn" disabled={!canProceed} onClick={onNext}>
            Далее
          </button>
        ) : (
          <button type="button" className="quiz-primary-btn" disabled={!canProceed} onClick={onFinish}>
            Перейти к анализу
          </button>
        )}
      </div>
    </section>
  );
}
