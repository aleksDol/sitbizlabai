import styles from "./PostContent.module.css";

type PostContentProps = {
  title: string;
  content: string;
  coverImageUrl: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  ctaTitle: string | null;
  ctaText: string | null;
  ctaTelegramText: string | null;
  ctaProductText: string | null;
  telegramUrl: string | null;
  productUrl: string | null;
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function PostContent({
  title,
  content,
  coverImageUrl,
  publishedAt,
  createdAt,
  ctaTitle,
  ctaText,
  ctaTelegramText,
  ctaProductText,
  telegramUrl,
  productUrl,
}: PostContentProps) {
  const postDate = publishedAt ?? createdAt;
  const hasCta = Boolean(ctaTitle || ctaText || telegramUrl || productUrl);

  return (
    <article className={styles.article}>
      <p className={styles.date}>{formatDate(postDate)}</p>
      <h1 className={styles.title}>{title}</h1>

      {coverImageUrl ? (
        <div className={styles.coverWrap}>
          <img className={styles.cover} src={coverImageUrl} alt={title} />
        </div>
      ) : null}

      <div className={styles.content} dangerouslySetInnerHTML={{ __html: content }} />

      {hasCta ? (
        <section className={styles.cta} aria-label="Call to action">
          <h2 className={styles.ctaTitle}>{ctaTitle || "Want to go deeper?"}</h2>
          {ctaText ? <p className={styles.ctaText}>{ctaText}</p> : null}
          <div className={styles.ctaButtons}>
            {telegramUrl ? (
              <a
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.primaryButton}
              >
                <span className={styles.telegramIcon} aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false">
                    <path d="M21.8 3.2c-.3-.3-.8-.4-1.4-.2L2.7 9.7c-.6.2-1 .6-1 1.1 0 .6.4 1 .9 1.2l4.6 1.5 1.8 5.7c.1.4.4.7.8.8.1 0 .2.1.4.1.3 0 .6-.1.8-.3l2.6-2.4 4.9 3.6c.2.2.5.3.8.3.1 0 .2 0 .3-.1.4-.1.7-.5.8-.9l3-17.8c.1-.6 0-1.1-.3-1.4ZM18.4 6.2 8.6 14.3c-.2.2-.4.5-.4.8l-.1 1.7-1-3.1c-.1-.3-.4-.6-.7-.7l-3.3-1.1 16-6.2-0.7.5Zm-6 11.1-1.9 1.7.1-3.7 9.4-7.8-7.6 9.8Zm6.3 3.2-5.2-3.8 8.3-10.8-3.1 14.6Z" />
                  </svg>
                </span>
                <span>{ctaTelegramText || "Читай нас в телеграмм"}</span>
              </a>
            ) : null}
            {productUrl ? (
              <a
                href={productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.secondaryButton}
              >
                {ctaProductText || "Open React Product"}
              </a>
            ) : null}
          </div>
        </section>
      ) : null}
    </article>
  );
}
