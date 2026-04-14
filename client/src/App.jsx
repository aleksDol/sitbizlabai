import { useMemo, useState } from "react";
import { useLoadingStages } from "./hooks/use-loading-stages";
import { useTypewriter } from "./hooks/use-typewriter";
import {
  FALLBACK_ANALYSIS_TEXT,
  LOADING_STAGES,
  MIN_LOADING_DURATION_MS
} from "./constants/analyze-ui.constants";
import {
  analyzeWebsite,
  createSolutionOffer,
  estimateBusinessLosses
} from "./services/analyze-api";
import { createLead } from "./services/leads-api";
import { wait } from "./utils/async.utils";
import { getFriendlyErrorMessage } from "./utils/error.utils";

const SECTION_MAPPERS = [
  { key: "score", label: "Общая оценка", match: ["общая оценка"] },
  { key: "problems", label: "Проблемы", match: ["главные проблемы", "проблемы"] },
  { key: "strengths", label: "Сильные стороны", match: ["сильные стороны"] },
  { key: "recommendations", label: "Рекомендации", match: ["как улучшить", "рекомендации"] },
  { key: "speed", label: "Скорость сайта", match: ["скорость сайта", "скорость"] }
];

const BUSINESS_QUESTIONS = {
  1: {
    title: "На чём сделан ваш сайт?",
    options: [
      { label: "Конструктор", value: "builder" },
      { label: "Самописный", value: "custom" },
      { label: "Не знаю", value: "unknown" }
    ]
  },
  2: {
    title: "Бывают ли у вас повторные продажи или допродажи?",
    options: [
      { label: "Да", value: true },
      { label: "Нет", value: false }
    ]
  },
  3: {
    title: "Трафик приходит из одного источника или из нескольких?",
    options: [
      { label: "Один источник", value: "single" },
      { label: "Несколько источников", value: "multiple" }
    ]
  }
};

