import axios from "axios";
import {
  METRICS_FALLBACK,
  PAGESPEED_API_URL,
  PAGESPEED_TIMEOUT_MS,
  PAGESPEED_WARNING_MESSAGE
} from "../config/analyze.constants.js";
import { normalizeText } from "../utils/text.utils.js";

export async function fetchPageSpeedMetrics(url) {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;

  if (!apiKey) {
    return { metrics: METRICS_FALLBACK, warning: PAGESPEED_WARNING_MESSAGE };
  }

  try {
    const response = await axios.get(PAGESPEED_API_URL, {
      timeout: PAGESPEED_TIMEOUT_MS,
      params: {
        url,
        key: apiKey,
        strategy: "mobile",
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
      },
      warning: null
    };
  } catch {
    return { metrics: METRICS_FALLBACK, warning: PAGESPEED_WARNING_MESSAGE };
  }
}
