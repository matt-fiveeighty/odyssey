import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/auth/", "/api/", "/dashboard", "/plan-builder", "/goals", "/units", "/calculator", "/points", "/settings"],
    },
    sitemap: "https://odysseyoutdoors.com/sitemap.xml",
  };
}
