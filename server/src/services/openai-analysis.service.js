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
import { buildBusinessAnalysisSystemPrompt, buildSystemPrompt } from "../prompts/site-audit.prompt.js";

const LOSSES_FALLBACK_TEXT = "Не удалось рассчитать потери. Попробуйте еще раз.";
const IMPLEMENTATION_PLAN_FALLBACK_TEXT =
  "Не удалось сформировать план реализации. Попробуйте еще раз.";
const SOLUTION_OFFER_FALLBACK_TEXT = "Не удалось сформировать предложение. Попробуйте еще раз.";
const SOLUTION_OFFER_SYSTEM_PROMPT = `Ты эксперт по digital-стратегии, продажам и продуктовой воронке.

Сформируй персональный оффер как связанный план роста, а не как список инструментов.

Требования:
- Учитывай входные поля: niche, hasWebsite, channels, hasRepeatSales, trafficSources.
- Если сайта нет, не предлагай "исправить сайт"; предлагай точку входа (лендинг, квиз-страница, форма, Telegram-бот, CRM) только если это релевантно.
- Если сайт есть, опирайся на анализ сайта и потерь.
- Не рекомендуй конкретные сторонние сервисы и платформы.
- Объясняй каждое решение через: проблема -> решение -> бизнес-эффект.
- Пиши кратко, по делу, без воды.`;

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

export async function fetchBusinessContextAnalysis(analysisInput) {
  return requestOpenAiText({
    messages: [
      {
        role: "system",
        content: buildBusinessAnalysisSystemPrompt(analysisInput)
      },
      {
        role: "user",
        content: `Контекст бизнеса:\n${JSON.stringify(analysisInput, null, 2)}`
      }
    ],
    fallbackText: OPENAI_ANALYSIS_FALLBACK,
    warningMessage: OPENAI_WARNING_MESSAGE
  });
}

export async function fetchBusinessLossesFromAnalysisText(analysisText, analysisInput = null) {
  const result = await requestOpenAiText({
    messages: [
      { role: "system", content: LOSSES_SYSTEM_PROMPT },
      { role: "user", content: buildLossesUserPrompt(analysisText, analysisInput) }
    ],
    fallbackText: LOSSES_FALLBACK_TEXT,
    warningMessage: null
  });

  return result.text || LOSSES_FALLBACK_TEXT;
}

export async function fetchImplementationPlanFromContext({
  analysisText,
  lossesText,
  siteType,
  niche = "",
  hasWebsite = true,
  channels = [],
  leadsPerMonth = "",
  hasRepeatSales = ""
}) {
  const result = await requestOpenAiText({
    messages: [
      { role: "system", content: IMPLEMENTATION_PLAN_SYSTEM_PROMPT },
      {
        role: "user",
        content: buildImplementationPlanUserPrompt({
          analysisText,
          lossesText,
          siteType,
          niche,
          hasWebsite,
          channels,
          leadsPerMonth,
          hasRepeatSales
        })
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
  niche = "",
  hasWebsite = true,
  websiteUrl = null,
  detectedPlatform = null,
  channels = [],
  leadsPerMonth = "",
  hasRepeatSales,
  trafficSources
}) {
  const result = await requestOpenAiText({
    messages: [
      { role: "system", content: SOLUTION_OFFER_SYSTEM_PROMPT },
      {
        role: "system",
        content:
          "Всегда учитывай специфику ниши бизнеса из поля niche. Не давай универсальные советы без привязки к нише. Объясняй, почему конкретное решение подходит именно этой нише. Не предлагай одинаковый набор решений для всех: подбирай решения по контексту (ниша, каналы, есть ли сайт, повторные продажи, количество заявок). Если сайта нет — не предлагай исправление сайта, а предложи точку входа: лендинг/квиз/форма и связку с Telegram/CRM по контексту. Не рекомендуй сторонние сервисы, платформы, конструкторы или конкретные инструменты: Tilda, Wix, Manybot, BotHelp, Taplink, WordPress, Bitrix, amoCRM, GetCourse и любые аналоги. Платформу можно упоминать только как текущий контекст, если она уже определена или названа пользователем, но не как рекомендацию. Не задавай повторные вопросы пользователю, если данные уже есть в контексте. Если detectedPlatform confidence high или medium — используй это как технический контекст. Если detectedPlatform unknown или null — не делай выводов о платформе и не спрашивай пользователя. Если channels содержит 2 и более канала — предлагай CRM/админку/аналитику для контроля источников заявок. Если channels содержит 1 канал — объясняй риск зависимости и предлагай простую аналитику без перегруза. Держи одну логическую линию: 1) что мешает росту 2) что внедрить 3) зачем это бизнесу 4) какой итог получит клиент 5) что мы можем реализовать. Не перескакивай между темами, не повторяйся, не добавляй лишние идеи."
      },
      {
        role: "system",
        content:
          "Финальный ответ выдай строго в структуре: ### Оценка ситуации (2-4 предложения), ### Что мешает росту (до 3 пунктов), ### Что стоит внедрить (для каждого пункта: Проблема, Решение, Что получит бизнес), ### Если коротко (- Сейчас: ... - После внедрения: ...), ### Что мы можем сделать для вас (краткий список работ), ### Призыв к действию (ровно фраза: Оставьте контакты — мы покажем, как реализовать это под ваш бизнес.). В блоке 'Что мы можем сделать для вас' используй только релевантные пункты: лендинг/сайт, Telegram-бот при необходимости, CRM/админка и аналитика при нескольких источниках/потере заявок, связка в единую систему заявок и повторных касаний."
      },
      {
        role: "user",
        content: `Сформируй персональный оффер под этот сценарий:

analysisText:
${analysisText}

lossesText:
${lossesText}

siteType:
${siteType}

niche:
${niche}

hasWebsite:
${hasWebsite}

websiteUrl:
${websiteUrl || "null"}

detectedPlatform:
${detectedPlatform ? JSON.stringify(detectedPlatform) : "null"}

channels:
${Array.isArray(channels) ? channels.join(", ") : ""}

leadsPerMonth:
${leadsPerMonth}

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
export async function fetchBusinessLosses(analysisProblems, analysisInput = null) {
  return fetchBusinessLossesFromAnalysisText(analysisProblems, analysisInput);
}
