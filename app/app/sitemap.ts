import type { MetadataRoute } from "next";
import { PostStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const posts = await prisma.post.findMany({
    where: { status: PostStatus.PUBLISHED },
    select: {
      slug: true,
      updatedAt: true,
      publishedAt: true,
    },
    orderBy: { publishedAt: "desc" },
  });

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/blog`,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt || post.publishedAt || undefined,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...postPages];
}
