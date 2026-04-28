import type { Lead } from "@prisma/client";

const TELEGRAM_API_BASE = "https://api.telegram.org";
const SUMMARY_MAX_LEN = 300;

function getTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  const threadIdRaw = process.env.TELEGRAM_THREAD_ID?.trim();
  return { token, chatId, threadIdRaw };
}

function parseTelegramThreadId(threadIdRaw?: string): number | null {
  if (!threadIdRaw) {
    return null;
  }

  const threadId = Number(threadIdRaw);
  if (!Number.isFinite(threadId) || !Number.isInteger(threadId) || threadId <= 0) {
    console.warn(
      `[Telegram] TELEGRAM_THREAD_ID must be a positive integer. Got: "${threadIdRaw}". Sending without message_thread_id.`
    );
    return null;
  }

  return threadId;
}

function toSingleLine(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function buildSummary(analysisText: string | null): string {
  if (!analysisText) {
    return "Нет данных анализа.";
  }

  const compact = toSingleLine(analysisText);
  if (compact.length <= SUMMARY_MAX_LEN) {
    return compact;
  }

  return `${compact.slice(0, SUMMARY_MAX_LEN - 1).trimEnd()}…`;
}

function yesNo(value: boolean | null): string {
  return value ? "Да" : "Нет";
}

function buildAdminLeadUrl(leadId: string, adminBaseUrl?: string): string | null {
  const rawBase = adminBaseUrl?.trim() || process.env.ADMIN_BASE_URL?.trim() || process.env.NEXT_PUBLIC_PRODUCT_URL?.trim();
  if (!rawBase) {
    return null;
  }

  try {
    const url = new URL(rawBase);
    url.pathname = `/admin/leads/${leadId}`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function buildLeadMessage(lead: Lead, adminLeadUrl: string | null): string {
  const channels = Array.isArray(lead.channels) && lead.channels.length > 0 ? lead.channels.join(", ") : "не указаны";
  const website = lead.websiteUrl?.trim() ? lead.websiteUrl : "нет сайта";
  const niche = lead.niche?.trim() ? lead.niche : "не указана";
  const leadsPerMonth = lead.leadsPerMonth?.trim() ? lead.leadsPerMonth : "не указано";
  const platform = lead.detectedPlatform?.trim() ? lead.detectedPlatform : "не определена";
  const summary = buildSummary(lead.analysisText);
  const adminUrlLabel = adminLeadUrl ?? "не настроен (укажите ADMIN_BASE_URL)";

  return [
    "📥 Новая заявка",
    "",
    `👤 Имя: ${lead.name}`,
    `📞 Контакт: ${lead.contact}`,
    `🌐 Сайт: ${website}`,
    "",
    "💼 Ниша:",
    niche,
    "",
    "📊 Заявок в месяц:",
    leadsPerMonth,
    "",
    "📣 Каналы:",
    channels,
    "",
    `🔁 Повторные продажи: ${yesNo(lead.hasRepeatSales)}`,
    "",
    `🧠 Платформа: ${platform}`,
    "",
    "--------------------------------",
    "",
    "📌 Кратко:",
    summary,
    "",
    "👉 Открыть в админке:",
    adminUrlLabel
  ].join("\n");
}

export async function sendTelegramLeadNotification(lead: Lead, options?: { adminBaseUrl?: string }) {
  const { token, chatId, threadIdRaw } = getTelegramConfig();
  if (!token || !chatId) {
    return { sent: false, reason: "telegram_not_configured" as const };
  }

  const adminLeadUrl = buildAdminLeadUrl(lead.id, options?.adminBaseUrl);
  const threadId = parseTelegramThreadId(threadIdRaw);
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text: buildLeadMessage(lead, adminLeadUrl),
    disable_web_page_preview: true
  };

  if (threadId !== null) {
    payload.message_thread_id = threadId;
  }

  if (adminLeadUrl) {
    payload.reply_markup = {
      inline_keyboard: [[{ text: "Открыть в админке", url: adminLeadUrl }]]
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Telegram sendMessage failed: ${response.status} ${response.statusText}${errorText ? ` | ${errorText}` : ""}`);
    }

    return { sent: true as const };
  } finally {
    clearTimeout(timeout);
  }
}