function normalizeHeading(heading) {
  return heading
    .replace(/[#*`_]+/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .trim()
    .toLowerCase();
}

function mapHeading(heading) {
  const normalized = normalizeHeading(heading);
  const matched = SECTION_MAPPERS.find((item) =>
    item.match.some((keyword) => normalized.includes(keyword))
  );

  if (!matched) {
    return {
      key: "other",
      label: heading.replace(/[#*`_]+/g, "").trim()
    };
  }

  return {
    key: matched.key,
    label: matched.label
  };
}

function splitAnalysisIntoCards(text) {
  const source = (text || "").trim();
  if (!source) {
    return [];
  }

  const headingRegex = /^###\s+(.+)$/gm;
  const matches = [...source.matchAll(headingRegex)];

  if (matches.length === 0) {
    return [{ key: "other", title: "Результат анализа", body: source }];
  }

  const cards = [];

  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const next = matches[i + 1];

    const start = current.index + current[0].length;
    const end = next ? next.index : source.length;
    const body = source.slice(start, end).trim();

    const mapped = mapHeading(current[1]);

    cards.push({
      key: mapped.key,
      title: mapped.label,
      body: body || "Без деталей"
    });
  }

  return cards;
}

function extractProblemsForLosses(fullAnalysis) {
  const cards = splitAnalysisIntoCards(fullAnalysis);
  const problemsCard = cards.find((card) => card.key === "problems");
  return (problemsCard?.body || fullAnalysis || "").trim();
}

export default function App() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [warnings, setWarnings] = useState([]);

  const [lossesStatus, setLossesStatus] = useState("idle");
  const [lossesText, setLossesText] = useState("");
  const [lossesError, setLossesError] = useState("");

  const [selectedSiteType, setSelectedSiteType] = useState("");

  const [questionStep, setQuestionStep] = useState(0);
  const [businessAnswers, setBusinessAnswers] = useState({
    hasRepeatSales: null,
    trafficSources: null
  });

  const [solutionStatus, setSolutionStatus] = useState("idle");
  const [solutionOfferText, setSolutionOfferText] = useState("");
  const [solutionError, setSolutionError] = useState("");

  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitError, setLeadSubmitError] = useState("");
  const [leadForm, setLeadForm] = useState({
    name: "",
    contact: "",
    site: ""
  });

  const { loadingStep, start, stop, complete } = useLoadingStages(LOADING_STAGES.length);

  const fullAnalysis = useMemo(() => result?.analysis || FALLBACK_ANALYSIS_TEXT, [result]);
  const { typedText, isTyping } = useTypewriter(fullAnalysis, Boolean(result) && status === "success");
  const analysisCards = useMemo(() => splitAnalysisIntoCards(typedText), [typedText]);

  const { typedText: typedLossesText, isTyping: isLossesTyping } = useTypewriter(
    lossesText,
    lossesStatus === "success"
  );

  const { typedText: typedSolutionText, isTyping: isSolutionTyping } = useTypewriter(
    solutionOfferText,
    solutionStatus === "success"
  );

  function resetFinalStages() {
    setSelectedSiteType("");

    setQuestionStep(0);
    setBusinessAnswers({
      hasRepeatSales: null,
      trafficSources: null
    });

    setSolutionStatus("idle");
    setSolutionOfferText("");
    setSolutionError("");

    setShowLeadForm(false);
    setLeadSubmitted(false);
    setLeadForm({ name: "", contact: "", site: "" });
  }

  async function runAnalysis() {
    setError("");
    setResult(null);
    setWarnings([]);
    setStatus("loading");

    setLossesStatus("idle");
    setLossesText("");
    setLossesError("");

    resetFinalStages();

    start();

    try {
      const [siteData] = await Promise.all([analyzeWebsite(url), wait(MIN_LOADING_DURATION_MS)]);

      complete();
      setResult(siteData);
      setWarnings(Array.isArray(siteData?.warnings) ? siteData.warnings : []);
      setStatus("success");
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
      setStatus("error");
    } finally {
      stop();
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    await runAnalysis();
  }

  async function onRetry() {
    if (!url.trim()) {
      return;
    }
    await runAnalysis();
  }

  async function onEstimateLosses() {
    const analysisProblems = extractProblemsForLosses(fullAnalysis);

    if (!analysisProblems) {
      setLossesStatus("error");
      setLossesError("Не удалось выделить проблемы для расчета потерь.");
      return;
    }

    setLossesStatus("loading");
    setLossesError("");
    setLossesText("");
    resetFinalStages();

    try {
      const response = await estimateBusinessLosses(analysisProblems);
      setLossesText(response?.losses || "Не удалось рассчитать потери. Попробуйте ещё раз.");
      setLossesStatus("success");
    } catch (err) {
      setLossesError(getFriendlyErrorMessage(err));
      setLossesStatus("error");
    }
  }

  function onOpenPlanStep() {
    setSelectedSiteType("");
    setQuestionStep(1);
    setBusinessAnswers({
      hasRepeatSales: null,
      trafficSources: null
    });
    setSolutionStatus("idle");
    setSolutionOfferText("");
    setSolutionError("");
    setShowLeadForm(false);
    setLeadSubmitted(false);
  }

  async function requestSolutionOffer(nextAnswers) {
    if (!fullAnalysis || !lossesText || !selectedSiteType) {
      setSolutionStatus("error");
      setSolutionError("Не хватает данных для персонального предложения.");
      return;
    }

    setSolutionStatus("loading");
    setSolutionOfferText("");
    setSolutionError("");
    setShowLeadForm(false);
    setLeadSubmitted(false);

    try {
      const response = await createSolutionOffer({
        analysisText: fullAnalysis,
        lossesText,
        siteType: selectedSiteType,
        hasRepeatSales: nextAnswers.hasRepeatSales,
        trafficSources: nextAnswers.trafficSources
      });

      setSolutionOfferText(
        response?.solutionOfferText || "Не удалось сформировать предложение. Попробуйте ещё раз."
      );
      setSolutionStatus("success");
    } catch (err) {
      setSolutionStatus("error");
      setSolutionError(getFriendlyErrorMessage(err));
    }
  }

  async function onAnswerQuestion(value) {
    if (questionStep === 1) {
      setSelectedSiteType(value);
      setQuestionStep(2);
      return;
    }

    if (questionStep === 2) {
      const nextAnswers = {
        ...businessAnswers,
        hasRepeatSales: value
      };
      setBusinessAnswers(nextAnswers);
      setQuestionStep(3);
      return;
    }

    if (questionStep === 3) {
      const nextAnswers = {
        ...businessAnswers,
        trafficSources: value
      };
      setBusinessAnswers(nextAnswers);
      setQuestionStep(0);
      await requestSolutionOffer(nextAnswers);
    }
  }

  function onOpenLeadForm() {
    setShowLeadForm(true);
    setLeadSubmitted(false);
    setLeadSubmitting(false);
    setLeadSubmitError("");
    setLeadForm((prev) => ({
      ...prev,
      site: url
    }));
  }

  function onLeadFieldChange(field, value) {
    setLeadForm((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  async function onLeadSubmit(event) {
    event.preventDefault();
    setLeadSubmitting(true);
    setLeadSubmitError("");
    setLeadSubmitted(false);

    try {
      await createLead({
        name: leadForm.name?.trim() || "",
        contact: leadForm.contact?.trim() || "",
        websiteUrl: leadForm.site?.trim() || null,
        analysisText: fullAnalysis?.trim() || null,
        lossesText: lossesText?.trim() || null,
        solutionOfferText: solutionOfferText?.trim() || null,
        siteType: selectedSiteType || null,
        hasRepeatSales:
          typeof businessAnswers.hasRepeatSales === "boolean" ? businessAnswers.hasRepeatSales : null,
        trafficSources: businessAnswers.trafficSources || null
      });

      setLeadSubmitted(true);
    } catch (err) {
      setLeadSubmitError(
        err instanceof Error && err.message ? err.message : "Не удалось отправить заявку. Попробуйте ещё раз."
      );
    } finally {
      setLeadSubmitting(false);
    }
  }

  const currentQuestion = questionStep > 0 ? BUSINESS_QUESTIONS[questionStep] : null;

  return (
    <main className="page">
      <section className="shell">
        <header className="hero fade-in">
          <h1>Аудит сайта за 30 секунд</h1>
          <p>Найдём ошибки в UX, SEO и конверсии</p>
        </header>

        <form onSubmit={onSubmit} className="analyze-form fade-in delay-1">
          <input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            required
          />
          <button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Анализируем..." : "Анализировать"}
          </button>
        </form>

        {status === "loading" && (
          <section className="loader fade-in delay-2">
            <p className="loader-title">Анализируем сайт...</p>
            <div className="stages">
              {LOADING_STAGES.map((stage, index) => {
                const stateClass =
                  index < loadingStep ? "done" : index === loadingStep ? "active" : "pending";

                return (
                  <p key={stage} className={`stage ${stateClass}`}>
                    <span>{index + 1}</span>
                    {stage}
                  </p>
                );
              })}
            </div>
          </section>
        )}

        {status === "error" && (
          <section className="error-box fade-in delay-2">
            <p>{error}</p>
            <button type="button" className="retry-btn" onClick={onRetry}>
              Попробовать снова
            </button>
          </section>
        )}

        {status === "success" && warnings.length > 0 && (
          <section className="warning-box fade-in delay-2">
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </section>
        )}

        {result && (
          <section className="results fade-in delay-3">
            {analysisCards.map((card) => (
              <article key={`${card.key}-${card.title}`} className="result-card">
                <h2>{card.title}</h2>
                <p>{card.body}</p>
              </article>
            ))}
            {isTyping && <span className="typing-cursor">|</span>}

            <div className="losses-cta-wrap">
              <button
                type="button"
                className="losses-cta"
                onClick={onEstimateLosses}
                disabled={lossesStatus === "loading"}
              >
                Да, хочу узнать, что я теряю
              </button>
            </div>

            {lossesStatus === "loading" && <section className="losses-loading">Считаем потери...</section>}

            {lossesStatus === "error" && (
              <section className="error-box">
                <p>{lossesError || "Не удалось рассчитать потери. Попробуйте ещё раз."}</p>
              </section>
            )}

            {lossesStatus === "success" && (
              <article className="result-card losses-card">
                <h2>💸 Что вы теряете</h2>
                <p>{typedLossesText}</p>
                {isLossesTyping && <span className="typing-cursor">|</span>}
              </article>
            )}

            {lossesStatus === "success" && (
              <section className="plan-cta-wrap">
                <h3>Давайте обсудим план реализации</h3>
                <button type="button" className="plan-open-btn" onClick={onOpenPlanStep}>
                  Да, давайте
                </button>
              </section>
            )}

            {questionStep > 0 && currentQuestion && (
              <section className="plan-site-type fade-slide-in">
                <p>{currentQuestion.title}</p>
                <div className="site-type-buttons">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      className="site-type-btn"
                      onClick={() => onAnswerQuestion(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {solutionStatus === "loading" && (
              <section className="losses-loading">Формируем план реализации...</section>
            )}

            {solutionStatus === "error" && (
              <section className="error-box">
                <p>{solutionError || "Не удалось сформировать план реализации. Попробуйте ещё раз."}</p>
              </section>
            )}

            {solutionStatus === "success" && (
              <article className="result-card solution-card">
                <h2>🚀 План реализации</h2>
                <p className="structured-text">{typedSolutionText}</p>
                {isSolutionTyping && <span className="typing-cursor">|</span>}

                <button type="button" className="implement-cta" onClick={onOpenLeadForm}>
                  Да, давайте реализуем
                </button>

                {showLeadForm && (
                  <section className="lead-form-wrap fade-slide-in">
                    <h3>Оставьте контакты — подготовим для вас план внедрения под ваш сайт</h3>

                    <form className="lead-form" onSubmit={onLeadSubmit}>
                      <label>
                        Имя
                        <input
                          type="text"
                          value={leadForm.name}
                          onChange={(event) => onLeadFieldChange("name", event.target.value)}
                          required
                        />
                      </label>

                      <label>
                        Контакт (Telegram или Email)
                        <input
                          type="text"
                          value={leadForm.contact}
                          onChange={(event) => onLeadFieldChange("contact", event.target.value)}
                          required
                        />
                      </label>

                      <label>
                        Сайт
                        <input
                          type="url"
                          value={leadForm.site}
                          onChange={(event) => onLeadFieldChange("site", event.target.value)}
                          required
                        />
                      </label>

                      <button type="submit" className="lead-submit-btn">
                        {leadSubmitting ? "Отправляем..." : "Отправить"}
                      </button>
                    </form>

                    {leadSubmitError && <p className="lead-error">{leadSubmitError}</p>}
                    {leadSubmitted && (
                      <p className="lead-success">Спасибо! Мы свяжемся с вами и обсудим реализацию.</p>
                    )}
                  </section>
                )}
              </article>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
