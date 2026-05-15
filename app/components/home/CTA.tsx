"use client";

import Link from "next/link";
import styles from "./home.module.css";

export function CTA() {
  return (
    <section className={styles.section} aria-labelledby="cta-title" id="cta">
      <div>
        <p className={styles.kicker}>Следующий шаг</p>
        <h2 className={styles.h2} id="cta-title">
          Посмотрите, что подойдёт именно вашему бизнесу и что даст самый быстрый эффект.
        </h2>
        <p className={styles.subheading}>Откройте анализатор и получите персональные рекомендации по сайту и системе продаж.</p>
      </div>

      <div className={styles.ctaBox}>
        <div className={styles.ctaButtons}>
          <div className={styles.actions}>
            <Link
              className={styles.buttonPrimary}
              href="/analyzer"
              onClick={() => window.ym?.(108548080, "reachGoal", "go_to_analyzer_from_home")}
            >
              Подобрать решение под бизнес
            </Link>
            <Link className={styles.buttonSecondary} href="/blog">
              Примеры разборов
            </Link>
          </div>
          <span className={styles.helper}>После клика откроется анализатор. Никаких лишних шагов.</span>
        </div>
      </div>
    </section>
  );
}
