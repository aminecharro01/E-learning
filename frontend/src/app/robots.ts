import { headers } from "next/headers";
import type { MetadataRoute } from "next";

async function siteUrl() {
  const h = await headers();
  const host = h.get("host") || "localhost:3000";
  const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${proto}://${host}`;
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/cgu"],
      // Auth flow, the authenticated learner/admin shells, and per-user certificate pages
      // have nothing for a crawler to index — keep them out of crawl budget.
      disallow: [
        "/app/",
        "/admin/",
        "/login",
        "/register",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
        "/complete-profile",
        "/verify/",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
