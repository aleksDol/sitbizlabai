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
  { id: "business", label: "РЎС‡РёС‚С‹РІР°РµРј РґР°РЅРЅС‹Рµ Р±РёР·РЅРµСЃР°", requiresWebsite: false },
  { id: "site", label: "РџСЂРѕРІРµСЂСЏРµРј СЃР°Р№С‚ Рё СЃС‚СЂСѓРєС‚СѓСЂСѓ", requiresWebsite: true },
  { id: "platform", label: "РћРїСЂРµРґРµР»СЏРµРј РїР»Р°С‚С„РѕСЂРјСѓ СЃР°Р№С‚Р°", requiresWebsite: true },
  { id: "channels", label: "РћС†РµРЅРёРІР°РµРј РєР°РЅР°Р»С‹ РїСЂРёРІР»РµС‡РµРЅРёСЏ", requiresWebsite: false },
  { id: "losses", label: "РС‰РµРј РїРѕС‚РµСЂРё РІ РІРѕСЂРѕРЅРєРµ", requiresWebsite: false },
  { id: "plan", label: "Р¤РѕСЂРјРёСЂСѓРµРј РїР»Р°РЅ СЂРµР°Р»РёР·Р°С†РёРё", requiresWebsite: false }
];

const SECTION_MAPPERS = [
  { key: "score", label: "РћР±С‰Р°СЏ РѕС†РµРЅРєР°", match: ["РѕР±С‰Р°СЏ РѕС†РµРЅРєР°"] },
  { key: "problems", label: "РџСЂРѕР±Р»РµРјС‹", match: ["РіР»Р°РІРЅС‹Рµ РїСЂРѕР±Р»РµРјС‹", "РїСЂРѕР±Р»РµРјС‹"] },
  { key: "strengths", label: "РЎРёР»СЊРЅС‹Рµ СЃС‚РѕСЂРѕРЅС‹", match: ["СЃРёР»СЊРЅС‹Рµ СЃС‚РѕСЂРѕРЅС‹"] },
  { key: "recommendations", label: "Р РµРєРѕРјРµРЅРґР°С†РёРё", match: ["РєР°Рє СѓР»СѓС‡С€РёС‚СЊ", "СЂРµРєРѕРјРµРЅРґР°С†РёРё"] },
  { key: "speed", label: "РЎРєРѕСЂРѕСЃС‚СЊ СЃР°Р№С‚Р°", match: ["СЃРєРѕСЂРѕСЃС‚СЊ СЃР°Р№С‚Р°", "СЃРєРѕСЂРѕСЃС‚СЊ"] }
];

