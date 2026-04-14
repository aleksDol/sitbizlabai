"use client";

import { useMemo, useState } from "react";

type LeadStatus = "NEW" | "CONTACTED" | "WON" | "LOST";

type Props = {
  leadId: string;
  initialStatus: LeadStatus;
  initialManagerComment: string | null;
};

const STATUS_OPTIONS: Array<{ value: LeadStatus; label: string }> = [
  { value: "NEW", label: "Новый" },
  { value: "CONTACTED", label: "Связался" },
  { value: "WON", label: "Заключена сделка" },
  { value: "LOST", label: "Отказ" },
];

export function LeadEditor({ leadId, initialStatus, initialManagerComment }: Props) {
  const [status, setStatus] = useState<LeadStatus>(initialStatus);
  const [managerComment, setManagerComment] = useState(initialManagerComment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const isDirty = useMemo(() => {
    return status !== initialStatus || managerComment !== (initialManagerComment ?? "");
  }, [initialManagerComment, initialStatus, managerComment, status]);

  async function onSave() {
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const response = await fetch(`/api/leads/${encodeURIComponent(leadId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          managerComment: managerComment.trim() ? managerComment.trim() : null,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; errors?: string[] }
          | null;
        const message = payload?.error || payload?.errors?.join(" ") || "Не удалось сохранить.";
        throw new Error(message);
      }

      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 13, color: "rgba(0,0,0,0.6)" }}>Статус</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              background: "white",
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 13, color: "rgba(0,0,0,0.6)" }}>Комментарий менеджера</span>
          <textarea
            value={managerComment}
            onChange={(e) => setManagerComment(e.target.value)}
            rows={6}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.12)",
              resize: "vertical",
              background: "white",
              lineHeight: 1.5,
            }}
            placeholder="Например: написал в Telegram, жду ответ…"
          />
        </label>

        <button
          type="button"
          onClick={onSave}
          disabled={saving || !isDirty}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.12)",
            background: saving ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.03)",
            cursor: saving || !isDirty ? "not-allowed" : "pointer",
            justifySelf: "start",
          }}
        >
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>

        {saved ? (
          <p style={{ margin: 0, color: "rgba(34, 197, 94, 1)", fontSize: 13 }}>
            Сохранено.
          </p>
        ) : null}
        {error ? (
          <p style={{ margin: 0, color: "rgba(239, 68, 68, 1)", fontSize: 13 }}>{error}</p>
        ) : null}
      </div>
    </div>
  );
}

