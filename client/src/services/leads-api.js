function getLeadsApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_LEADS_API_URL;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/+$/, "");
  }

  // If hosted behind the same domain (recommended on prod), default to current origin.
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  // Fallback for local dev when no env is provided.
  return "http://localhost:3000";
}

export async function createLead(payload) {
  const response = await fetch(`${getLeadsApiBaseUrl()}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data && (data.error || (Array.isArray(data.errors) ? data.errors.join(" ") : ""))) ||
      "Не удалось отправить заявку. Попробуйте ещё раз.";
    throw new Error(message);
  }

  return data;
}

export async function updateLead(id, payload) {
  const response = await fetch(`${getLeadsApiBaseUrl()}/api/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (data && (data.error || (Array.isArray(data.errors) ? data.errors.join(" ") : ""))) ||
      "Не удалось обновить заявку. Попробуйте еще раз.";
    throw new Error(message);
  }

  return data;
}
