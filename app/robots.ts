import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://riffoff.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/events", "/events/*"],
        disallow: ["/dashboard", "/api", "/callback", "/payment"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
