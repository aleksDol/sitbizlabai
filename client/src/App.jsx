import { useEffect, useMemo, useState } from "react";
import { AnalyzerQuiz } from "./components/analyzer/AnalyzerQuiz";
import { AnalysisProgress } from "./components/analyzer/AnalysisProgress";
import { TypewriterText } from "./components/analyzer/TypewriterText";
import { FinalCTA } from "./components/analyzer/FinalCTA";
import { useTypewriter } from "./hooks/use-typewriter";
import { useAnalysisProgress } from "./hooks/use-analysis-progress";
import { FALLBACK_ANALYSIS_TEXT, MIN_LOADING_DURATION_MS } from "./constants/analyze-ui.constants";
import {
  analyzeBusiness,
  createSolutionOffer,
  estimateBusinessLosses
} from "./services/analyze-api";
import { createLead, updateLead } from "./services/leads-api";
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
const UNLOCK_LOADING_STEPS = [
  "⏺ Анализируем точки потери клиентов...",
  "⏺ Формируем рекомендации...",
  "⏺ Подготавливаем полный разбор..."
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

function extractPreviewProblemItems(problemText) {
  const chunks = (problemText || "")
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter(Boolean);

  if (chunks.length === 0) return [];
  return chunks.filter((line) => line.length > 20);
}

function sanitizePreviewText(text) {
  return (text || "")
    .replace(/[*_`#]/g, "")
    .replace(/^\s*[-•*]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSentences(text) {
  return sanitizePreviewText(text)
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function detectPreviewAxis(text, { isBusinessMode = false } = {}) {
  const source = sanitizePreviewText(text).toLowerCase();
  if (isBusinessMode) {
    if (source.includes("ответ") || source.includes("переписк")) return "response_speed";
    if (source.includes("повтор")) return "repeat_sales";
    if (source.includes("аналит")) return "analytics";
    if (source.includes("ручн") || source.includes("обработ")) return "manual_processing";
    return "client_process";
  }

  if (source.includes("перв") || source.includes("экран")) return "first_screen";
  if (source.includes("cta") || source.includes("кноп")) return "cta_overload";
  if (source.includes("довер") || source.includes("кейс")) return "trust";
  if (source.includes("мобил")) return "mobile";
  if (source.includes("структур") || source.includes("блок")) return "blocks_structure";
  return "lead_path";
}

function diversifyProblemEnding(text, usedEndings) {
  const normalized = sanitizePreviewText(text);
  const endings = [
    "Это увеличивает риск ухода без заявки.",
    "Из-за этого следующий шаг для клиента становится менее очевидным.",
    "В результате часть пользователей откладывает решение и уходит.",
    "Это замедляет путь до обращения и снижает ясность сценария."
  ];
  const currentEnding = endings.find((ending) => normalized.endsWith(ending)) || "";

  if (!currentEnding) {
    return normalized;
  }

  if (!usedEndings.has(currentEnding)) {
    usedEndings.add(currentEnding);
    return normalized;
  }

  const replacement = endings.find((item) => !usedEndings.has(item)) || endings[0];
  usedEndings.add(replacement);
  return normalized.replace(currentEnding, replacement);
}

function enrichProblemPreview(text, { isBusinessMode = false, businessContext = "" } = {}) {
  const source = (text || "").replace(/\s+/g, " ").trim();
  if (!source) return "";

  const lower = source.toLowerCase();
  const context = (businessContext || "").toLowerCase();

  if (isBusinessMode && (context.includes("тг") || context.includes("telegram"))) {
    return "Сейчас часть клиентов может теряться прямо в переписках: сообщения тонут, ответы задерживаются, а повторные обращения не фиксируются. Из-за этого сложнее масштабировать продажи и удерживать постоянных покупателей.";
  }

  if (isBusinessMode && (lower.includes("ручн") || lower.includes("обработ"))) {
    return "Продажи завязаны на ручной обработке обращений: при росте потока часть клиентов может не дождаться ответа. Из-за этого ответы запаздывают, а часть заявок откладывается на потом.";
  }

  if (lower.includes("аналитик")) {
    return "Сейчас сложно понять, какие действия реально приводят клиентов. Из-за этого часть времени и бюджета может уходить в каналы, которые не дают заявок, а точки роста остаются незаметными.";
  }

  if (lower.includes("ручн") || lower.includes("обработ")) {
    return "Часть заявок может теряться из-за ручной обработки: клиент ждёт ответ, отвлекается и уходит. Особенно в вечерние часы и выходные некоторые обращения остаются без быстрого ответа.";
  }

  if (lower.includes("форм") || lower.includes("заявк")) {
    return "Путь до заявки может быть длинным или неочевидным, поэтому часть заинтересованных клиентов не доходит до контакта. В результате вы платите за трафик, но не получаете его в выручке.";
  }

  const hasBusinessImpact = /заяв|клиент|конверс|деньг|бюджет|выручк|продаж/i.test(source);
  if (hasBusinessImpact) {
    return source;
  }

  if (isBusinessMode) {
    return `${source} В результате часть обращений может потеряться в процессе, и клиенту сложнее получить ответ вовремя.`;
  }

  return `${source} Из-за этого человек может не сразу понять, какой шаг главный, и уйти без заявки.`;
}

function pickRecommendationPreview(cards, { isBusinessMode = false, businessContext = "" } = {}) {
  const recommendationCard = cards.find((card) => card.key === "recommendations");
  if (recommendationCard?.body) {
    const firstLine = recommendationCard.body
      .split(/\n+/)
      .map((line) => line.replace(/^[-*•\d.)\s]+/, "").trim())
      .find(Boolean);
    if (firstLine) {
      if (/^проблема\s*:/i.test(firstLine)) {
        const normalized = firstLine.replace(/^проблема\s*:\s*/i, "").trim();
        return `Можно ${normalized.charAt(0).toLowerCase()}${normalized.slice(1)} — это поможет сократить потери заявок и сделать обработку обращений стабильнее.`;
      }
      return firstLine;
    }
  }

  const context = (businessContext || "").toLowerCase();
  if (isBusinessMode && (context.includes("тг") || context.includes("telegram"))) {
    return "Можно выстроить простой процесс обработки заявок в Telegram: фиксировать входящие обращения, быстро отвечать на типовые вопросы и не терять повторные покупки. Это помогает продавать стабильнее без резкого роста ручной работы.";
  }

  if (isBusinessMode) {
    return "Можно сократить потери заявок через автоматическую обработку обращений, быстрые ответы и базовый учёт повторных касаний — такие изменения часто дают быстрый эффект без сложного внедрения.";
  }

  return "Можно сократить потери заявок через автоматическую обработку обращений и быстрые ответы клиентам — такие изменения обычно дают эффект без полной переделки сайта.";
}

function ensurePreviewRecommendationText(text, { isBusinessMode = false, businessContext = "" } = {}) {
  const normalized = sanitizePreviewText(text).replace(/^проблема\s*:\s*/i, "");
  const words = normalized.split(/\s+/).filter(Boolean);
  const hasEffect = /эффект|поможет|снизит|ускорит|стабиль|конверси|заявк|продаж/i.test(normalized);
  if (words.length >= 8 && hasEffect) {
    const sentences = splitSentences(normalized);
    return sentences.slice(0, 2).join(" ");
  }

  const context = (businessContext || "").toLowerCase();
  if (isBusinessMode && (context.includes("тг") || context.includes("telegram"))) {
    return "Можно выстроить понятный сценарий обработки обращений в Telegram: фиксировать входящие заявки и быстрее отвечать на типовые вопросы. Это поможет снизить потери клиентов и стабилизировать повторные продажи.";
  }
  if (isBusinessMode) {
    return "Можно собрать обращения в более понятный процесс: быстрый первый ответ, учёт заявок и простые повторные касания. Это уменьшит потери клиентов и сделает продажи стабильнее.";
  }
  return "Можно сделать путь до заявки короче и понятнее: оставить один главный сценарий действия и убрать лишние отвлечения. Это поможет пользователю быстрее перейти к обращению.";
}

function pickProblemTitle(problemText, index, { isBusinessMode = false } = {}) {
  const source = (problemText || "").toLowerCase();
  const siteTitles = [
    "Где теряются заявки",
    "Что мешает оставить заявку",
    "Почему часть клиентов может уходить"
  ];
  const businessTitles = [
    "Где теряются заявки",
    "Что тормозит продажи",
    "Что мешает повторным продажам"
  ];

  if (source.includes("повтор")) return "Что мешает повторным продажам";
  if (source.includes("ответ") || source.includes("скорост")) return "Где теряется скорость ответа";
  if (source.includes("конверс")) return "Что мешает оставить заявку";
  if (source.includes("клиент") || source.includes("заяв")) return "Почему часть клиентов может уходить";

  const fallback = isBusinessMode ? businessTitles : siteTitles;
  return fallback[index] || fallback[fallback.length - 1];
}

function buildPreUnlockPreview(cards, { isBusinessMode = false, businessContext = "" } = {}) {
  const problemsCard = cards.find((card) => card.key === "problems");
  let problemItems = extractPreviewProblemItems(problemsCard?.body);
  if (problemItems.length === 0) {
    problemItems = cards
      .filter((card) => card.key !== "recommendations")
      .flatMap((card) => extractPreviewProblemItems(card.body))
      .slice(0, 5);
  }

  const selectedProblems = [];
  const usedAxes = new Set();
  for (const item of problemItems) {
    const axis = detectPreviewAxis(item, { isBusinessMode });
    if (usedAxes.has(axis)) continue;
    selectedProblems.push(item);
    usedAxes.add(axis);
    if (selectedProblems.length === 2) break;
  }
  if (selectedProblems.length < 2) {
    for (const item of problemItems) {
      if (selectedProblems.includes(item)) continue;
      selectedProblems.push(item);
      if (selectedProblems.length === 2) break;
    }
  }

  const usedEndings = new Set();
  const previewProblems = selectedProblems.map((item, index) => {
    const title = sanitizePreviewText(pickProblemTitle(item, index, { isBusinessMode }));
    let text = enrichProblemPreview(item, { isBusinessMode, businessContext });
    text = sanitizePreviewText(text).replace(/^проблема\s*:\s*/i, "");
    const sentences = splitSentences(text);
    if (sentences.length < 2) {
      sentences.push(
        index === 0
          ? "Из-за этого часть пользователей может не дойти до обращения."
          : "В результате клиенту сложнее быстро принять решение и перейти к следующему шагу."
      );
    }
    text = diversifyProblemEnding(sentences.slice(0, 3).join(" "), usedEndings);
    return { title, text };
  });

  const previewRecommendation = {
    title: "Что можно улучшить",
    text: ensurePreviewRecommendationText(pickRecommendationPreview(cards, { isBusinessMode, businessContext }), {
      isBusinessMode,
      businessContext
    })
  };

  const visibleCards = [
    ...previewProblems.map((item, index) => ({
      key: `preview-problem-${index + 1}`,
      title: item.title,
      body: item.text
    })),
    {
      key: "preview-recommendation",
      title: previewRecommendation.title,
      body: previewRecommendation.text
    }
  ];

  const usedBodies = new Set(selectedProblems);
  const hiddenCards = cards.filter((card) => {
    if (card.key !== "problems") return true;
    return extractPreviewProblemItems(card.body).some((item) => !usedBodies.has(item));
  });

  return {
    previewProblems,
    previewRecommendation,
    visibleCards,
    hiddenCards
  };
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

function stripImplementationSection(rawText) {
  const text = (rawText || "").trim();
  if (!text) return "";

  const startMatch = text.match(/\u{1F680}\s*Что стоит внедрить/i);
  if (!startMatch || startMatch.index === undefined) {
    return text;
  }

  const start = startMatch.index;
  const tail = text.slice(start);
  const nextHeader = tail.match(/\n(?:\u{1F4C8}\s*Если коротко|\u{1F6E0}\s*Что мы можем сделать для вас|\u{1F449}\s*Финал:|\u{1F4A1}\s*Хотите внедрить)/iu);
  const end = nextHeader ? start + nextHeader.index : text.length;

  return `${text.slice(0, start).trim()}\n\n${text.slice(end).trim()}`.replace(/\n{3,}/g, "\n\n").trim();
}

function mapPriorityLabel(priority) {
  if (priority === "critical") return "🔥 critical";
  if (priority === "optional") return "➕ optional";
  return "⚡ important";
}

function isValidPhone(contact) {
  const normalized = (contact || "").trim();
  const digits = normalized.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return false;
  return /^\+?[\d\s\-()]+$/.test(normalized);
}

function isValidTelegramUsername(contact) {
  const normalized = (contact || "").trim();
  const username = normalized.startsWith("@") ? normalized.slice(1) : normalized;
  return /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(username);
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
  const [isSolutionTypingDone, setIsSolutionTypingDone] = useState(false);
  const [planCardsVisible, setPlanCardsVisible] = useState(false);
  const [solutionError, setSolutionError] = useState("");

  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadSubmitError, setLeadSubmitError] = useState("");
  const [isFullAnalysisUnlocked, setIsFullAnalysisUnlocked] = useState(false);
  const [isUnlockLoading, setIsUnlockLoading] = useState(false);
  const [unlockLoadingStepIndex, setUnlockLoadingStepIndex] = useState(0);
  const [leadId, setLeadId] = useState(null);
  const [finalCtaStatus, setFinalCtaStatus] = useState("idle");
  const [finalCtaError, setFinalCtaError] = useState("");
  const [leadForm, setLeadForm] = useState({
    name: "",
    contact: "",
    site: ""
  });
  const isBusinessMode = quizAnswers?.hasWebsite === false;
  const analysisModeSubtitle = isBusinessMode
    ? "Найдём, где могут теряться клиенты и что мешает масштабировать продажи"
    : "Найдём ошибки в UX, SEO и конверсии";

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
  const preUnlockPreview = useMemo(
    () =>
      buildPreUnlockPreview(analysisCards, {
        isBusinessMode,
        businessContext: quizAnswers?.niche || ""
      }),
    [analysisCards, isBusinessMode, quizAnswers?.niche]
  );
  const visibleAnalysisCards = useMemo(
    () => (isFullAnalysisUnlocked ? analysisCards : preUnlockPreview.visibleCards),
    [analysisCards, isFullAnalysisUnlocked, preUnlockPreview.visibleCards]
  );
  const hiddenAnalysisCards = useMemo(
    () => (isFullAnalysisUnlocked ? [] : preUnlockPreview.hiddenCards),
    [isFullAnalysisUnlocked, preUnlockPreview.hiddenCards]
  );
  const hiddenBlocksCount = useMemo(
    () => (isFullAnalysisUnlocked ? 0 : preUnlockPreview.hiddenCards.length),
    [isFullAnalysisUnlocked, preUnlockPreview.hiddenCards.length]
  );
  const solutionTextForTypewriter =
    Array.isArray(solutionPlanCards) && solutionPlanCards.length > 0
      ? stripImplementationSection(solutionOfferText)
      : solutionOfferText;
  const hasStructuredPlanCards = Array.isArray(solutionPlanCards) && solutionPlanCards.length > 0;
  const parsedImplementationCards = useMemo(
    () =>
      hasStructuredPlanCards
        ? { beforeBlocks: [], cards: solutionPlanCards, afterBlocks: [] }
        : parseImplementationCards(solutionOfferText),
    [hasStructuredPlanCards, solutionOfferText, solutionPlanCards]
  );

  function resetFinalStages({ preserveLead = false } = {}) {
    setSelectedSiteType("");
    setPlanLoadingStepIndex(0);

    setSolutionStatus("idle");
    setSolutionOfferText("");
    setSolutionPlanCards([]);
    setIsSolutionTypingDone(false);
    setPlanCardsVisible(false);
    setSolutionError("");
    setFinalCtaStatus("idle");
    setFinalCtaError("");

    if (!preserveLead) {
      setShowLeadForm(false);
      setLeadForm({ name: "", contact: "", site: "" });
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedLeadId = window.localStorage.getItem("leadId");
    if (storedLeadId && storedLeadId.trim()) {
      setLeadId(storedLeadId);
    }
  }, []);

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

  useEffect(() => {
    if (!isUnlockLoading) {
      setUnlockLoadingStepIndex(0);
      return undefined;
    }

    const timer = setInterval(() => {
      setUnlockLoadingStepIndex((prev) => Math.min(prev + 1, UNLOCK_LOADING_STEPS.length - 1));
    }, 600);

    return () => clearInterval(timer);
  }, [isUnlockLoading]);

  useEffect(() => {
    if (solutionStatus !== "success" || !parsedImplementationCards) {
      setPlanCardsVisible(false);
      return;
    }

    if (!hasStructuredPlanCards) {
      setPlanCardsVisible(true);
      return;
    }

    setPlanCardsVisible(isSolutionTypingDone);
  }, [solutionStatus, parsedImplementationCards, hasStructuredPlanCards, isSolutionTypingDone]);

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
    setIsFullAnalysisUnlocked(false);

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
    resetFinalStages({ preserveLead: true });
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
      hasWebsite && detectedPlatform && detectedPlatform.platform && detectedPlatform.platform !== "unknown"
        ? detectedPlatform.platform
        : "unknown";
    const siteTypeForPlan = hasWebsite ? platformName : null;
    const hasRepeatSales = quizAnswers?.hasRepeatSales || "unknown";

    if (!fullAnalysis || !lossesText) {
      setSolutionStatus("error");
      setSolutionError("Не хватает данных для персонального предложения.");
      return;
    }

    setSolutionStatus("loading");
    setSolutionOfferText("");
    setSolutionPlanCards([]);
    setIsSolutionTypingDone(false);
    setSolutionError("");
    setShowLeadForm(false);
    const startedAt = Date.now();

    try {
      const response = await createSolutionOffer({
        analysisText: fullAnalysis,
        lossesText,
        siteType: siteTypeForPlan,
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
      setSelectedSiteType(siteTypeForPlan || "unknown");
    } catch (err) {
      setSolutionPlanCards([]);
      setSolutionStatus("error");
      setSolutionError(getFriendlyErrorMessage(err));
    }
  }

  function onOpenLeadForm() {
    setShowLeadForm(true);
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
    const normalizedContact = leadForm.contact?.trim() || "";
    if (!isValidPhone(normalizedContact) && !isValidTelegramUsername(normalizedContact)) {
      setLeadSubmitError("Укажите телефон или Telegram-ник (например, +79991234567 или @username).");
      return;
    }

    setLeadSubmitting(true);
    setLeadSubmitError("");

    try {
      const createdLead = await createLead({
        name: leadForm.name?.trim() || "",
        contact: normalizedContact,
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

      const createdLeadId = createdLead?.id || null;
      setLeadId(createdLeadId);
      if (createdLeadId && typeof window !== "undefined") {
        window.localStorage.setItem("leadId", createdLeadId);
      }
      setIsUnlockLoading(true);
      await wait(1800);
      setIsUnlockLoading(false);
      if (!isFullAnalysisUnlocked) {
        setIsFullAnalysisUnlocked(true);
        if (lossesStatus === "idle") {
          await onEstimateLosses();
        }
      }
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

  function onUnlockAnalysis() {
    onOpenLeadForm();
  }

  async function onFinalCtaClick() {
    if (finalCtaStatus === "loading" || finalCtaStatus === "success") {
      return;
    }

    if (!leadId) {
      setFinalCtaError("Ошибка: не найден ID заявки. Попробуйте обновить страницу");
      return;
    }

    setFinalCtaStatus("loading");
    setFinalCtaError("");

    try {
      await updateLead(leadId, {
        isInterested: true,
        clickedFinalCTA: true,
        intent: "high"
      });
      setFinalCtaStatus("success");
    } catch {
      setFinalCtaStatus("idle");
      setFinalCtaError("Не удалось отправить заявку");
    }
  }

  return (
    <main className="page">
      <section className="shell">
        <header className="hero fade-in">
          <h1>Аудит бизнеса за 30 секунд</h1>
          <p>{analysisModeSubtitle}</p>
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
            <article className="result-card partial-analysis-intro">
              <h2>Мы уже нашли несколько проблем, но это только часть анализа</h2>
            </article>

            {visibleAnalysisCards.map((card) => (
              <article key={`${card.key}-${card.title}`} className="result-card">
                <h2>{card.title}</h2>
                <p>{card.body}</p>
              </article>
            ))}

            {!isFullAnalysisUnlocked && hiddenBlocksCount > 0 && (
              <section className="analysis-lock-card">
                <div className="analysis-fade-overlay" />
                <div className="analysis-blurred-preview">
                  {hiddenAnalysisCards.slice(0, 2).map((card) => (
                    <div key={`hidden-${card.title}`} className="blurred-card-row">
                      <strong>{card.title}</strong>
                      <span>{card.body.slice(0, 120)}...</span>
                    </div>
                  ))}
                </div>
                <div className="analysis-lock-content">
                  <p className="analysis-lock-badge">🔒 Скрыто ещё {hiddenBlocksCount} блоков</p>
                  <h3>
                    {isBusinessMode
                      ? "Мы нашли ещё несколько мест, где могут теряться клиенты и заявки"
                      : "Мы нашли ещё несколько критических ошибок, которые снижают конверсию сайта"}
                  </h3>
                  <p>
                    {isBusinessMode
                      ? "В полном разборе покажем, где теряются заявки, что мешает повторным продажам и какие изменения дадут самый быстрый эффект."
                      : "В полном разборе покажем оставшиеся точки потери клиентов и какие изменения дадут самый быстрый эффект."}
                  </p>
                  <button type="button" className="losses-cta" onClick={onUnlockAnalysis}>
                    Показать полный разбор
                  </button>
                </div>
              </section>
            )}

            {isTyping && <span className="typing-cursor">|</span>}

            {!isFullAnalysisUnlocked && showLeadForm && !isUnlockLoading && (
              <section className="lead-form-wrap fade-slide-in">
                <h3>Открыть полный разбор</h3>
                <p>
                  {isBusinessMode
                    ? "Мы нашли ещё несколько мест, где могут теряться клиенты, заявки и повторные продажи."
                    : "Мы нашли ещё несколько точек, которые могут влиять на количество заявок и повторных клиентов."}
                </p>

                <form className="lead-form" onSubmit={onLeadSubmit}>
                  <label>
                    Telegram или телефон
                    <input
                      type="text"
                      value={leadForm.contact}
                      onChange={(event) => onLeadFieldChange("contact", event.target.value)}
                      placeholder="@username или телефон"
                      required
                    />
                  </label>

                  <button type="submit" className="lead-submit-btn">
                    {leadSubmitting ? "Отправляем..." : "Показать полный анализ"}
                  </button>
                </form>

                {leadSubmitError && <p className="lead-error">{leadSubmitError}</p>}
              </section>
            )}

            {!isFullAnalysisUnlocked && showLeadForm && isUnlockLoading && (
              <section className="unlock-loading-wrap fade-slide-in" aria-live="polite">
                {UNLOCK_LOADING_STEPS.map((step, index) => (
                  <p key={step} className={`unlock-loading-step ${index <= unlockLoadingStepIndex ? "visible" : ""}`}>
                    {step}
                  </p>
                ))}
              </section>
            )}

            {(isFullAnalysisUnlocked || hiddenBlocksCount === 0) && (
              <div className="losses-cta-wrap">
                <button
                  type="button"
                  className="losses-cta"
                  onClick={onEstimateLosses}
                  disabled={lossesStatus === "loading" || lossesStatus === "success"}
                >
                  Да, хочу узнать, что я теряю
                </button>
              </div>
            )}

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
                <p>
                  {isBusinessMode
                    ? "Собираем ответы и подбираем решение под ваши продажи и обработку клиентов"
                    : "Собираем ответы, анализ сайта и подбираем решение под ваш бизнес"}
                </p>
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
                <TypewriterText
                  text={solutionTextForTypewriter}
                  enabled={solutionStatus === "success"}
                  className="structured-text"
                  onComplete={() => setIsSolutionTypingDone(true)}
                />
                {parsedImplementationCards ? (
                  <div
                    className={`plan-cards-layout ${planCardsVisible ? "plan-cards-reveal" : "plan-cards-hidden"}`}
                  >
                    {parsedImplementationCards.beforeBlocks.map((block) => (
                      <p key={`before-${block}`} className="structured-text">
                        {block}
                      </p>
                    ))}

                    <section className="plan-cards-section">
                      <h3>🚀 Что стоит внедрить</h3>
                      {parsedImplementationCards.cards.map((card, index) => (
                        <div
                          key={`${card.problem}-${index}`}
                          className="plan-card"
                          style={{ animationDelay: `${index * 0.14}s` }}
                        >
                          <div className="plan-card-priority">{mapPriorityLabel(card.priority)}</div>
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
                ) : null}

                {isFullAnalysisUnlocked ? (
                  <FinalCTA
                    status={finalCtaStatus}
                    onClick={onFinalCtaClick}
                    onRetry={onFinalCtaClick}
                    error={finalCtaError}
                    telegramUrl={import.meta.env.VITE_TELEGRAM_URL || ""}
                  />
                ) : null}
              </article>
            )}
          </section>
        )}
      </section>
    </main>
  );
}


