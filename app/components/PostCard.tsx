import Link from "next/link";
import styles from "./PostCard.module.css";

type PostCardProps = {
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: Date | null;
  createdAt: Date;
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function PostCard({
  title,
  slug,
  excerpt,
  coverImageUrl,
  publishedAt,
  createdAt,
}: PostCardProps) {
  const postDate = publishedAt ?? createdAt;

  return (
    <article className={styles.card}>
      {coverImageUrl ? (
        <img className={styles.cover} src={coverImageUrl} alt={title} loading="lazy" />
      ) : null}

      <div className={styles.body}>
        <p className={styles.date}>{formatDate(postDate)}</p>
        <h2 className={styles.title}>
          <Link href={`/blog/${slug}`}>{title}</Link>
        </h2>
        {excerpt ? <p className={styles.excerpt}>{excerpt}</p> : null}
        <Link href={`/blog/${slug}`} className={styles.link}>
          Читать
        </Link>
      </div>
    </article>
  );
}
