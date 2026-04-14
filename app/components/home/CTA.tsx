"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./home.module.css";

type SubmitState =
  | { type: "idle" }
  | { type: "submitting" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

function normalizeErrorMessage(payload: unknown): string {
  if (payload && typeof payload === "object" && "errors" in payload) {
    const errors = (payload as { errors?: unknown }).errors;
    if (Array.isArray(errors) && errors.every((e) => typeof e === "string")) {
      return errors.join(" ");
    }
  }
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string") return error;
  }
  return "Не удалось отправить. Попробуйте ещё раз.";
}

export function CTA() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [state, setState] = useState<SubmitState>({ type: "idle" });

  const canSubmit = useMemo(() => {
    return name.trim().length > 0 && contact.trim().length > 0 && state.type !== "submitting";
  }, [contact, name, state.type]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setState({ type: "submitting" });

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          websiteUrl: websiteUrl.trim().length > 0 ? websiteUrl.trim() : null,
        }),
      });

      const payload = (await res.json().catch(() => null)) as unknown;

      if (!res.ok) {
        setState({ type: "error", message: normalizeErrorMessage(payload) });
        return;
      }

      setState({
        type: "success",
        message: "Готово. Мы пришлём разбор и план улучшений.",
      });
      setWebsiteUrl("");
    } catch {
      setState({ type: "error", message: "Сеть недоступна. Проверьте подключение и попробуйте снова." });
    }
  }

  return (
    <section className={styles.section} aria-labelledby="cta-title" id="cta">
      <div>
        <p className={styles.kicker}>Финальный шаг</p>
        <h2 className={styles.h2} id="cta-title">
          Проверьте свой сайт и посмотрите, где вы теряете клиентов
        </h2>
        <p className={styles.subheading}>Вставьте сайт — и получите конкретный план, что исправить.</p>
      </div>

      <div className={styles.ctaBox}>
        <div className={styles.actions}>
          <Link className={styles.buttonPrimary} href="/analyzer">
            Начать анализ
          </Link>
          <span className={styles.helper}>После клика откроется анализатор.</span>
        </div>

        <form onSubmit={onSubmit}>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <div className={styles.label}>Имя</div>
              <input
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Как к вам обращаться"
                autoComplete="name"
                required
              />
            </div>
            <div className={styles.field}>
              <div className={styles.label}>Контакт</div>
              <input
                className={styles.input}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Email / Telegram / телефон"
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className={styles.field} style={{ marginTop: 10 }}>
            <div className={styles.label}>Сайт (необязательно)</div>
            <input
              className={styles.input}
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
              inputMode="url"
            />
          </div>

          <div className={styles.actions} style={{ marginTop: 12 }}>
            <button className={styles.buttonPrimary} type="submit" disabled={!canSubmit}>
              {state.type === "submitting" ? "Отправляем…" : "Отправить"}
            </button>
            <span className={styles.helper}>Без лишних вопросов.</span>
          </div>

          {state.type === "success" ? <p className={styles.success}>{state.message}</p> : null}
          {state.type === "error" ? <p className={styles.error}>{state.message}</p> : null}
        </form>
      </div>
    </section>
  );
}

