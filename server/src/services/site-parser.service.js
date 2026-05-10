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

const SITE_FETCH_RETRY_ATTEMPTS = 3;
const SITE_FETCH_RETRY_DELAY_MS = 700;

function extractMainText($) {
  const cloned = $("body").clone();
  cloned.find("script, style, noscript").remove();
  const rawText = normalizeText(cloned.text()) || "";
  return rawText.slice(0, MAX_TEXT_LENGTH);
}

function isRetryableSiteError(error) {
  return ["ECONNABORTED", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN", "ENETUNREACH", "ECONNREFUSED"].includes(
    error?.code
  );
}

function isProtectedSiteResponse(error) {
  const status = error?.response?.status;
  const html = typeof error?.response?.data === "string" ? error.response.data.toLowerCase() : "";
  const protectionMarkers = ["захищена сторінка", "protected page", "cloudflare", "attention required"];

  if (status === 429 || status === 403) {
    return true;
  }

  return protectionMarkers.some((marker) => html.includes(marker));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(url) {
  const candidateUrls = [];
  candidateUrls.push(url);
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") {
      candidateUrls.push(`http://${parsed.host}${parsed.pathname}${parsed.search}`);
    } else if (parsed.protocol === "http:") {
      candidateUrls.push(`https://${parsed.host}${parsed.pathname}${parsed.search}`);
    }
  } catch {
    // Keep original URL only.
  }

  const uniqueCandidateUrls = [...new Set(candidateUrls)];
  let lastError = null;

  for (const candidateUrl of uniqueCandidateUrls) {
    for (let attempt = 1; attempt <= SITE_FETCH_RETRY_ATTEMPTS; attempt += 1) {
      try {
        const response = await axios.get(candidateUrl, {
          timeout: REQUEST_TIMEOUT_MS,
          maxRedirects: 5,
          headers: {
            "User-Agent": SITE_FETCH_USER_AGENT,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "ru,en-US;q=0.9,en;q=0.8",
            "Cache-Control": "no-cache",
            Pragma: "no-cache"
          }
        });

        if (typeof response.data !== "string" || response.data.trim() === "") {
          throw new HttpError(502, ERROR_CODES.SITE_UNAVAILABLE, ERROR_MESSAGES.SITE_EMPTY_CONTENT);
        }

        return response.data;
      } catch (error) {
        if (error instanceof HttpError) {
          throw error;
        }

        if (isProtectedSiteResponse(error)) {
          lastError = error;
          break;
        }

        lastError = error;
        if (attempt < SITE_FETCH_RETRY_ATTEMPTS && isRetryableSiteError(error)) {
          await wait(SITE_FETCH_RETRY_DELAY_MS * attempt);
          continue;
        }

        break;
      }
    }
  }

  const fallbackHtml = await fetchFallbackHtml(url);
  if (fallbackHtml) {
    return fallbackHtml;
  }

  if (isProtectedSiteResponse(lastError)) {
    throw new HttpError(429, ERROR_CODES.SITE_PROTECTED, ERROR_MESSAGES.SITE_PROTECTED);
  }

  if (lastError?.code === "ECONNABORTED" || lastError?.code === "ETIMEDOUT") {
    throw new HttpError(504, ERROR_CODES.SITE_TIMEOUT, ERROR_MESSAGES.SITE_TIMEOUT);
  }

  throw new HttpError(502, ERROR_CODES.SITE_UNAVAILABLE, ERROR_MESSAGES.SITE_UNAVAILABLE);
}

async function fetchFallbackHtml(url) {
  try {
    const response = await axios.get(`https://r.jina.ai/${url}`, {
      timeout: REQUEST_TIMEOUT_MS,
      maxRedirects: 3,
      headers: {
        "User-Agent": SITE_FETCH_USER_AGENT,
        Accept: "text/plain,text/html;q=0.9,*/*;q=0.8"
      }
    });

    const text = typeof response.data === "string" ? response.data.trim() : "";
    if (!text) {
      return null;
    }

    // Reader proxy may return plain text/markdown. Wrap into minimal HTML for downstream parser.
    return `<!doctype html><html><head><title>Fallback content</title></head><body>${text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</body></html>`;
  } catch {
    return null;
  }
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
