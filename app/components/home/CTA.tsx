import Link from "next/link";
import styles from "./home.module.css";

export function CTA() {
  return (
    <section className={styles.section} aria-labelledby="cta-title" id="cta">
      <div>
        <p className={styles.kicker}>Финальный шаг</p>
        <h2 className={styles.h2} id="cta-title">
          Проверьте свой сайт и посмотрите, где вы теряете клиентов
        </h2>
        <p className={styles.subheading}>Откройте анализатор — и получите конкретный план, что исправить.</p>
      </div>

      <div className={styles.ctaBox}>
        <div className={styles.ctaButtons}>
          <div className={styles.actions}>
            <Link className={styles.buttonPrimary} href="/analyzer">
              Начать анализ
            </Link>
            <Link className={styles.buttonSecondary} href="/blog">
              Примеры разборов
            </Link>
          </div>
          <span className={styles.helper}>После клика откроется анализатор. Никаких форм.</span>
        </div>
      </div>
    </section>
  );
}

