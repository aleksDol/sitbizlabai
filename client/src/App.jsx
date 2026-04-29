import { useEffect, useMemo, useState } from "react";
import { AnalyzerQuiz } from "./components/analyzer/AnalyzerQuiz";
import { AnalysisProgress } from "./components/analyzer/AnalysisProgress";
import { TypewriterText } from "./components/analyzer/TypewriterText";
import { useTypewriter } from "./hooks/use-typewriter";
import { useAnalysisProgress } from "./hooks/use-analysis-progress";
import { FALLBACK_ANALYSIS_TEXT, MIN_LOADING_DURATION_MS } from "./constants/analyze-ui.constants";
import {
  analyzeBusiness,
  createSolutionOffer,
  estimateBusinessLosses
} from "./services/analyze-api";
import { createLead } from "./services/leads-api";
import { wait } from "./utils/async.utils";
import { getFriendlyErrorMessage } from "./utils/error.utils";
import { reachMetrikaGoal } from "./utils/metrika";

const ANALYSIS_STEPS = [
  { id: "business", label: "Считываем данные бизнеса", requiresWebsite: false },
  { id: "site", label: "Проверяем сайт и структуру", requiresWebsite: true },
  { id: "platform", label: "Определяем платформу сайта", requiresWebsite: true },
  { id: "channels", label: "Оцениваем каналы привлечения", requiresWebsite: false },
  { id: "losses", label: "Ищем потери в воронке", requiresWebsite: false },
  { id: "plan", label: "Формируем план реализации", requiresWebsite: false }
];

const SECTION_MAPPERS = [
  { key: "score", label: "Общая оценка", match: ["общая оценка"] },
  { key: "problems", label: "Проблемы", match: ["главные проблемы", "проблемы"] },
  { key: "strengths", label: "Сильные стороны", match: ["сильные стороны"] },
  { key: "recommendations", label: "Рекомендации", match: ["как улучшить", "рекомендации"] },
  { key: "speed", label: "Скорость сайта", match: ["скорость сайта", "скорость"] }
];

const PLAN_LOADING_STEPS = [
  "Учитываем нишу и каналы привлечения",
  "Проверяем данные по сайту",
  "Подбираем подходящие решения",
  "Формируем понятный план"
];

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

function splitTextBlocks(text) {
  return (text || "")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function parseImplementationCards(rawText) {
  const text = (rawText || "").trim();
  if (!text) return null;

  const headerMatch = text.match(/🚀\s*Что стоит внедрить/i);
  if (!headerMatch || headerMatch.index === undefined) return null;

  const sectionStart = headerMatch.index;
  const tail = text.slice(sectionStart);
  const nextHeaderMatch = tail.match(/\n(?:📈\s*Если коротко|🛠\s*Что мы можем сделать для вас|👉\s*Финал:|💡\s*Хотите внедрить)/i);
  const sectionEnd = nextHeaderMatch ? sectionStart + nextHeaderMatch.index : text.length;

  const before = text.slice(0, sectionStart).trim();
  const section = text.slice(sectionStart, sectionEnd).trim();
  const after = text.slice(sectionEnd).trim();

  const chunks = section.split(/Проблема:/i).slice(1);
  if (chunks.length === 0) return null;

  const cards = [];
  for (const chunk of chunks) {
    const solutionSplit = chunk.split(/Решение:/i);
    if (solutionSplit.length < 2) return null;

    const problem = solutionSplit[0].trim();
    const solutionAndResult = solutionSplit.slice(1).join("Решение:").trim();

    const resultSplit = solutionAndResult.split(/(?:Что получит бизнес|Результат):/i);
    if (resultSplit.length < 2) return null;

    const solution = resultSplit[0].trim();
    const result = resultSplit.slice(1).join(" ").trim();

    if (!problem || !solution || !result) return null;
    cards.push({ problem, solution, result });
  }

  if (cards.length === 0) return null;

  return {
    beforeBlocks: splitTextBlocks(before),
    cards,
    afterBlocks: splitTextBlocks(after)
  };
}

function trackLeadFormSubmitted(payload = {}) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.dispatchEvent(
      new CustomEvent("sitebizai_lead_form_submitted", {
        detail: payload
      })
    );
  } catch {
    // Silent: tracking should never break the main flow.
  }

  reachMetrikaGoal("lead_form_submitted");
}

function trackLossesCtaClicked(payload = {}) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.dispatchEvent(
      new CustomEvent("sitebizai_losses_cta_click", {
        detail: payload
      })
    );
  } catch {
    // Silent: tracking should never break the main flow.
  }

  reachMetrikaGoal("losses_cta_click");
}

