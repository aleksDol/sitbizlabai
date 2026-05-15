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
  const businessDescriptionRaw = payload?.businessDescription;
  const websiteUrlRaw = payload?.websiteUrl;

  const niche = typeof nicheRaw === "string" ? nicheRaw.trim() : null;
  const businessDescription =
    typeof businessDescriptionRaw === "string" ? businessDescriptionRaw.trim() : null;
  const websiteUrl = typeof websiteUrlRaw === "string" ? websiteUrlRaw.trim() : null;
  const hasWebsite = payload?.hasWebsite === true;
  const channels = Array.isArray(payload?.channels)
    ? payload.channels.filter((item) => typeof item === "string")
    : [];
  const hasRepeatSales =
    typeof payload?.hasRepeatSales === "string" ? payload.hasRepeatSales.trim() : "unknown";
  const trafficSource = typeof payload?.trafficSource === "string" ? payload.trafficSource.trim() : null;
  const mainGoal = typeof payload?.mainGoal === "string" ? payload.mainGoal.trim() : null;
  const mainPain = typeof payload?.mainPain === "string" ? payload.mainPain.trim() : null;
  const communicationMethod =
    typeof payload?.communicationMethod === "string" ? payload.communicationMethod.trim() : null;
  const contact = typeof payload?.contact === "string" ? payload.contact.trim() : null;

  if (nicheRaw !== null && nicheRaw !== undefined && typeof nicheRaw !== "string") {
    throw new HttpError(400, ERROR_CODES.INVALID_BODY, "Поле niche должно быть строкой или null.");
  }

  if (businessDescriptionRaw !== null && businessDescriptionRaw !== undefined && typeof businessDescriptionRaw !== "string") {
    throw new HttpError(400, ERROR_CODES.INVALID_BODY, "Поле businessDescription должно быть строкой или null.");
  }

  if (websiteUrlRaw !== null && websiteUrlRaw !== undefined && typeof websiteUrlRaw !== "string") {
    throw new HttpError(400, ERROR_CODES.INVALID_BODY, "Поле websiteUrl должно быть строкой или null.");
  }

  if (hasWebsite && !websiteUrl) {
    throw new HttpError(400, ERROR_CODES.INVALID_BODY, "Для сценария с сайтом передайте websiteUrl.");
  }

  if (!hasWebsite && !niche && !businessDescription) {
    throw new HttpError(400, ERROR_CODES.INVALID_BODY, "Для сценария без сайта передайте niche или businessDescription.");
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

  const normalizedMainPain = mainPain || mainGoal || null;
  const normalizedCommunicationMethod = communicationMethod || trafficSource || null;
  const normalizedBusinessDescription = businessDescription || niche || null;

  return {
    niche: hasWebsite ? null : normalizedBusinessDescription,
    websiteUrl: hasWebsite ? websiteUrl : null,
    hasWebsite,
    channels,
    hasRepeatSales: ["yes", "no", "unknown"].includes(hasRepeatSales) ? hasRepeatSales : "unknown",
    trafficSource: normalizedCommunicationMethod,
    mainGoal: normalizedMainPain,
    businessDescription: normalizedBusinessDescription,
    mainPain: normalizedMainPain,
    communicationMethod: normalizedCommunicationMethod,
    contact: contact || null
  };
}
