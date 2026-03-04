import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/dashboard/",
          "/auth/",
          "/login/",
          "/register/",
          "/api/admin/",
          "/api/auth",
          "/api/cart",
          "/api/user",
          "/_next/",
          "/private/",
        ],
      },
    ],
    sitemap: [
      "https://hilfulfujulbd.com/sitemap.xml",
      "https://hilfulfujulbd.com/ecommerce/sitemap-books.xml",
      "https://hilfulfujulbd.com/ecommerce/sitemap-categories.xml",
      "https://hilfulfujulbd.com/ecommerce/sitemap-authors.xml",
      "https://hilfulfujulbd.com/ecommerce/sitemap-publishers.xml",
      "https://hilfulfujulbd.com/ecommerce/sitemap-blogs.xml",
    ],
    host: "https://hilfulfujulbd.com",
  };
}
