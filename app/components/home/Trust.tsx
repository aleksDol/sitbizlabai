import styles from "./home.module.css";

export function Trust() {
  return (
    <section className={styles.section} aria-labelledby="trust">
      <div>
        <p className={styles.kicker}>С чем чаще всего приходят</p>
        <h2 className={styles.h2} id="trust">
          Боли, из-за которых бизнес теряет заявки и клиентов.
        </h2>
        <p className={styles.subheading}>Пишем по-человечески и сразу показываем, что может дать быстрый эффект.</p>
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Заявки теряются в переписках</div>
          <div className={styles.cardText}>Система, которая помогает не терять обращения и быстрее доводить клиента до сделки.</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Реклама идёт, а обращений мало</div>
          <div className={styles.cardText}>Страница, которая быстрее доводит рекламный трафик до заявки, а не просто собирает клики.</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Менеджеры отвечают слишком долго</div>
          <div className={styles.cardText}>Автоматизация первых ответов и повторных касаний, чтобы клиент не уходил к конкурентам.</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Нет повторных продаж и всё держится на ручной работе</div>
          <div className={styles.cardText}>Простой сценарий возврата клиентов и продаж, который снимает рутину с команды.</div>
        </div>
      </div>
    </section>
  );
}
