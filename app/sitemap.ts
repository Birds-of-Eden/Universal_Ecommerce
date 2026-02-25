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
      url: "https://hilfulfujulbd.com/kitabghor/books",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    // Child sitemaps
    {
      url: "https://hilfulfujulbd.com/kitabghor/sitemap-books.xml",
      lastModified: new Date(),
    },
    {
      url: "https://hilfulfujulbd.com/kitabghor/sitemap-categories.xml",
      lastModified: new Date(),
    },
    {
      url: "https://hilfulfujulbd.com/kitabghor/sitemap-authors.xml",
      lastModified: new Date(),
    },
    {
      url: "https://hilfulfujulbd.com/kitabghor/sitemap-publishers.xml",
      lastModified: new Date(),
    },
    {
      url: "https://hilfulfujulbd.com/kitabghor/sitemap-blogs.xml",
      lastModified: new Date(),
    },
  ];
}