function trackPlanCtaClicked(payload = {}) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.dispatchEvent(
      new CustomEvent("sitebizai_plan_cta_click", {
        detail: payload
      })
    );
  } catch {
    // Silent: tracking should never break the main flow.
  }

  reachMetrikaGoal("plan_cta_click");
}

export default function App() {
  const [quizAnswers, setQuizAnswers] = useState(null);
  const [isQuizCompleted, setIsQuizCompleted] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [warnings, setWarnings] = useState([]);

  const [lossesStatus, setLossesStatus] = useState("idle");
  const [lossesText, setLossesText] = useState("");
  const [lossesError, setLossesError] = useState("");

  const [selectedSiteType, setSelectedSiteType] = useState("");
  const [planLoadingStepIndex, setPlanLoadingStepIndex] = useState(0);

  const [solutionStatus, setSolutionStatus] = useState("idle");
  const [solutionOfferText, setSolutionOfferText] = useState("");
  const [solutionPlanCards, setSolutionPlanCards] = useState([]);
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

  const analysisSteps = useMemo(() => {
    const hasWebsite = Boolean(quizAnswers?.hasWebsite);
    return ANALYSIS_STEPS.filter((step) => !step.requiresWebsite || hasWebsite);
  }, [quizAnswers]);

  const { activeStep, progress, completeProgress, stopProgress } = useAnalysisProgress(
    analysisSteps,
    status === "loading"
  );

  const fullAnalysis = useMemo(() => result?.analysis || FALLBACK_ANALYSIS_TEXT, [result]);
  const { typedText, isTyping } = useTypewriter(fullAnalysis, Boolean(result) && status === "success");
  const analysisCards = useMemo(() => splitAnalysisIntoCards(typedText), [typedText]);
  const {
    typedText: typedSolutionText,
    isTyping: isTypingSolution
  } = useTypewriter(solutionOfferText, solutionStatus === "success");
  const parsedImplementationCards = useMemo(
    () =>
      Array.isArray(solutionPlanCards) && solutionPlanCards.length > 0
        ? { beforeBlocks: [], cards: solutionPlanCards, afterBlocks: [] }
        : parseImplementationCards(solutionOfferText),
    [solutionOfferText, solutionPlanCards]
  );

  function resetFinalStages() {
    setSelectedSiteType("");
    setPlanLoadingStepIndex(0);

    setSolutionStatus("idle");
    setSolutionOfferText("");
    setSolutionPlanCards([]);
    setSolutionError("");

    setShowLeadForm(false);
    setLeadSubmitted(false);
    setLeadForm({ name: "", contact: "", site: "" });
  }

  useEffect(() => {
    if (solutionStatus !== "loading") {
      setPlanLoadingStepIndex(0);
      return undefined;
    }

    const timer = setInterval(() => {
      setPlanLoadingStepIndex((prev) => (prev + 1) % PLAN_LOADING_STEPS.length);
    }, 650);

    return () => clearInterval(timer);
  }, [solutionStatus]);

  function buildAnalysisInput() {
    if (!quizAnswers || typeof quizAnswers.hasWebsite !== "boolean") {
      return null;
    }

    return {
      niche: quizAnswers.hasWebsite ? null : quizAnswers.niche || null,
      websiteUrl: quizAnswers.hasWebsite ? quizAnswers.websiteUrl || null : null,
      hasWebsite: quizAnswers.hasWebsite,
      channels: Array.isArray(quizAnswers.acquisitionChannels) ? quizAnswers.acquisitionChannels : [],
      hasRepeatSales: quizAnswers.hasRepeatSales || "unknown"
    };
  }

  async function runAnalysis(analysisInputOverride = null) {
    setError("");
    setResult(null);
    setWarnings([]);
    setStatus("loading");

    setLossesStatus("idle");
    setLossesText("");
    setLossesError("");

    resetFinalStages();

    try {
      const analysisInput = analysisInputOverride || buildAnalysisInput();
      const shouldAnalyzeByWebsite = analysisInput?.hasWebsite && analysisInput?.websiteUrl;

      const request = shouldAnalyzeByWebsite
        ? analyzeBusiness(analysisInput)
        : analyzeBusiness({ ...analysisInput, websiteUrl: null });

      const [siteData] = await Promise.all([request, wait(MIN_LOADING_DURATION_MS)]);
      completeProgress();
      setResult(siteData);
      setWarnings(Array.isArray(siteData?.warnings) ? siteData.warnings : []);
      setStatus("success");
    } catch (err) {
      stopProgress();
      setError(getFriendlyErrorMessage(err));
      setStatus("error");
    }
  }

  async function onRetry() {
    if (quizAnswers?.hasWebsite && !quizAnswers?.websiteUrl) {
      return;
    }
    await runAnalysis();
  }

  async function onQuizComplete(answers) {
    const nextAnalysisInput = {
      niche: answers.hasWebsite ? null : answers.niche || null,
      websiteUrl: answers.hasWebsite ? answers.websiteUrl || null : null,
      hasWebsite: Boolean(answers.hasWebsite),
      channels: Array.isArray(answers.acquisitionChannels) ? answers.acquisitionChannels : [],
      hasRepeatSales: answers.hasRepeatSales || "unknown"
    };

    setQuizAnswers(answers);
    setIsQuizCompleted(true);
    await runAnalysis(nextAnalysisInput);
  }

  async function onEstimateLosses() {
    const analysisProblems = extractProblemsForLosses(fullAnalysis);

    if (!analysisProblems) {
      setLossesStatus("error");
      setLossesError("Не удалось выделить проблемы для расчёта потерь.");
      return;
    }

    setLossesStatus("loading");
    setLossesError("");
    setLossesText("");
    resetFinalStages();
    trackLossesCtaClicked({
      hasWebsite: Boolean(quizAnswers?.hasWebsite),
      channelsCount: Array.isArray(quizAnswers?.acquisitionChannels)
        ? quizAnswers.acquisitionChannels.length
        : 0
    });

    try {
      const response = await estimateBusinessLosses(analysisProblems, buildAnalysisInput());
      setLossesText(response?.losses || "Не удалось рассчитать потери. Попробуйте ещё раз.");
      setLossesStatus("success");
    } catch (err) {
      setLossesError(getFriendlyErrorMessage(err));
      setLossesStatus("error");
    }
  }

  function onOpenPlanStep() {
    trackPlanCtaClicked({
      hasWebsite: Boolean(quizAnswers?.hasWebsite),
      lossesReady: Boolean(lossesText?.trim())
    });
    requestSolutionOffer();
  }

  async function requestSolutionOffer() {
    const hasWebsite = Boolean(quizAnswers?.hasWebsite);
    const channels = Array.isArray(quizAnswers?.acquisitionChannels) ? quizAnswers.acquisitionChannels : [];
    const trafficSources = channels.length > 1 ? "multiple" : "single";
    const detectedPlatform = hasWebsite ? result?.detectedPlatform || null : null;
    const platformName =
      detectedPlatform && detectedPlatform.platform && detectedPlatform.platform !== "unknown"
        ? detectedPlatform.platform
        : "unknown";
    const hasRepeatSales = quizAnswers?.hasRepeatSales || "unknown";

    if (!fullAnalysis || !lossesText) {
      setSolutionStatus("error");
      setSolutionError("Не хватает данных для персонального предложения.");
      return;
    }

    setSolutionStatus("loading");
    setSolutionOfferText("");
    setSolutionPlanCards([]);
    setSolutionError("");
    setShowLeadForm(false);
    setLeadSubmitted(false);
    const startedAt = Date.now();

    try {
      const response = await createSolutionOffer({
        analysisText: fullAnalysis,
        lossesText,
        siteType: platformName,
        niche: quizAnswers?.niche || null,
        hasWebsite,
        websiteUrl: quizAnswers?.websiteUrl || null,
        channels,
        hasRepeatSales,
        trafficSources,
        detectedPlatform
      });
      const elapsed = Date.now() - startedAt;
      if (elapsed < 1000) {
        await wait(1000 - elapsed);
      }

      setSolutionOfferText(
        response?.solutionOfferText || "Не удалось сформировать предложение. Попробуйте ещё раз."
      );
      setSolutionPlanCards(Array.isArray(response?.planCards) ? response.planCards : []);
      setSolutionStatus("success");
      setSelectedSiteType(platformName);
    } catch (err) {
      setSolutionPlanCards([]);
      setSolutionStatus("error");
      setSolutionError(getFriendlyErrorMessage(err));
    }
  }

  function onOpenLeadForm() {
    setShowLeadForm(true);
    setLeadSubmitted(false);
    setLeadSubmitting(false);
    setLeadSubmitError("");
    setLeadForm((prev) => ({
      ...prev,
      site: quizAnswers?.hasWebsite ? quizAnswers?.websiteUrl || "" : ""
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
        niche: quizAnswers?.hasWebsite ? null : quizAnswers?.niche?.trim() || null,
        websiteUrl: quizAnswers?.hasWebsite ? leadForm.site?.trim() || null : null,
        hasWebsite: typeof quizAnswers?.hasWebsite === "boolean" ? quizAnswers.hasWebsite : null,
        channels: Array.isArray(quizAnswers?.acquisitionChannels) ? quizAnswers.acquisitionChannels : [],
        leadsPerMonth: null,
        detectedPlatform: quizAnswers?.hasWebsite ? result?.detectedPlatform?.platform || null : null,
        analysisText: fullAnalysis?.trim() || null,
        lossesText: lossesText?.trim() || null,
        solutionOfferText: solutionOfferText?.trim() || null,
        siteType: selectedSiteType || null,
        hasRepeatSales:
          quizAnswers?.hasRepeatSales === "yes"
            ? true
            : quizAnswers?.hasRepeatSales === "no"
              ? false
              : null,
        trafficSources:
          Array.isArray(quizAnswers?.acquisitionChannels) && quizAnswers.acquisitionChannels.length > 1
            ? "multiple"
            : "single"
      });

      setLeadSubmitted(true);
      trackLeadFormSubmitted({
        hasWebsite: Boolean(quizAnswers?.hasWebsite),
        niche: quizAnswers?.niche || "",
        channelsCount: Array.isArray(quizAnswers?.acquisitionChannels)
          ? quizAnswers.acquisitionChannels.length
          : 0
      });
    } catch (err) {
      setLeadSubmitError(
        err instanceof Error && err.message ? err.message : "Не удалось отправить заявку. Попробуйте ещё раз."
      );
    } finally {
      setLeadSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="shell">
        <header className="hero fade-in">
          <h1>Аудит бизнеса за 30 секунд</h1>
          <p>Найдём ошибки в UX, SEO и конверсии</p>
        </header>

        {!isQuizCompleted && <AnalyzerQuiz onComplete={onQuizComplete} />}

        {isQuizCompleted && (
          <section className="quiz-summary fade-slide-in">
            <p>{quizAnswers?.hasWebsite ? "Запускаем анализ сайта..." : "Запускаем анализ бизнеса..."}</p>
          </section>
        )}

        {status === "loading" && (
          <AnalysisProgress steps={analysisSteps} activeStep={activeStep} progress={progress} />
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
                <TypewriterText text={lossesText} enabled={lossesStatus === "success"} />
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

            {solutionStatus === "loading" && (
              <section className="plan-loading fade-slide-in">
                <h3>Готовим план реализации</h3>
                <p>Собираем ответы, анализ сайта и подбираем решение под ваш бизнес</p>
                <div className="plan-loading-progress">
                  <span
                    className="plan-loading-progress-fill"
                    style={{ width: `${((planLoadingStepIndex + 1) / PLAN_LOADING_STEPS.length) * 100}%` }}
                  />
                </div>
                <ul className="plan-loading-steps">
                  {PLAN_LOADING_STEPS.map((step, index) => (
                    <li key={step} className={index <= planLoadingStepIndex ? "active" : ""}>
                      {step}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {solutionStatus === "error" && (
              <section className="error-box">
                <p>{solutionError || "Не удалось сформировать план реализации. Попробуйте ещё раз."}</p>
              </section>
            )}

            {solutionStatus === "success" && (
              <article className="result-card solution-card">
                <h2>🚀 План реализации</h2>
                {isTypingSolution ? (
                  <>
                    <p className="structured-text">{typedSolutionText}</p>
                    <span className="typing-cursor">|</span>
                  </>
                ) : parsedImplementationCards ? (
                  <div className="plan-cards-layout">
                    {parsedImplementationCards.beforeBlocks.map((block) => (
                      <p key={`before-${block}`} className="structured-text">
                        {block}
                      </p>
                    ))}

                    <section className="plan-cards-section">
                      <h3>🚀 Что стоит внедрить</h3>
                      {parsedImplementationCards.cards.map((card, index) => (
                        <div key={`${card.problem}-${index}`} className="plan-card">
                          <div className="card-problem">
                            🔴 Проблема
                            <br />
                            {card.problem}
                          </div>
                          <div className="card-solution">
                            🔵 Решение
                            <br />
                            {card.solution}
                          </div>
                          <div className="card-result">
                            🟢 Результат
                            <br />
                            {card.result}
                          </div>
                        </div>
                      ))}
                    </section>

                    {parsedImplementationCards.afterBlocks.map((block) => (
                      <p key={`after-${block}`} className="structured-text">
                        {block}
                      </p>
                    ))}
                  </div>
                ) : (
                  <TypewriterText
                    text={solutionOfferText}
                    enabled={solutionStatus === "success"}
                    className="structured-text"
                    sanitizeMarkdown
                  />
                )}

                <button type="button" className="implement-cta" onClick={onOpenLeadForm}>
                  Да, давайте реализуем
                </button>

                {showLeadForm && (
                  <section className="lead-form-wrap fade-slide-in">
                    <h3>Хотите внедрить это у себя?</h3>
                    <p>
                      Оставьте контакты — мы разберём вашу ситуацию и покажем, как собрать понятную систему под ваш
                      бизнес: сайт, заявки, аналитику и повторные касания.
                    </p>

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
                          required={Boolean(quizAnswers?.hasWebsite)}
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
