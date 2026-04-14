export function normalizeText(value) {
  return value?.replace(/\s+/g, " ").trim() || null;
}

export function toArrayWithFallback(values, fallbackValue = "Not found") {
  return values.length > 0 ? values : [fallbackValue];
}
