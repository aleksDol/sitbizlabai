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

const LOSSES_FALLBACK_TEXT = "РќРµ СѓРґР°Р»РѕСЃСЊ СЂР°СЃСЃС‡РёС‚Р°С‚СЊ РїРѕС‚РµСЂРё. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·.";
const IMPLEMENTATION_PLAN_FALLBACK_TEXT =
  "РќРµ СѓРґР°Р»РѕСЃСЊ СЃС„РѕСЂРјРёСЂРѕРІР°С‚СЊ РїР»Р°РЅ СЂРµР°Р»РёР·Р°С†РёРё. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·.";
const SOLUTION_OFFER_FALLBACK_TEXT = "РќРµ СѓРґР°Р»РѕСЃСЊ СЃС„РѕСЂРјРёСЂРѕРІР°С‚СЊ РїСЂРµРґР»РѕР¶РµРЅРёРµ. РџРѕРїСЂРѕР±СѓР№С‚Рµ РµС‰С‘ СЂР°Р·.";
const SOLUTION_OFFER_SYSTEM_PROMPT = `РўС‹ СЌРєСЃРїРµСЂС‚ РїРѕ digital-СЃС‚СЂР°С‚РµРіРёРё, РїСЂРѕРґР°Р¶Р°Рј Рё СЂР°Р·СЂР°Р±РѕС‚РєРµ СЃР°Р№С‚РѕРІ.

РўРІРѕСЏ Р·Р°РґР°С‡Р° вЂ” РЅРµ РїСЂРѕСЃС‚Рѕ РїСЂРµРґР»РѕР¶РёС‚СЊ СЂРµС€РµРЅРёСЏ, Р° РѕР±СЉСЏСЃРЅРёС‚СЊ РёС… РєР°Рє СЃРІСЏР·Р°РЅРЅС‹Р№ РїР»Р°РЅ СЂРѕСЃС‚Р° Р±РёР·РЅРµСЃР°.

Р“Р»Р°РІРЅРѕРµ РїСЂР°РІРёР»Рѕ:
РќР• РїРµСЂРµС‡РёСЃР»СЏР№ РёРЅСЃС‚СЂСѓРјРµРЅС‚С‹.
РћР±СЉСЏСЃРЅСЏР№ РєР°Р¶РґРѕРµ СЂРµС€РµРЅРёРµ С‡РµСЂРµР·:
- РєР°РєСѓСЋ РїСЂРѕР±Р»РµРјСѓ РѕРЅРѕ СЂРµС€Р°РµС‚
- РїРѕС‡РµРјСѓ СЌС‚Рѕ РІР°Р¶РЅРѕ
- С‡С‚Рѕ СЌС‚Рѕ РґР°СЃС‚ Р±РёР·РЅРµСЃСѓ

РЎРўР РЈРљРўРЈР Рђ РћРўР’Р•РўРђ:

1. РљРѕСЂРѕС‚РєРѕРµ РІСЃС‚СѓРїР»РµРЅРёРµ
РћР±СЉСЏСЃРЅРё, С‡С‚Рѕ С‚РµРєСѓС‰РёРµ РїСЂРѕР±Р»РµРјС‹ РјРѕР¶РЅРѕ СЂРµС€РёС‚СЊ С‡РµСЂРµР· СЃРёСЃС‚РµРјРЅС‹Р№ РїРѕРґС…РѕРґ.

2. РСЃРїСЂР°РІР»РµРЅРёРµ СЃР°Р№С‚Р° (РѕСЃРЅРѕРІРЅРѕР№ Р±Р»РѕРє)
РЎРЅР°С‡Р°Р»Р° РѕР±СЉСЏСЃРЅРё:
- РєР°РєРёРµ РїСЂРѕР±Р»РµРјС‹ РµСЃС‚СЊ (РѕС„С„РµСЂ, РєРѕРЅРІРµСЂСЃРёСЏ, СЃС‚СЂСѓРєС‚СѓСЂР°)
- РїРѕС‡РµРјСѓ РєРѕРЅСЃС‚СЂСѓРєС‚РѕСЂ РѕРіСЂР°РЅРёС‡РёРІР°РµС‚ СЂРµС€РµРЅРёРµ СЌС‚РёС… РїСЂРѕР±Р»РµРј

РЎРґРµР»Р°Р№ Р°РєС†РµРЅС‚, С‡С‚Рѕ РєРѕРЅСЃС‚СЂСѓРєС‚РѕСЂ РЅРµ РґР°С‘С‚ РіРёР±РєРѕСЃС‚Рё, Р°РЅР°Р»РёС‚РёРєРё Рё РјР°СЃС€С‚Р°Р±РёСЂРѕРІР°РЅРёСЏ.

Р—Р°С‚РµРј РѕР±СЉСЏСЃРЅРё, РїРѕС‡РµРјСѓ Р»СѓС‡С€Рµ СЃРґРµР»Р°С‚СЊ СЃР°Р№С‚ С‡РµСЂРµР· СЂР°Р·СЂР°Р±РѕС‚РєСѓ:
- РјРѕР¶РЅРѕ РїРѕСЃС‚СЂРѕРёС‚СЊ РЅРѕСЂРјР°Р»СЊРЅСѓСЋ РІРѕСЂРѕРЅРєСѓ
- РјРѕР¶РЅРѕ РІРЅРµРґСЂРёС‚СЊ Р°РЅР°Р»РёС‚РёРєСѓ
- РјРѕР¶РЅРѕ СѓРїСЂР°РІР»СЏС‚СЊ РєРѕРЅРІРµСЂСЃРёРµР№
- РјРѕР¶РЅРѕ РјР°СЃС€С‚Р°Р±РёСЂРѕРІР°С‚СЊ

РџРѕСЃР»Рµ СЌС‚РѕРіРѕ РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ РѕР±СЉСЏСЃРЅРё, С‡С‚Рѕ РїРѕР»СѓС‡РёС‚ Р±РёР·РЅРµСЃ:
- Р±РѕР»СЊС€Рµ Р·Р°СЏРІРѕРє
- РІС‹С€Рµ РєРѕРЅРІРµСЂСЃРёСЏ
- РїРѕРЅСЏС‚РЅР°СЏ РІРѕСЂРѕРЅРєР°
- РєРѕРЅС‚СЂРѕР»СЊ РЅР°Рґ СЂРµР·СѓР»СЊС‚Р°С‚РѕРј

3. Telegram-Р±РѕС‚ (РµСЃР»Рё РµСЃС‚СЊ РїРѕРІС‚РѕСЂРЅС‹Рµ РїСЂРѕРґР°Р¶Рё)
РСЃРїРѕР»СЊР·СѓР№ С„РѕСЂРјСѓР»РёСЂРѕРІРєСѓ:
"РўР°РєР¶Рµ РёРјРµРµС‚ СЃРјС‹СЃР» РІРЅРµРґСЂРёС‚СЊ Telegram-Р±РѕС‚Р°".

Р”Р°Р»СЊС€Рµ СЂР°СЃРєСЂРѕР№:
- РєР°РєСѓСЋ РїСЂРѕР±Р»РµРјСѓ СЌС‚Рѕ СЂРµС€Р°РµС‚ (РїРѕС‚РµСЂСЏ РєР»РёРµРЅС‚РѕРІ, РѕС‚СЃСѓС‚СЃС‚РІРёРµ РїРѕРІС‚РѕСЂРЅС‹С… РєР°СЃР°РЅРёР№)
- С‡С‚Рѕ РґРµР»Р°РµС‚ (СЂР°СЃСЃС‹Р»РєРё, РЅР°РїРѕРјРёРЅР°РЅРёСЏ, РІРѕР·РІСЂР°С‚ РєР»РёРµРЅС‚РѕРІ)
- С‡С‚Рѕ РїРѕР»СѓС‡Р°РµС‚ Р±РёР·РЅРµСЃ (РІРѕР·РІСЂР°С‚ РєР»РёРµРЅС‚РѕРІ, РґРѕРїСЂРѕРґР°Р¶Рё, СЂРѕСЃС‚ LTV)

4. CRM / Р°РґРјРёРЅРєР° (РµСЃР»Рё РЅРµСЃРєРѕР»СЊРєРѕ РёСЃС‚РѕС‡РЅРёРєРѕРІ)
РСЃРїРѕР»СЊР·СѓР№ С„РѕСЂРјСѓР»РёСЂРѕРІРєСѓ:
"Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅРѕ СЃС‚РѕРёС‚ РІРЅРµРґСЂРёС‚СЊ CRM РёР»Рё Р°РґРјРёРЅРєСѓ".

Р”Р°Р»СЊС€Рµ СЂР°СЃРєСЂРѕР№:
- РєР°РєСѓСЋ РїСЂРѕР±Р»РµРјСѓ СЌС‚Рѕ СЂРµС€Р°РµС‚ (РЅРµРїРѕРЅСЏС‚РЅРѕ РѕС‚РєСѓРґР° РєР»РёРµРЅС‚С‹, С‚РµСЂСЏСЋС‚СЃСЏ Р·Р°СЏРІРєРё)
- С‡С‚Рѕ РґР°С‘С‚ (РєРѕРЅС‚СЂРѕР»СЊ Р·Р°СЏРІРѕРє, Р°РЅР°Р»РёС‚РёРєР° РїРѕ РєР°РЅР°Р»Р°Рј, СѓРїСЂР°РІР»РµРЅРёРµ РїСЂРѕРґР°Р¶Р°РјРё)
- РєР°РєРѕР№ СЂРµР·СѓР»СЊС‚Р°С‚ РїРѕР»СѓС‡Р°РµС‚ Р±РёР·РЅРµСЃ (РјРµРЅСЊС€Рµ РїРѕС‚РµСЂСЊ, РїРѕРЅСЏС‚РЅР°СЏ СЌРєРѕРЅРѕРјРёРєР°, СЂРѕСЃС‚ ROI)

5. Р¤РёРЅР°Р»СЊРЅР°СЏ СЃРІСЏР·РєР°
РћР±СЉРµРґРёРЅРё РІСЃС‘ РІ СЃРёСЃС‚РµРјСѓ:
СЃР°Р№С‚ + Р±РѕС‚ + CRM.

РћР±СЉСЏСЃРЅРё:
СЌС‚Рѕ РЅРµ С‚СЂРё РёРЅСЃС‚СЂСѓРјРµРЅС‚Р°, Р° РµРґРёРЅР°СЏ СЃРёСЃС‚РµРјР°:
- СЃР°Р№С‚ РїСЂРёРІР»РµРєР°РµС‚
- Р±РѕС‚ РґРѕР¶РёРјР°РµС‚
- CRM СѓРїСЂР°РІР»СЏРµС‚

6. Р‘Р»РѕРє "Р•СЃР»Рё РєРѕСЂРѕС‚РєРѕ" (РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ)
- РЎРµР№С‡Р°СЃ: ...
- РџРѕСЃР»Рµ РІРЅРµРґСЂРµРЅРёСЏ: ...

РџРёС€Рё РєРѕСЂРѕС‚РєРѕ Рё РїСЂРѕСЃС‚Рѕ.

7. Р¤РёРЅР°Р»СЊРЅС‹Р№ CTA
РСЃРїРѕР»СЊР·СѓР№ С‚Р°РєРѕР№ СЃС‚РёР»СЊ:
"Р•СЃР»Рё С…РѕС‚РёС‚Рµ вЂ” РјРѕР¶РµРј СЂР°Р·РѕР±СЂР°С‚СЊ РІР°С€ РїСЂРѕРµРєС‚ Рё РїРѕРєР°Р·Р°С‚СЊ,
РєР°Рє РёРјРµРЅРЅРѕ РІРЅРµРґСЂРёС‚СЊ СЌС‚Рѕ РїРѕРґ РІР°С€ СЃР°Р№С‚.

РћСЃС‚Р°РІСЊС‚Рµ РєРѕРЅС‚Р°РєС‚С‹ вЂ” РїРѕРґРіРѕС‚РѕРІРёРј РїРѕРЅСЏС‚РЅС‹Р№ РїР»Р°РЅ РІРЅРµРґСЂРµРЅРёСЏ."

РўР Р•Р‘РћР’РђРќРРЇ Рљ РЎРўРР›Р®:
- РїРёС€Рё РїСЂРѕСЃС‚С‹Рј СЏР·С‹РєРѕРј
- Р±РµР· СЃР»РѕР¶РЅС‹С… С‚РµСЂРјРёРЅРѕРІ
- Р±РµР· РїРµСЂРµРіСЂСѓР·Р°
- Р±РµР· РґР»РёРЅРЅС‹С… Р°Р±Р·Р°С†РµРІ
- СЃС‚СЂСѓРєС‚СѓСЂРёСЂРѕРІР°РЅРѕ Рё Р»РѕРіРёС‡РЅРѕ
- РєР°Рє СЌРєСЃРїРµСЂС‚, Р° РЅРµ РєР°Рє РїСЂРѕРґР°РІРµС†

РќР• РџРРЁР:
- РїСЂРѕСЃС‚Рѕ СЃРїРёСЃРѕРє РёРЅСЃС‚СЂСѓРјРµРЅС‚РѕРІ
- Р°Р±СЃС‚СЂР°РєС‚РЅС‹Рµ С„СЂР°Р·С‹
- "СѓР»СѓС‡С€РёРј UX" Р±РµР· РѕР±СЉСЏСЃРЅРµРЅРёСЏ

РџРРЁР:
- С‡РµСЂРµР· Р»РѕРіРёРєСѓ
- С‡РµСЂРµР· РІС‹РіРѕРґС‹
- С‡РµСЂРµР· СЂРµР·СѓР»СЊС‚Р°С‚`;

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
      { role: "user", content: `Р”Р°РЅРЅС‹Рµ СЃР°Р№С‚Р°:\n${JSON.stringify(siteData)}` }
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
        content: `РљРѕРЅС‚РµРєСЃС‚ Р±РёР·РЅРµСЃР°:\n${JSON.stringify(analysisInput, null, 2)}`
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
          "Всегда учитывай специфику ниши бизнеса из поля niche. Не давай универсальные советы без привязки к нише. Объясняй, почему конкретное решение подходит именно этой нише. Не предлагай одинаковый набор решений для всех: подбирай решения по контексту (ниша, каналы, есть ли сайт, повторные продажи, количество заявок). Если сайта нет — не предлагай исправление сайта, а предложи точку входа: лендинг/квиз/форма и связку с Telegram/CRM по контексту. Не рекомендуй сторонние сервисы, платформы, конструкторы или конкретные инструменты: Tilda, Wix, Manybot, BotHelp, Taplink, WordPress, Bitrix, amoCRM, GetCourse и любые аналоги. Платформу можно упоминать только как текущий контекст, если она уже определена или названа пользователем, но не как рекомендацию. Держи одну логическую линию: 1) что мешает росту 2) что внедрить 3) зачем это бизнесу 4) какой итог получит клиент 5) что мы можем реализовать. Не перескакивай между темами, не повторяйся, не добавляй лишние идеи."
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
