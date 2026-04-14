import styles from "./home.module.css";

export function HowItWorks() {
  return (
    <section className={styles.section} aria-labelledby="how-it-works">
      <div>
        <p className={styles.kicker}>Как это работает</p>
        <h2 className={styles.h2} id="how-it-works">
          Три шага — и вы видите, что съедает заявки.
        </h2>
        <p className={styles.subheading}>Коротко, по делу, без “общих рекомендаций”.</p>
      </div>

      <div className={styles.grid3}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>1. Вставляете ссылку на сайт</div>
          <div className={styles.cardText}>Без доступов и настроек.</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>2. Сервис анализирует оффер, структуру и конверсию</div>
          <div className={styles.cardText}>
            Находит места, где пользователь не понимает, сомневается или бросает заявку.
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>3. Получаете конкретный план, что исправить</div>
          <div className={styles.cardText}>С приоритетами: что даст эффект быстрее.</div>
        </div>
      </div>
    </section>
  );
}

