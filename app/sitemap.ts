import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://hilfulfujulbd.com",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: "https://hilfulfujulbd.com/ecommerce/books",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    // Child sitemaps
    {
      url: "https://hilfulfujulbd.com/ecommerce/sitemap-books.xml",
      lastModified: new Date(),
    },
    {
      url: "https://hilfulfujulbd.com/ecommerce/sitemap-categories.xml",
      lastModified: new Date(),
    },
    {
      url: "https://hilfulfujulbd.com/ecommerce/sitemap-authors.xml",
      lastModified: new Date(),
    },
    {
      url: "https://hilfulfujulbd.com/ecommerce/sitemap-publishers.xml",
      lastModified: new Date(),
    },
    {
      url: "https://hilfulfujulbd.com/ecommerce/sitemap-blogs.xml",
      lastModified: new Date(),
    },
  ];
}
