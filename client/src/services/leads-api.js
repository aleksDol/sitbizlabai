function getLeadsApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_LEADS_API_URL;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/+$/, "");
  }

  // Analyzer UI runs on :5173, Next app runs on :3000 in docker-compose.
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

