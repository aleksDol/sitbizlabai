import {
  DEFAULT_OPENAI_BASE_URL,
  OPENAI_ANALYSIS_FALLBACK,
  OPENAI_TIMEOUT_MS,
  OPENAI_WARNING_MESSAGE
} from "../config/analyze.constants.js";
import {
  IMPLEMENTATION_PLAN_SYSTEM_PROMPT,
  buildImplementationPlanUserPrompt
} from "../prompts/implementation-plan.prompt.js";
import { LOSSES_SYSTEM_PROMPT, buildLossesUserPrompt } from "../prompts/losses.prompt.js";
import { buildSystemPrompt } from "../prompts/site-audit.prompt.js";

const LOSSES_FALLBACK_TEXT = "Не удалось рассчитать потери. Попробуйте ещё раз.";
const IMPLEMENTATION_PLAN_FALLBACK_TEXT =
  "Не удалось сформировать план реализации. Попробуйте ещё раз.";
const SOLUTION_OFFER_FALLBACK_TEXT = "Не удалось сформировать предложение. Попробуйте ещё раз.";
const SOLUTION_OFFER_SYSTEM_PROMPT = `Ты эксперт по digital-стратегии, продажам и разработке сайтов.

Твоя задача — не просто предложить решения, а объяснить их как связанный план роста бизнеса.

Главное правило:
НЕ перечисляй инструменты.
Объясняй каждое решение через:
- какую проблему оно решает
- почему это важно
- что это даст бизнесу

СТРУКТУРА ОТВЕТА:

1. Короткое вступление
Объясни, что текущие проблемы можно решить через системный подход.

2. Исправление сайта (основной блок)
Сначала объясни:
- какие проблемы есть (оффер, конверсия, структура)
- почему конструктор ограничивает решение этих проблем

Сделай акцент, что конструктор не даёт гибкости, аналитики и масштабирования.

Затем объясни, почему лучше сделать сайт через разработку:
- можно построить нормальную воронку
- можно внедрить аналитику
- можно управлять конверсией
- можно масштабировать

После этого обязательно объясни, что получит бизнес:
- больше заявок
- выше конверсия
- понятная воронка
- контроль над результатом

3. Telegram-бот (если есть повторные продажи)
Используй формулировку:
"Также имеет смысл внедрить Telegram-бота".

Дальше раскрой:
- какую проблему это решает (потеря клиентов, отсутствие повторных касаний)
- что делает (рассылки, напоминания, возврат клиентов)
- что получает бизнес (возврат клиентов, допродажи, рост LTV)

4. CRM / админка (если несколько источников)
Используй формулировку:
"Дополнительно стоит внедрить CRM или админку".

Дальше раскрой:
- какую проблему это решает (непонятно откуда клиенты, теряются заявки)
- что даёт (контроль заявок, аналитика по каналам, управление продажами)
- какой результат получает бизнес (меньше потерь, понятная экономика, рост ROI)

5. Финальная связка
Объедини всё в систему:
сайт + бот + CRM.

Объясни:
это не три инструмента, а единая система:
- сайт привлекает
- бот дожимает
- CRM управляет

6. Блок "Если коротко" (обязательно)
- Сейчас: ...
- После внедрения: ...

Пиши коротко и просто.

7. Финальный CTA
Используй такой стиль:
"Если хотите — можем разобрать ваш проект и показать,
как именно внедрить это под ваш сайт.

Оставьте контакты — подготовим понятный план внедрения."

ТРЕБОВАНИЯ К СТИЛЮ:
- пиши простым языком
- без сложных терминов
- без перегруза
- без длинных абзацев
- структурировано и логично
- как эксперт, а не как продавец

НЕ ПИШИ:
- просто список инструментов
- абстрактные фразы
- "улучшим UX" без объяснения

ПИШИ:
- через логику
- через выгоды
- через результат`;

function parseAssistantContent(rawContent) {
  if (typeof rawContent === "string" && rawContent.trim()) {
    return rawContent.trim();
  }

  if (Array.isArray(rawContent)) {
    const joined = rawContent
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (typeof item?.text === "string") {
          return item.text;
        }
        if (typeof item?.content === "string") {
          return item.content;
        }
        if (typeof item?.text?.value === "string") {
          return item.text.value;
        }
        return "";
      })
      .join("\n")
      .trim();
    return joined || null;
  }

  return null;
}

function extractContentFromResponse(data) {
  const fromChoices = parseAssistantContent(data?.choices?.[0]?.message?.content);
  if (fromChoices) {
    return fromChoices;
  }

  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (Array.isArray(data?.output)) {
    const outputText = data.output
      .flatMap((item) => item?.content || [])
      .map((part) => {
        if (typeof part?.text === "string") {
          return part.text;
        }
        if (typeof part?.content === "string") {
          return part.content;
        }
        return "";
      })
      .join("\n")
      .trim();
    if (outputText) {
      return outputText;
    }
  }

  return null;
}

