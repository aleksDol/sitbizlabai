import axios from "axios";
import * as cheerio from "cheerio";
import {
  MAX_TEXT_LENGTH,
  REQUEST_TIMEOUT_MS,
  SITE_FETCH_USER_AGENT
} from "../config/analyze.constants.js";
import { ERROR_CODES, ERROR_MESSAGES } from "../config/error.constants.js";
import { HttpError } from "../utils/http-error.js";
import { normalizeText, toArrayWithFallback } from "../utils/text.utils.js";
import { detectPlatform } from "./platform-detector.service.js";

const SITE_FETCH_RETRY_ATTEMPTS = 2;
const SITE_FETCH_RETRY_DELAY_MS = 450;

function extractMainText($) {
  const cloned = $("body").clone();
  cloned.find("script, style, noscript").remove();
  const rawText = normalizeText(cloned.text()) || "";
  return rawText.slice(0, MAX_TEXT_LENGTH);
}

function isRetryableSiteError(error) {
  return ["ECONNABORTED", "ETIMEDOUT", "ECONNRESET"].includes(error?.code);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(url) {
  let lastError = null;

  for (let attempt = 1; attempt <= SITE_FETCH_RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        maxRedirects: 5,
        headers: { "User-Agent": SITE_FETCH_USER_AGENT }
      });

      if (typeof response.data !== "string" || response.data.trim() === "") {
        throw new HttpError(502, ERROR_CODES.SITE_UNAVAILABLE, ERROR_MESSAGES.SITE_EMPTY_CONTENT);
      }

      return response.data;
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }

      lastError = error;
      if (attempt < SITE_FETCH_RETRY_ATTEMPTS && isRetryableSiteError(error)) {
        await wait(SITE_FETCH_RETRY_DELAY_MS * attempt);
        continue;
      }

      break;
    }
  }

  if (lastError?.code === "ECONNABORTED") {
    throw new HttpError(504, ERROR_CODES.SITE_TIMEOUT, ERROR_MESSAGES.SITE_TIMEOUT);
  }

  throw new HttpError(502, ERROR_CODES.SITE_UNAVAILABLE, ERROR_MESSAGES.SITE_UNAVAILABLE);
}

export async function parseWebsite(urlObject) {
  const html = await fetchHtml(urlObject.href);
  const $ = cheerio.load(html);
  const detectedPlatform = detectPlatform(html);

  return {
    site: urlObject.hostname,
    url: urlObject.href,
    title: normalizeText($("title").first().text()) || "Not found",
    metaDescription: normalizeText($("meta[name='description']").attr("content")) || "Not found",
    headings: {
      h1: toArrayWithFallback($("h1").map((_, el) => normalizeText($(el).text())).get().filter(Boolean)),
      h2: toArrayWithFallback($("h2").map((_, el) => normalizeText($(el).text())).get().filter(Boolean)),
      h3: toArrayWithFallback($("h3").map((_, el) => normalizeText($(el).text())).get().filter(Boolean))
    },
    mainText: extractMainText($) || "Not found",
    linksCount: $("a").length,
    buttonsCount: $("button").length,
    hasForms: $("form").length > 0,
    detectedPlatform
  };
}
