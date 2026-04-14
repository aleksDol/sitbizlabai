import { PostStatus } from "@prisma/client";
import { PostCard } from "@/components/PostCard";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

async function getPublishedPosts() {
  return prisma.post.findMany({
    where: { status: PostStatus.PUBLISHED },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImageUrl: true,
      publishedAt: true,
      createdAt: true,
    },
  });
}

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Блог</h1>
      </div>

      {posts.length === 0 ? (
        <p className={styles.empty}>Пока нет опубликованных статей.</p>
      ) : (
        <section className={styles.grid}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              title={post.title}
              slug={post.slug}
              excerpt={post.excerpt}
              coverImageUrl={post.coverImageUrl}
              publishedAt={post.publishedAt}
              createdAt={post.createdAt}
            />
          ))}
        </section>
      )}
    </main>
  );
}
