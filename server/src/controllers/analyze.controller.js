import { ERROR_CODES } from "../config/error.constants.js";
import { analyzeBusinessWithoutWebsite, analyzeSite } from "../services/analyze.service.js";
import {
  fetchBusinessLosses,
  fetchBusinessLossesFromAnalysisText,
  fetchImplementationPlanFromContext,
  fetchSolutionOfferFromContext
} from "../services/openai-analysis.service.js";
import { HttpError } from "../utils/http-error.js";
import { validateAnalysisInput, validateAnalyzePayload } from "../validators/url.validator.js";

const LOSSES_FALLBACK_TEXT = "Не удалось рассчитать потери. Попробуйте еще раз.";
const IMPLEMENTATION_PLAN_FALLBACK_TEXT =
  "Не удалось сформировать план реализации. Попробуйте еще раз.";
const SOLUTION_OFFER_FALLBACK_TEXT = "Не удалось сформировать предложение. Попробуйте еще раз.";

export async function analyzeController(req, res, next) {
  try {
    const inputPayload = req.body?.analysisInput;

    if (inputPayload && typeof inputPayload === "object") {
      const analysisInput = validateAnalysisInput(inputPayload);

      if (analysisInput.hasWebsite && analysisInput.websiteUrl) {
        const parsedUrl = validateAnalyzePayload({ url: analysisInput.websiteUrl });
        const result = await analyzeSite(parsedUrl, analysisInput);
        return res.status(200).json(result);
      }

      const result = await analyzeBusinessWithoutWebsite(analysisInput);
      return res.status(200).json(result);
    }

    const parsedUrl = validateAnalyzePayload(req.body);
    const result = await analyzeSite(parsedUrl);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

// Existing endpoint kept for backward compatibility with current UI.
export async function lossesController(req, res, next) {
  try {
    const analysisProblems = req.body?.analysisProblems;
    const inputPayload = req.body?.analysisInput;

    if (!analysisProblems || typeof analysisProblems !== "string" || !analysisProblems.trim()) {
      throw new HttpError(
        400,
        ERROR_CODES.INVALID_BODY,
        "Не удалось получить список проблем для оценки потерь."
      );
    }

    const analysisInput =
      inputPayload && typeof inputPayload === "object"
        ? {
            niche: typeof inputPayload.niche === "string" ? inputPayload.niche.trim() : null,
            websiteUrl: typeof inputPayload.websiteUrl === "string" ? inputPayload.websiteUrl.trim() : null,
            hasWebsite: inputPayload.hasWebsite === true,
            channels: Array.isArray(inputPayload.channels)
              ? inputPayload.channels.filter((item) => typeof item === "string")
              : [],
            hasRepeatSales:
              typeof inputPayload.hasRepeatSales === "string" ? inputPayload.hasRepeatSales : "unknown"
          }
        : null;

    const losses = await fetchBusinessLosses(analysisProblems.trim(), analysisInput);
    res.status(200).json({ losses });
  } catch (error) {
    next(error);
  }
}

export async function analyzeLossesController(req, res) {
  const analysisText = req.body?.analysisText;

  if (!analysisText || typeof analysisText !== "string" || !analysisText.trim()) {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.INVALID_BODY,
        message: "Передайте analysisText с результатами анализа сайта."
      }
    });
  }

  try {
    const lossesText = await fetchBusinessLossesFromAnalysisText(analysisText.trim());
    return res.status(200).json({ lossesText });
  } catch {
    return res.status(200).json({ lossesText: LOSSES_FALLBACK_TEXT });
  }
}

