"use client";

import Link from "next/link";
import styles from "./home.module.css";

type HeroProps = {
  productUrl?: string;
};

export function Hero({ productUrl }: HeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroBadges}>
        <span className={styles.badge}>Под ваш бизнес</span>
        <span className={styles.badge}>Без сложных терминов</span>
        <span className={styles.badge}>С фокусом на заявки</span>
      </div>

      <h1 className={styles.heroTitle}>Покажем, какой сайт и система продаж подойдут именно вашему бизнесу</h1>

      <p className={styles.heroLead}>
        AI анализирует, чем занимается бизнес, как сейчас приходят клиенты и что мешает получать больше заявок. Затем показывает,
        какой формат сайта подойдёт лучше, нужна ли CRM, стоит ли автоматизировать продажи и какие решения дадут самый быстрый
        эффект.
      </p>

      <div className={styles.actions}>
        <Link
          className={styles.buttonPrimary}
          href="/analyzer"
          onClick={() => window.ym?.(108548080, "reachGoal", "go_to_analyzer_from_home")}
        >
          Подобрать решение
        </Link>
        {productUrl ? (
          <Link className={styles.buttonSecondary} href={productUrl}>
            Перейти в продукт
          </Link>
        ) : (
          <Link className={styles.buttonSecondary} href="/blog">
            Читать блог
          </Link>
        )}
        <Link className={styles.mutedLink} href="/blog">
          Примеры и разборы →
        </Link>
      </div>
    </section>
  );
}
