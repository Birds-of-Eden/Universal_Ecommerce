import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch("https://hilfulfujulbd.com/api/writers", {
    next: { revalidate: 3600 },
  });
  const authors = await res.json();

  const urls = authors
    .map(
      (author: any) => `
      <url>
        <loc>https://hilfulfujulbd.com/kitabghor/authors/${author.id}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
      </url>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${urls}
  </urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
