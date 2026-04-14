import { ERROR_CODES } from "../config/error.constants.js";
import { analyzeSite } from "../services/analyze.service.js";
import {
  fetchBusinessLosses,
  fetchBusinessLossesFromAnalysisText,
  fetchImplementationPlanFromContext,
  fetchSolutionOfferFromContext
} from "../services/openai-analysis.service.js";
import { HttpError } from "../utils/http-error.js";
import { validateAnalyzePayload } from "../validators/url.validator.js";

const LOSSES_FALLBACK_TEXT = "Не удалось рассчитать потери. Попробуйте ещё раз.";
const IMPLEMENTATION_PLAN_FALLBACK_TEXT =
  "Не удалось сформировать план реализации. Попробуйте ещё раз.";
const SOLUTION_OFFER_FALLBACK_TEXT = "Не удалось сформировать предложение. Попробуйте ещё раз.";

export async function analyzeController(req, res, next) {
  try {
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

    if (!analysisProblems || typeof analysisProblems !== "string" || !analysisProblems.trim()) {
      throw new HttpError(
        400,
        ERROR_CODES.INVALID_BODY,
        "Не удалось получить список проблем для оценки потерь."
      );
    }

    const losses = await fetchBusinessLosses(analysisProblems.trim());
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

  if (!["builder", "custom", "unknown"].includes(siteType)) {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.INVALID_BODY,
        message: "Передайте корректный siteType: builder, custom или unknown."
      }
    });
  }

  try {
    const planText = await fetchImplementationPlanFromContext({
      analysisText: analysisText.trim(),
      lossesText: lossesText.trim(),
      siteType
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
  const hasRepeatSales = req.body?.hasRepeatSales;
  const trafficSources = req.body?.trafficSources;

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

  if (!["builder", "custom", "unknown"].includes(siteType)) {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.INVALID_BODY,
        message: "Передайте корректный siteType: builder, custom или unknown."
      }
    });
  }

  if (typeof hasRepeatSales !== "boolean") {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.INVALID_BODY,
        message: "Передайте hasRepeatSales как boolean."
      }
    });
  }

  if (!["single", "multiple"].includes(trafficSources)) {
    return res.status(400).json({
      error: {
        code: ERROR_CODES.INVALID_BODY,
        message: "Передайте корректный trafficSources: single или multiple."
      }
    });
  }

  try {
    const solutionOfferText = await fetchSolutionOfferFromContext({
      analysisText: analysisText.trim(),
      lossesText: lossesText.trim(),
      siteType,
      hasRepeatSales,
      trafficSources
    });

    return res.status(200).json({ solutionOfferText });
  } catch {
    return res.status(200).json({ solutionOfferText: SOLUTION_OFFER_FALLBACK_TEXT });
  }
}
