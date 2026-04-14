import Link from "next/link";
import styles from "./home.module.css";

type HeroProps = {
  productUrl?: string;
};

export function Hero({ productUrl }: HeroProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.heroBadges}>
        <span className={styles.badge}>1 минута</span>
        <span className={styles.badge}>Слабые места</span>
        <span className={styles.badge}>Потери денег</span>
      </div>

      <h1 className={styles.heroTitle}>Анализ сайта, который показывает, где вы теряете деньги</h1>

      <p className={styles.heroLead}>
        За 1 минуту получите разбор сайта: слабые места, потери и план, как увеличить заявки
      </p>

      <div className={styles.actions}>
        <Link className={styles.buttonPrimary} href="/analyzer">
          Проверить сайт
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

