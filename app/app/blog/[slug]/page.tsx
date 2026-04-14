import type { Metadata } from "next";
import { PostStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { PostContent } from "@/components/PostContent";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeDescription({
  seoDescription,
  excerpt,
  content,
}: {
  seoDescription: string | null;
  excerpt: string | null;
  content: string;
}): string {
  const raw = seoDescription || excerpt || stripHtml(content);
  const trimmed = raw.trim();
  return trimmed.length > 160 ? `${trimmed.slice(0, 157)}...` : trimmed;
}

async function getPublishedPostBySlug(slug: string) {
  return prisma.post.findFirst({
    where: {
      slug,
      status: PostStatus.PUBLISHED,
    },
    select: {
      slug: true,
      title: true,
      excerpt: true,
      coverImageUrl: true,
      content: true,
      seoTitle: true,
      seoDescription: true,
      ctaTitle: true,
      ctaText: true,
      ctaTelegramText: true,
      ctaProductText: true,
      telegramUrl: true,
      productUrl: true,
      publishedAt: true,
      createdAt: true,
    },
  });
}

function decodeSlugParam(raw: string): string {
  const value = (raw || "").trim();
  if (!value) {
    return value;
  }

  // Next route params may come in percent-encoded form for non-latin slugs.
  // Decode defensively to match DB values stored as UTF-8 text.
  if (value.includes("%")) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  return value;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const slug = decodeSlugParam(resolvedParams.slug);
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    return {
      title: "Article not found",
      description: "The requested article does not exist.",
    };
  }

  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/blog/${post.slug}`;
  const title = post.seoTitle?.trim() || post.title;
  const description = makeDescription({
    seoDescription: post.seoDescription,
    excerpt: post.excerpt,
    content: post.content,
  });

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title,
      description,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl, alt: post.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const slug = decodeSlugParam(resolvedParams.slug);
  const post = await getPublishedPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <PostContent
        title={post.title}
        coverImageUrl={post.coverImageUrl}
        content={post.content}
        publishedAt={post.publishedAt}
        createdAt={post.createdAt}
        ctaTitle={post.ctaTitle}
        ctaText={post.ctaText}
        ctaTelegramText={post.ctaTelegramText}
        ctaProductText={post.ctaProductText}
        telegramUrl={post.telegramUrl}
        productUrl={post.productUrl}
      />
    </main>
  );
}
