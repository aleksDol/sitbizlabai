import type { MetadataRoute } from "next";

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
}

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog", "/blog/"],
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
