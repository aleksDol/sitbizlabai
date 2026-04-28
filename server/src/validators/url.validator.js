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
  const niche = typeof payload?.niche === "string" ? payload.niche.trim() : "";
  const websiteUrl = typeof payload?.websiteUrl === "string" ? payload.websiteUrl.trim() : "";
  const hasWebsite = payload?.hasWebsite === true;
  const channels = Array.isArray(payload?.channels) ? payload.channels.filter((item) => typeof item === "string") : [];
  const hasRepeatSales = typeof payload?.hasRepeatSales === "string" ? payload.hasRepeatSales.trim() : "";
  const leadsPerMonth = typeof payload?.leadsPerMonth === "string" ? payload.leadsPerMonth.trim() : "";

  if (!niche) {
    throw new HttpError(400, ERROR_CODES.INVALID_BODY, "Поле niche обязательно.");
  }

  if (hasWebsite && !websiteUrl) {
    throw new HttpError(400, ERROR_CODES.INVALID_BODY, "Для сценария с сайтом передайте websiteUrl.");
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
    niche,
    websiteUrl: hasWebsite ? websiteUrl : "",
    hasWebsite,
    channels,
    hasRepeatSales,
    leadsPerMonth
  };
}
