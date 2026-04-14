import styles from "./home.module.css";

export function Benefits() {
  return (
    <section className={styles.section} aria-labelledby="benefits">
      <div>
        <p className={styles.kicker}>Что вы получите</p>
        <h2 className={styles.h2} id="benefits">
          Чётко: где теряете клиентов и что делать.
        </h2>
        <p className={styles.subheading}>4 пункта, которые можно прочитать за 10 секунд.</p>
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Почему сайт не даёт заявки</div>
          <div className={styles.cardText}>Что именно не работает: оффер, доверие, путь к форме.</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Где теряются клиенты</div>
          <div className={styles.cardText}>Точки “срыва”: страницы/блоки/формы, где люди уходят.</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Конкретный план улучшений</div>
          <div className={styles.cardText}>С приоритетом: что исправить сначала, что потом.</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Идеи для роста конверсии</div>
          <div className={styles.cardText}>Готовые варианты, которые можно внедрить без “редизайна”.</div>
        </div>
      </div>
    </section>
  );
}

