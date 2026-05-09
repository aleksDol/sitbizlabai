export const REQUEST_TIMEOUT_MS = 25000;
export const PAGESPEED_TIMEOUT_MS = 20000;
export const OPENAI_TIMEOUT_MS = 20000;
export const MAX_TEXT_LENGTH = 5000;

export const PAGESPEED_API_URL =
  "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
export const DEFAULT_OPENAI_BASE_URL = "https://api.proxyapi.ru/openai/v1";

export const SITE_FETCH_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const OPENAI_ANALYSIS_FALLBACK = "Не удалось провести анализ.";
export const OPENAI_WARNING_MESSAGE =
  "Не удалось получить рекомендации AI. Базовый анализ сайта сохранен.";
export const PAGESPEED_WARNING_MESSAGE =
  "Не удалось проверить скорость через PageSpeed. Показатели скорости недоступны.";

export const METRICS_FALLBACK = {
  performance_score: null,
  LCP: "Not available",
  FCP: "Not available"
};