function getOpenAiApiUrl() {
  const rawBaseUrl = process.env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL;
  const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, "");
  return `${normalizedBaseUrl}/chat/completions`;
}

function getOpenAiModelName() {
  const baseUrl = (process.env.OPENAI_BASE_URL || DEFAULT_OPENAI_BASE_URL).toLowerCase();
  const rawModel = process.env.OPENAI_MODEL || "gpt-4o-mini";

  // ProxyAPI has two common host patterns:
  // - openai.api.proxyapi.ru (often expects "openai/<model>")
  // - api.proxyapi.ru/openai/v1 (usually expects plain model name)
  if (baseUrl.includes("openai.api.proxyapi.ru") && !rawModel.includes("/")) {
    return `openai/${rawModel}`;
  }

  return rawModel;
}

async function requestOpenAiText({
  messages,
  fallbackText,
  warningMessage,
  maxTokens = 2200
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { text: fallbackText, warning: warningMessage };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  const model = getOpenAiModelName();

  const buildRequestBody = (tokenLimit) => {
    const body = {
      model,
      messages,
      max_completion_tokens: tokenLimit
    };

    // For reasoning models this reduces hidden reasoning-token overconsumption.
    if (/^o\d|^o[1-9]-|^o4|^o3/i.test(model)) {
      body.reasoning_effort = "low";
    }

    return body;
  };

  try {
    const sendRequest = async (tokenLimit) =>
      fetch(getOpenAiApiUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(buildRequestBody(tokenLimit)),
        signal: controller.signal
      });

    let response = await sendRequest(maxTokens);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.warn(
        `[OpenAI] Request failed: ${response.status} ${response.statusText}${
          errorText ? ` | ${errorText.slice(0, 300)}` : ""
        }`
      );
      return { text: fallbackText, warning: warningMessage };
    }

    let data = await response.json();
    let content = extractContentFromResponse(data);

    const finishReason = data?.choices?.[0]?.finish_reason;
    if (!content && finishReason === "length") {
      const retryMaxTokens = Math.min(maxTokens * 2, 4000);
      response = await sendRequest(retryMaxTokens);

      if (response.ok) {
        data = await response.json();
        content = extractContentFromResponse(data);
      }
    }

    if (!content) {
      const debugPreview = JSON.stringify(data).slice(0, 600);
      console.warn(`[OpenAI] Empty content in response | ${debugPreview}`);
      return { text: fallbackText, warning: warningMessage };
    }

    return { text: content, warning: null };
  } catch (error) {
    console.warn(`[OpenAI] Request error: ${error?.message || "Unknown error"}`);
    return { text: fallbackText, warning: warningMessage };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchOpenAiAnalysis(siteData) {
  return requestOpenAiText({
    messages: [
      { role: "system", content: buildSystemPrompt(siteData) },
      { role: "user", content: `Данные сайта:\n${JSON.stringify(siteData)}` }
    ],
    fallbackText: OPENAI_ANALYSIS_FALLBACK,
    warningMessage: OPENAI_WARNING_MESSAGE
  });
}

export async function fetchBusinessLossesFromAnalysisText(analysisText) {
  const result = await requestOpenAiText({
    messages: [
      { role: "system", content: LOSSES_SYSTEM_PROMPT },
      { role: "user", content: buildLossesUserPrompt(analysisText) }
    ],
    fallbackText: LOSSES_FALLBACK_TEXT,
    warningMessage: null
  });

  return result.text || LOSSES_FALLBACK_TEXT;
}

export async function fetchImplementationPlanFromContext({
  analysisText,
  lossesText,
  siteType
}) {
  const result = await requestOpenAiText({
    messages: [
      { role: "system", content: IMPLEMENTATION_PLAN_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildImplementationPlanUserPrompt({ analysisText, lossesText, siteType })
      }
    ],
    fallbackText: IMPLEMENTATION_PLAN_FALLBACK_TEXT,
    warningMessage: null,
    maxTokens: 1200
  });

  return result.text || IMPLEMENTATION_PLAN_FALLBACK_TEXT;
}

export async function fetchSolutionOfferFromContext({
  analysisText,
  lossesText,
  siteType,
  hasRepeatSales,
  trafficSources
}) {
  const result = await requestOpenAiText({
    messages: [
      { role: "system", content: SOLUTION_OFFER_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Сформируй персональный оффер под этот сценарий:

analysisText:
${analysisText}

lossesText:
${lossesText}

siteType:
${siteType}

hasRepeatSales:
${hasRepeatSales}

trafficSources:
${trafficSources}`
      }
    ],
    fallbackText: SOLUTION_OFFER_FALLBACK_TEXT,
    warningMessage: null,
    maxTokens: 1400
  });

  return result.text || SOLUTION_OFFER_FALLBACK_TEXT;
}

// Backward-compatible wrapper for existing flow that passes problems text.
export async function fetchBusinessLosses(analysisProblems) {
  return fetchBusinessLossesFromAnalysisText(analysisProblems);
}
