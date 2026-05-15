import styles from "./home.module.css";

export function HowItWorks() {
  return (
    <section className={styles.section} aria-labelledby="how-it-works">
      <div>
        <p className={styles.kicker}>Как это работает</p>
        <h2 className={styles.h2} id="how-it-works">
          Три простых шага, чтобы понять, что даст рост именно вашему бизнесу.
        </h2>
        <p className={styles.subheading}>Без сложных терминов и перегруза. Только то, что можно использовать в работе.</p>
      </div>

      <div className={styles.grid3}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>1. Опишите бизнес</div>
          <div className={styles.cardText}>Коротко: чем занимаетесь, откуда приходят клиенты и как сейчас идут продажи.</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>2. AI анализирует вашу ситуацию</div>
          <div className={styles.cardText}>Проверяет, как устроены продажи, где могут теряться заявки и какие инструменты подойдут именно вам.</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>3. Получите план действий</div>
          <div className={styles.cardText}>Персональные рекомендации, подходящие решения и понятный план внедрения под ваш бизнес.</div>
        </div>
      </div>
    </section>
  );
}
