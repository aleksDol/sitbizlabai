import type { Metadata } from "next";
import { PostStatus } from "@prisma/client";
import { PostCard } from "@/components/PostCard";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
}

const BLOG_TITLE = "Блог SiteBizAI";
const BLOG_DESCRIPTION = "Разборы сайтов, SEO, UX и конверсии: практические советы и кейсы для роста заявок.";

export function generateMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/blog`;

  return {
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: BLOG_TITLE,
      description: BLOG_DESCRIPTION,
      siteName: "SiteBizAI",
    },
    twitter: {
      card: "summary_large_image",
      title: BLOG_TITLE,
      description: BLOG_DESCRIPTION,
    },
  };
}

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
