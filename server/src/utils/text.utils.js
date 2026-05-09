export function normalizeText(value) {
  return value?.replace(/\s+/g, " ").trim() || null;
}

export function toArrayWithFallback(values, fallbackValue = "Not found") {
  return values.length > 0 ? values : [fallbackValue];
}

const BANNED_PHRASE_REPLACEMENTS = [
  { pattern: /зайчики контента/gi, replacement: "контент" },
  { pattern: /магия/gi, replacement: "эффект" },
  { pattern: /вау-эффект/gi, replacement: "заметный эффект" },
  { pattern: /вирусность/gi, replacement: "органический рост" },
  { pattern: /хайп/gi, replacement: "краткосрочный спрос" },
  { pattern: /эмоциональные качели/gi, replacement: "нестабильный клиентский опыт" },
  { pattern: /прогрев аудитории/gi, replacement: "последовательная коммуникация" }
];

const CONSULTING_SOFTEN_REPLACEMENTS = [
  { pattern: /целевое действие/gi, replacement: "заявка" },
  { pattern: /путь клиента/gi, replacement: "путь до заявки" },
  { pattern: /конверсионный сценарий/gi, replacement: "сценарий заявки" },
  { pattern: /конкурирующие элементы интерфейса/gi, replacement: "несколько кнопок и блоков" },
  { pattern: /конкурирующие элементы/gi, replacement: "несколько кнопок и блоков" },
  { pattern: /снижение доли обращений/gi, replacement: "часть людей может уйти без заявки" },
  { pattern: /визуальная коммуникация/gi, replacement: "подача на экране" },
  { pattern: /оптимизация взаимодействия/gi, replacement: "упрощение следующего шага" }
];

const REPETITIVE_TAIL_PATTERNS = [
  /(снижает|уменьшает)\s+(конверсию|количество\s+заявок|обращения|число\s+обращений)\.?$/i,
  /(теряются|теряется)\s+(заявки|клиенты|лиды)\.?$/i
];

function cleanupAiWording(text) {
  let next = text;
  for (const { pattern, replacement } of BANNED_PHRASE_REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  return next;
}

function softenConsultingLanguage(text) {
  let next = text;
  for (const { pattern, replacement } of CONSULTING_SOFTEN_REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  return next;
}

function buildMeaningKey(line) {
  return (line || "")
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((token) => token.length > 4)
    .slice(0, 6)
    .join("|");
}

function dedupeInsightLines(text) {
  const lines = text.split("\n");
  const seen = new Set();
  let lastTailKey = "";

  const filtered = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      filtered.push(rawLine);
      continue;
    }

    if (line.startsWith("###")) {
      filtered.push(rawLine);
      lastTailKey = "";
      continue;
    }

    const key = buildMeaningKey(line);
    if (key && seen.has(key)) {
      continue;
    }

    const tailKey = REPETITIVE_TAIL_PATTERNS.find((pattern) => pattern.test(line))?.toString() || "";
    if (tailKey && tailKey === lastTailKey) {
      continue;
    }

    if (key) seen.add(key);
    lastTailKey = tailKey;
    filtered.push(rawLine);
  }

  return filtered.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function polishRecommendationSection(text) {
  return text.replace(/(###\s+Как улучшить[\s\S]*?)(?=\n###\s+|$)/i, (section) => {
    const lines = section.split("\n");
    const rewritten = lines.map((line) => {
      const trimmed = line.trim();
      if (!/^[-•*]?\s*Проблема\s*:/i.test(trimmed)) return line;
      return line.replace(/^([-•*]?\s*)Проблема\s*:\s*/i, "$1Можно ");
    });
    return rewritten.join("\n");
  });
}

export function applyAnalysisQualityChecks(text) {
  const source = typeof text === "string" ? text.trim() : "";
  if (!source) return source;

  const cleaned = cleanupAiWording(source);
  const softened = softenConsultingLanguage(cleaned);
  const deduped = dedupeInsightLines(softened);
  return polishRecommendationSection(deduped);
}