export async function implementationPlanController(req, res) {
  const analysisText = req.body?.analysisText;
  const lossesText = req.body?.lossesText;
  const siteType = req.body?.siteType;
  const niche = req.body?.niche;
  const hasWebsite = req.body?.hasWebsite;
  const channels = req.body?.channels;
  const leadsPerMonth = req.body?.leadsPerMonth;
  const hasRepeatSales = req.body?.hasRepeatSales;

  if (!analysisText || typeof analysisText !== "string" || !analysisText.trim()) {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.INVALID_BODY,
        message: "Передайте analysisText с результатами анализа сайта."
      }
    });
  }

  if (!lossesText || typeof lossesText !== "string" || !lossesText.trim()) {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.INVALID_BODY,
        message: "Передайте lossesText с блоком потерь."
      }
    });
  }

  const normalizedHasWebsite = typeof hasWebsite === "boolean" ? hasWebsite : true;
  const normalizedChannels = Array.isArray(channels)
    ? channels.filter((item) => typeof item === "string")
    : [];
  const normalizedHasRepeatSales = typeof hasRepeatSales === "string" ? hasRepeatSales : "";
  const normalizedNiche = typeof niche === "string" ? niche : "";
  const normalizedLeadsPerMonth = typeof leadsPerMonth === "string" ? leadsPerMonth : "";

  try {
    const planText = await fetchImplementationPlanFromContext({
      analysisText: analysisText.trim(),
      lossesText: lossesText.trim(),
      siteType: typeof siteType === "string" && siteType.trim() ? siteType.trim() : "unknown",
      niche: normalizedNiche,
      hasWebsite: normalizedHasWebsite,
      channels: normalizedChannels,
      leadsPerMonth: normalizedLeadsPerMonth,
      hasRepeatSales: normalizedHasRepeatSales
    });

    return res.status(200).json({ planText });
  } catch {
    return res.status(200).json({ planText: IMPLEMENTATION_PLAN_FALLBACK_TEXT });
  }
}

export async function solutionOfferController(req, res) {
  const analysisText = req.body?.analysisText;
  const lossesText = req.body?.lossesText;
  const siteType = req.body?.siteType;
  const niche = req.body?.niche;
  const hasWebsite = req.body?.hasWebsite;
  const websiteUrl = req.body?.websiteUrl;
  const channels = req.body?.channels;
  const detectedPlatform = req.body?.detectedPlatform;
  const leadsPerMonth = req.body?.leadsPerMonth;
  const hasRepeatSales = req.body?.hasRepeatSales;
  const trafficSources = req.body?.trafficSources;

  if (!analysisText || typeof analysisText !== "string" || !analysisText.trim()) {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.INVALID_BODY,
        message: "Передайте analysisText с результатами анализа."
      }
    });
  }

  if (!lossesText || typeof lossesText !== "string" || !lossesText.trim()) {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.INVALID_BODY,
        message: "Передайте lossesText с блоком потерь."
      }
    });
  }

  try {
    const normalizedHasWebsite = typeof hasWebsite === "boolean" ? hasWebsite : true;
    const normalizedChannels = Array.isArray(channels)
      ? channels.filter((item) => typeof item === "string")
      : [];
    const normalizedNiche = typeof niche === "string" ? niche : "";
    const normalizedWebsiteUrl = typeof websiteUrl === "string" && websiteUrl.trim() ? websiteUrl.trim() : null;
    const normalizedDetectedPlatform =
      detectedPlatform && typeof detectedPlatform === "object" ? detectedPlatform : null;
    const normalizedSiteType = normalizedHasWebsite
      ? typeof siteType === "string" && siteType.trim()
        ? siteType.trim()
        : "unknown"
      : "unknown";
    const normalizedLeadsPerMonth = typeof leadsPerMonth === "string" ? leadsPerMonth : "";
    const normalizedHasRepeatSales =
      hasRepeatSales === true
        ? "yes"
        : hasRepeatSales === false
          ? "no"
          : typeof hasRepeatSales === "string" && ["yes", "no", "unknown"].includes(hasRepeatSales)
            ? hasRepeatSales
            : "unknown";
    const normalizedTrafficSources = ["single", "multiple"].includes(trafficSources)
      ? trafficSources
      : normalizedChannels.length > 1
        ? "multiple"
        : "single";

    const solutionPayload = await fetchSolutionOfferFromContext({
      analysisText: analysisText.trim(),
      lossesText: lossesText.trim(),
      siteType: normalizedSiteType,
      niche: normalizedNiche,
      hasWebsite: normalizedHasWebsite,
      websiteUrl: normalizedWebsiteUrl,
      detectedPlatform: normalizedDetectedPlatform,
      channels: normalizedChannels,
      leadsPerMonth: normalizedLeadsPerMonth,
      hasRepeatSales: normalizedHasRepeatSales,
      trafficSources: normalizedTrafficSources
    });

    return res.status(200).json({
      solutionOfferText: solutionPayload?.solutionOfferText || SOLUTION_OFFER_FALLBACK_TEXT,
      planCards: Array.isArray(solutionPayload?.planCards) ? solutionPayload.planCards : []
    });
  } catch {
    return res.status(200).json({
      solutionOfferText: SOLUTION_OFFER_FALLBACK_TEXT,
      planCards: []
    });
  }
}
