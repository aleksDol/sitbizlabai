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
