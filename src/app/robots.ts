import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/auth/", "/dashboard", "/plan-builder", "/goals", "/units", "/calculator", "/points"],
    },
    sitemap: "https://odysseyoutdoors.com/sitemap.xml",
  };
}
