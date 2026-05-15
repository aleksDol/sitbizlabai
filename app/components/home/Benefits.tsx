import styles from "./home.module.css";

export function Benefits() {
  return (
    <section className={styles.section} aria-labelledby="benefits">
      <div>
        <p className={styles.kicker}>Что может подойти бизнесу</p>
        <h2 className={styles.h2} id="benefits">
          Не шаблонный "сайт под ключ", а решение под вашу реальную ситуацию в продажах.
        </h2>
        <p className={styles.subheading}>Показываем сценарии: где проблема, какой результат нужен и что лучше внедрить в первую очередь.</p>
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Для B2B: когда трафик есть, а заявок мало</div>
          <div className={styles.cardText}>Отдельные посадочные страницы под рекламу и понятная аналитика заявок, чтобы видеть, что реально приносит сделки.</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Для продаж в Telegram: когда обращения теряются в переписках</div>
          <div className={styles.cardText}>CRM и автоматизация переписок, чтобы не терять клиентов и доводить больше диалогов до оплаты.</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Для услуг: когда клиенту сложно оставить заявку</div>
          <div className={styles.cardText}>Быстрый сценарий заявки и запись без лишних шагов, чтобы люди не уходили на полпути.</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Для онлайн-школ и экспертов: когда не хватает повторных касаний</div>
          <div className={styles.cardText}>AI-консультанты и воронки прогрева, которые помогают возвращать интерес и увеличивать число заявок.</div>
        </div>
      </div>
    </section>
  );
}
