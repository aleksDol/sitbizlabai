import { ERROR_CODES, ERROR_MESSAGES } from "../config/error.constants.js";
import { HttpError } from "../utils/http-error.js";

export function validateAnalyzePayload(payload) {
  const url = payload?.url;

  if (!url || typeof url !== "string") {
    throw new HttpError(400, ERROR_CODES.INVALID_URL, ERROR_MESSAGES.INVALID_URL_REQUIRED);
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new HttpError(400, ERROR_CODES.INVALID_URL, ERROR_MESSAGES.INVALID_URL_FORMAT);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new HttpError(400, ERROR_CODES.INVALID_URL, ERROR_MESSAGES.INVALID_URL_PROTOCOL);
  }

  return parsed;
}

export function validateAnalysisInput(payload) {
  const nicheRaw = payload?.niche;
  const websiteUrlRaw = payload?.websiteUrl;

  const niche = typeof nicheRaw === "string" ? nicheRaw.trim() : null;
  const websiteUrl = typeof websiteUrlRaw === "string" ? websiteUrlRaw.trim() : null;
  const hasWebsite = payload?.hasWebsite === true;
  const channels = Array.isArray(payload?.channels)
    ? payload.channels.filter((item) => typeof item === "string")
    : [];
  const hasRepeatSales =
    typeof payload?.hasRepeatSales === "string" ? payload.hasRepeatSales.trim() : "unknown";

  if (nicheRaw !== null && nicheRaw !== undefined && typeof nicheRaw !== "string") {
    throw new HttpError(400, ERROR_CODES.INVALID_BODY, "Поле niche должно быть строкой или null.");
  }

  if (websiteUrlRaw !== null && websiteUrlRaw !== undefined && typeof websiteUrlRaw !== "string") {
    throw new HttpError(400, ERROR_CODES.INVALID_BODY, "Поле websiteUrl должно быть строкой или null.");
  }

  if (hasWebsite && !websiteUrl) {
    throw new HttpError(400, ERROR_CODES.INVALID_BODY, "Для сценария с сайтом передайте websiteUrl.");
  }

  if (!hasWebsite && !niche) {
    throw new HttpError(400, ERROR_CODES.INVALID_BODY, "Для сценария без сайта передайте niche.");
  }

  if (hasWebsite && websiteUrl) {
    try {
      const parsed = new URL(websiteUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("invalid-protocol");
      }
    } catch {
      throw new HttpError(400, ERROR_CODES.INVALID_URL, ERROR_MESSAGES.INVALID_URL_FORMAT);
    }
  }

  return {
    niche: hasWebsite ? null : niche,
    websiteUrl: hasWebsite ? websiteUrl : null,
    hasWebsite,
    channels,
    hasRepeatSales: ["yes", "no", "unknown"].includes(hasRepeatSales)
      ? hasRepeatSales
      : "unknown"
  };
}

