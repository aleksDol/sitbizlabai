import { useMemo, useState } from "react";

const ACQUISITION_CHANNELS = [
  "Telegram",
  "YouTube",
  "Сарафанное радио",
  "Реклама",
  "Соцсети",
  "Рассылки"
];

const LEADS_PER_MONTH = ["0–5", "5–20", "20–50", "50+"];
const REPEAT_SALES_OPTIONS = ["Да", "Нет", "Не знаю"];

export function AnalyzerQuiz({ onComplete }) {
  const [step, setStep] = useState(1);
  const [businessType, setBusinessType] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [hasWebsite, setHasWebsite] = useState(true);
  const [channels, setChannels] = useState([]);
  const [repeatSales, setRepeatSales] = useState("");
  const [leadsPerMonth, setLeadsPerMonth] = useState("");

  const canProceed = useMemo(() => {
    if (step === 1) return businessType.trim().length > 1;
    if (step === 2) return !hasWebsite || websiteUrl.trim().length > 0;
    if (step === 3) return channels.length > 0;
    if (step === 4) return Boolean(repeatSales);
    if (step === 5) return Boolean(leadsPerMonth);
    return false;
  }, [step, businessType, hasWebsite, websiteUrl, channels, repeatSales, leadsPerMonth]);

  function onToggleChannel(channel) {
    setChannels((prev) =>
      prev.includes(channel) ? prev.filter((item) => item !== channel) : [...prev, channel]
    );
  }

  function onNext() {
    if (!canProceed) return;
    setStep((prev) => Math.min(prev + 1, 5));
  }

  function onBack() {
    setStep((prev) => Math.max(prev - 1, 1));
  }

  function onNoWebsite() {
    setHasWebsite(false);
    setWebsiteUrl("");
    setStep((prev) => Math.min(prev + 1, 5));
  }

  function onWebsiteUrlChange(value) {
    setHasWebsite(true);
    setWebsiteUrl(value);
  }

  function onFinish() {
    if (!canProceed) return;

    onComplete({
      businessType: businessType.trim(),
      hasWebsite,
      websiteUrl: hasWebsite ? websiteUrl.trim() : "",
      acquisitionChannels: channels,
      repeatSales,
      leadsPerMonth
    });
  }

  return (
    <section className="quiz-card fade-in delay-1">
      <div className="quiz-progress">Шаг {step} из 5</div>

      <div key={step} className="quiz-step fade-slide-in">
        {step === 1 && (
          <>
            <h2>Чем занимается ваш бизнес?</h2>
            <input
              type="text"
              value={businessType}
              onChange={(event) => setBusinessType(event.target.value)}
              placeholder="Например: студия дизайна интерьеров"
            />
          </>
        )}

        {step === 2 && (
          <>
            <h2>Есть ли у вас сайт?</h2>
            <input
              type="url"
              value={websiteUrl}
              onChange={(event) => onWebsiteUrlChange(event.target.value)}
              placeholder="https://example.com"
              disabled={!hasWebsite}
            />
            <button type="button" className="quiz-ghost-btn" onClick={onNoWebsite}>
              Нет сайта
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h2>Как сейчас привлекаете клиентов?</h2>
            <div className="quiz-options-grid">
              {ACQUISITION_CHANNELS.map((channel) => (
                <button
                  key={channel}
                  type="button"
                  className={`quiz-option ${channels.includes(channel) ? "selected" : ""}`}
                  onClick={() => onToggleChannel(channel)}
                >
                  {channel}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
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

        {step === 5 && (
          <>
            <h2>Сколько заявок в месяц?</h2>
            <div className="quiz-options-grid">
              {LEADS_PER_MONTH.map((range) => (
                <button
                  key={range}
                  type="button"
                  className={`quiz-option ${leadsPerMonth === range ? "selected" : ""}`}
                  onClick={() => setLeadsPerMonth(range)}
                >
                  {range}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="quiz-actions">
        {step > 1 && (
          <button type="button" className="quiz-ghost-btn" onClick={onBack}>
            Назад
          </button>
        )}

        {step < 5 ? (
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
