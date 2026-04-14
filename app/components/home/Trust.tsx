import styles from "./home.module.css";

export function Trust() {
  return (
    <section className={styles.section} aria-labelledby="trust">
      <div>
        <p className={styles.kicker}>Почему этому можно доверять</p>
        <h2 className={styles.h2} id="trust">
          Без “умных слов” — только то, что можно внедрить.
        </h2>
        <p className={styles.subheading}>
          Сервис основан на реальном опыте работы с сайтами и воронками продаж. Мы не просто показываем
          ошибки — мы даём решения, которые можно внедрить.
        </p>
      </div>
    </section>
  );
}

