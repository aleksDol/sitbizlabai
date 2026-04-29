import axios from "axios";
import https from "node:https";
import {
  METRICS_FALLBACK,
  PAGESPEED_API_URL,
  PAGESPEED_TIMEOUT_MS,
  PAGESPEED_WARNING_MESSAGE
} from "../config/analyze.constants.js";
import { normalizeText } from "../utils/text.utils.js";

const httpsAgent = new https.Agent({ keepAlive: true, family: 4 });
const STRATEGIES = ["mobile", "desktop"];
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error) {
  const status = error?.response?.status;
  const code = error?.code;
  return RETRYABLE_STATUSES.has(status) || code === "ECONNABORTED" || code === "ETIMEDOUT";
}

async function requestPageSpeed(url, apiKey, strategy) {
  const response = await axios.get(PAGESPEED_API_URL, {
    timeout: PAGESPEED_TIMEOUT_MS,
    httpsAgent,
    params: {
      url,
      key: apiKey,
      strategy,
      category: "performance"
    }
  });

  const audits = response.data?.lighthouseResult?.audits ?? {};
  const rawScore = response.data?.lighthouseResult?.categories?.performance?.score;

  return {
    metrics: {
      performance_score: typeof rawScore === "number" ? Math.round(rawScore * 100) : null,
      LCP: normalizeText(audits["largest-contentful-paint"]?.displayValue) || "Not available",
      FCP: normalizeText(audits["first-contentful-paint"]?.displayValue) || "Not available"
    }
  };
}

export async function fetchPageSpeedMetrics(url) {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY?.trim();

  if (!apiKey) {
    return { metrics: METRICS_FALLBACK, warning: PAGESPEED_WARNING_MESSAGE };
  }

  let lastError = null;

  for (const strategy of STRATEGIES) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const result = await requestPageSpeed(url, apiKey, strategy);
        return { ...result, warning: null };
      } catch (error) {
        lastError = error;
        if (attempt < 3 && isRetryableError(error)) {
          await wait(350 * attempt);
          continue;
        }
        break;
      }
    }
  }

  const status = lastError?.response?.status;
  const statusText = lastError?.response?.statusText;
  const googleError = lastError?.response?.data?.error?.message;
  const message = googleError || lastError?.message;
  console.warn(
    `[PageSpeed] Request failed${status ? `: ${status} ${statusText || ""}` : ""}${
      message ? ` | ${String(message).slice(0, 240)}` : ""
    }`
  );

  return { metrics: METRICS_FALLBACK, warning: PAGESPEED_WARNING_MESSAGE };
}
