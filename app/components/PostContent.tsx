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

      {coverImageUrl ? <img className={styles.cover} src={coverImageUrl} alt={title} /> : null}

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
                {ctaTelegramText || "Open Telegram"}
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
