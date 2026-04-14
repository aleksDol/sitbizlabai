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

function extractMainText($) {
  const cloned = $("body").clone();
  cloned.find("script, style, noscript").remove();
  const rawText = normalizeText(cloned.text()) || "";
  return rawText.slice(0, MAX_TEXT_LENGTH);
}

async function fetchHtml(url) {
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

    if (error.code === "ECONNABORTED") {
      throw new HttpError(504, ERROR_CODES.SITE_TIMEOUT, ERROR_MESSAGES.SITE_TIMEOUT);
    }

    throw new HttpError(502, ERROR_CODES.SITE_UNAVAILABLE, ERROR_MESSAGES.SITE_UNAVAILABLE);
  }
}

export async function parseWebsite(urlObject) {
  const html = await fetchHtml(urlObject.href);
  const $ = cheerio.load(html);

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
    hasForms: $("form").length > 0
  };
}