const PLAN_LOADING_STEPS = [
  "РЈС‡РёС‚С‹РІР°РµРј РЅРёС€Сѓ Рё РєР°РЅР°Р»С‹ РїСЂРёРІР»РµС‡РµРЅРёСЏ",
  "РџСЂРѕРІРµСЂСЏРµРј РґР°РЅРЅС‹Рµ РїРѕ СЃР°Р№С‚Сѓ",
  "РџРѕРґР±РёСЂР°РµРј РїРѕРґС…РѕРґСЏС‰РёРµ СЂРµС€РµРЅРёСЏ",
  "Р¤РѕСЂРјРёСЂСѓРµРј РїРѕРЅСЏС‚РЅС‹Р№ РїР»Р°РЅ"
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
    return [{ key: "other", title: "Р РµР·СѓР»СЊС‚Р°С‚ Р°РЅР°Р»РёР·Р°", body: source }];
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
      body: body || "Р‘РµР· РґРµС‚Р°Р»РµР№"
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

  const headerMatch = text.match(/рџљЂ\s*Р§С‚Рѕ СЃС‚РѕРёС‚ РІРЅРµРґСЂРёС‚СЊ/i);
  if (!headerMatch || headerMatch.index === undefined) return null;

  const sectionStart = headerMatch.index;
  const tail = text.slice(sectionStart);
  const nextHeaderMatch = tail.match(/\n(?:рџ“€\s*Р•СЃР»Рё РєРѕСЂРѕС‚РєРѕ|рџ› \s*Р§С‚Рѕ РјС‹ РјРѕР¶РµРј СЃРґРµР»Р°С‚СЊ РґР»СЏ РІР°СЃ|рџ‘‰\s*Р¤РёРЅР°Р»:|рџ’Ў\s*РҐРѕС‚РёС‚Рµ РІРЅРµРґСЂРёС‚СЊ)/i);
  const sectionEnd = nextHeaderMatch ? sectionStart + nextHeaderMatch.index : text.length;

  const before = text.slice(0, sectionStart).trim();
  const section = text.slice(sectionStart, sectionEnd).trim();
  const after = text.slice(sectionEnd).trim();

  const chunks = section.split(/РџСЂРѕР±Р»РµРјР°:/i).slice(1);
  if (chunks.length === 0) return null;

  const cards = [];
  for (const chunk of chunks) {
    const solutionSplit = chunk.split(/Р РµС€РµРЅРёРµ:/i);
    if (solutionSplit.length < 2) return null;

    const problem = solutionSplit[0].trim();
    const solutionAndResult = solutionSplit.slice(1).join("Р РµС€РµРЅРёРµ:").trim();

    const resultSplit = solutionAndResult.split(/(?:Р§С‚Рѕ РїРѕР»СѓС‡РёС‚ Р±РёР·РЅРµСЃ|Р РµР·СѓР»СЊС‚Р°С‚):/i);
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

  const lines = text.split("\n");
  const resultLines = [];
  let skipMode = false;

  const isSectionStart = (line) => {
    const value = line.trim().toLowerCase();
    return (
      value.startsWith("🚀") ||
      value.startsWith("🛠") ||
      value.includes("что стоит внедрить") ||
      value.includes("что стоит реализовать") ||
      value.includes("что мы можем сделать для вас")
    );
  };

  const isNextKnownSection = (line) => {
    const value = line.trim().toLowerCase();
    return value.startsWith("📊") || value.startsWith("⚠️") || value.startsWith("📈");
  };

  const isDuplicateCtaLine = (line) => {
    const value = line.trim().toLowerCase();
    return (
      value.includes("призыв к действию") ||
      value.includes("готовы увеличить") ||
      value.includes("оставьте контакты") ||
      value.includes("напишите нам")
    );
  };

  for (const line of lines) {
    if (!skipMode && isSectionStart(line)) {
      skipMode = true;
      continue;
    }

    if (skipMode) {
      if (isNextKnownSection(line)) {
        skipMode = false;
      } else {
        continue;
      }
    }

    if (!isDuplicateCtaLine(line)) {
      resultLines.push(line);
    }
  }

  return resultLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function mapPriorityLabel(priority) {
  if (priority === "critical") return "рџ”Ґ critical";
  if (priority === "optional") return "вћ• optional";
  return "вљЎ important";
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
  const [planCardsVisible, setPlanCardsVisible] = useState(false);
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
  } = useTypewriter(
    Array.isArray(solutionPlanCards) && solutionPlanCards.length > 0
      ? stripImplementationSection(solutionOfferText)
      : solutionOfferText,
    solutionStatus === "success"
  );
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
    setPlanCardsVisible(false);
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

  useEffect(() => {
    if (solutionStatus !== "success" || !parsedImplementationCards) {
      setPlanCardsVisible(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      setPlanCardsVisible(true);
    }, 600);

    return () => clearTimeout(timer);
  }, [solutionStatus, parsedImplementationCards]);

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
      setLossesError("РќРµ СѓРґР°Р»РѕСЃСЊ РІС‹РґРµР»РёС‚СЊ РїСЂРѕР±Р»РµРјС‹ РґР»СЏ СЂР°СЃС‡С‘С‚Р° РїРѕС‚РµСЂСЊ.");
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
      setLossesText(response?.losses || "РќРµ СѓРґР°Р»РѕСЃСЊ СЂР°СЃСЃС‡РёС‚Р°С‚СЊ РїРѕС‚РµСЂРё. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·.");
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
      setSolutionError("РќРµ С…РІР°С‚Р°РµС‚ РґР°РЅРЅС‹С… РґР»СЏ РїРµСЂСЃРѕРЅР°Р»СЊРЅРѕРіРѕ РїСЂРµРґР»РѕР¶РµРЅРёСЏ.");
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
        response?.solutionOfferText || "РќРµ СѓРґР°Р»РѕСЃСЊ СЃС„РѕСЂРјРёСЂРѕРІР°С‚СЊ РїСЂРµРґР»РѕР¶РµРЅРёРµ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·."
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
        err instanceof Error && err.message ? err.message : "РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ Р·Р°СЏРІРєСѓ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·."
      );
    } finally {
      setLeadSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="shell">
        <header className="hero fade-in">
          <h1>РђСѓРґРёС‚ Р±РёР·РЅРµСЃР° Р·Р° 30 СЃРµРєСѓРЅРґ</h1>
          <p>РќР°Р№РґС‘Рј РѕС€РёР±РєРё РІ UX, SEO Рё РєРѕРЅРІРµСЂСЃРёРё</p>
        </header>

        {!isQuizCompleted && <AnalyzerQuiz onComplete={onQuizComplete} />}

        {isQuizCompleted && (
          <section className="quiz-summary fade-slide-in">
            <p>{quizAnswers?.hasWebsite ? "Р—Р°РїСѓСЃРєР°РµРј Р°РЅР°Р»РёР· СЃР°Р№С‚Р°..." : "Р—Р°РїСѓСЃРєР°РµРј Р°РЅР°Р»РёР· Р±РёР·РЅРµСЃР°..."}</p>
          </section>
        )}

        {status === "loading" && (
          <AnalysisProgress steps={analysisSteps} activeStep={activeStep} progress={progress} />
        )}

        {status === "error" && (
          <section className="error-box fade-in delay-2">
            <p>{error}</p>
            <button type="button" className="retry-btn" onClick={onRetry}>
              РџРѕРїСЂРѕР±РѕРІР°С‚СЊ СЃРЅРѕРІР°
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
                Р”Р°, С…РѕС‡Сѓ СѓР·РЅР°С‚СЊ, С‡С‚Рѕ СЏ С‚РµСЂСЏСЋ
              </button>
            </div>

            {lossesStatus === "loading" && <section className="losses-loading">РЎС‡РёС‚Р°РµРј РїРѕС‚РµСЂРё...</section>}

            {lossesStatus === "error" && (
              <section className="error-box">
                <p>{lossesError || "РќРµ СѓРґР°Р»РѕСЃСЊ СЂР°СЃСЃС‡РёС‚Р°С‚СЊ РїРѕС‚РµСЂРё. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·."}</p>
              </section>
            )}

            {lossesStatus === "success" && (
              <article className="result-card losses-card">
                <h2>рџ’ё Р§С‚Рѕ РІС‹ С‚РµСЂСЏРµС‚Рµ</h2>
                <TypewriterText text={lossesText} enabled={lossesStatus === "success"} />
              </article>
            )}

            {lossesStatus === "success" && (
              <section className="plan-cta-wrap">
                <h3>Р”Р°РІР°Р№С‚Рµ РѕР±СЃСѓРґРёРј РїР»Р°РЅ СЂРµР°Р»РёР·Р°С†РёРё</h3>
                <button type="button" className="plan-open-btn" onClick={onOpenPlanStep}>
                  Р”Р°, РґР°РІР°Р№С‚Рµ
                </button>
              </section>
            )}

            {solutionStatus === "loading" && (
              <section className="plan-loading fade-slide-in">
                <h3>Р“РѕС‚РѕРІРёРј РїР»Р°РЅ СЂРµР°Р»РёР·Р°С†РёРё</h3>
                <p>РЎРѕР±РёСЂР°РµРј РѕС‚РІРµС‚С‹, Р°РЅР°Р»РёР· СЃР°Р№С‚Р° Рё РїРѕРґР±РёСЂР°РµРј СЂРµС€РµРЅРёРµ РїРѕРґ РІР°С€ Р±РёР·РЅРµСЃ</p>
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
                <p>{solutionError || "РќРµ СѓРґР°Р»РѕСЃСЊ СЃС„РѕСЂРјРёСЂРѕРІР°С‚СЊ РїР»Р°РЅ СЂРµР°Р»РёР·Р°С†РёРё. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·."}</p>
              </section>
            )}

            {solutionStatus === "success" && (
              <article className="result-card solution-card">
                <h2>рџљЂ РџР»Р°РЅ СЂРµР°Р»РёР·Р°С†РёРё</h2>
                <>
                  <p className="structured-text">{typedSolutionText}</p>
                  {isTypingSolution && <span className="typing-cursor">|</span>}
                </>
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
                      <h3>рџљЂ Р§С‚Рѕ СЃС‚РѕРёС‚ РІРЅРµРґСЂРёС‚СЊ</h3>
                      {parsedImplementationCards.cards.map((card, index) => (
                        <div
                          key={`${card.problem}-${index}`}
                          className="plan-card"
                          style={{ animationDelay: `${index * 0.14}s` }}
                        >
                          <div className="plan-card-priority">{mapPriorityLabel(card.priority)}</div>
                          <div className="card-problem">
                            рџ”ґ РџСЂРѕР±Р»РµРјР°
                            <br />
                            {card.problem}
                          </div>
                          <div className="card-solution">
                            рџ”µ Р РµС€РµРЅРёРµ
                            <br />
                            {card.solution}
                          </div>
                          <div className="card-result">
                            рџџў Р РµР·СѓР»СЊС‚Р°С‚
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

                <button type="button" className="implement-cta" onClick={onOpenLeadForm}>
                  Р”Р°, РґР°РІР°Р№С‚Рµ СЂРµР°Р»РёР·СѓРµРј
                </button>

                {showLeadForm && (
                  <section className="lead-form-wrap fade-slide-in">
                    <h3>РҐРѕС‚РёС‚Рµ РІРЅРµРґСЂРёС‚СЊ СЌС‚Рѕ Сѓ СЃРµР±СЏ?</h3>
                    <p>
                      РћСЃС‚Р°РІСЊС‚Рµ РєРѕРЅС‚Р°РєС‚С‹ вЂ” РјС‹ СЂР°Р·Р±РµСЂС‘Рј РІР°С€Сѓ СЃРёС‚СѓР°С†РёСЋ Рё РїРѕРєР°Р¶РµРј, РєР°Рє СЃРѕР±СЂР°С‚СЊ РїРѕРЅСЏС‚РЅСѓСЋ СЃРёСЃС‚РµРјСѓ РїРѕРґ РІР°С€
                      Р±РёР·РЅРµСЃ: СЃР°Р№С‚, Р·Р°СЏРІРєРё, Р°РЅР°Р»РёС‚РёРєСѓ Рё РїРѕРІС‚РѕСЂРЅС‹Рµ РєР°СЃР°РЅРёСЏ.
                    </p>

                    <form className="lead-form" onSubmit={onLeadSubmit}>
                      <label>
                        РРјСЏ
                        <input
                          type="text"
                          value={leadForm.name}
                          onChange={(event) => onLeadFieldChange("name", event.target.value)}
                          required
                        />
                      </label>

                      <label>
                        РљРѕРЅС‚Р°РєС‚ (Telegram РёР»Рё Email)
                        <input
                          type="text"
                          value={leadForm.contact}
                          onChange={(event) => onLeadFieldChange("contact", event.target.value)}
                          required
                        />
                      </label>

                      <label>
                        РЎР°Р№С‚
                        <input
                          type="url"
                          value={leadForm.site}
                          onChange={(event) => onLeadFieldChange("site", event.target.value)}
                          required={Boolean(quizAnswers?.hasWebsite)}
                        />
                      </label>

                      <button type="submit" className="lead-submit-btn">
                        {leadSubmitting ? "РћС‚РїСЂР°РІР»СЏРµРј..." : "РћС‚РїСЂР°РІРёС‚СЊ"}
                      </button>
                    </form>

                    {leadSubmitError && <p className="lead-error">{leadSubmitError}</p>}
                    {leadSubmitted && (
                      <p className="lead-success">РЎРїР°СЃРёР±Рѕ! РњС‹ СЃРІСЏР¶РµРјСЃСЏ СЃ РІР°РјРё Рё РѕР±СЃСѓРґРёРј СЂРµР°Р»РёР·Р°С†РёСЋ.</p>
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
