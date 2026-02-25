import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch("https://hilfulfujulbd.com/api/publishers", {
    next: { revalidate: 3600 },
  });
  const publishers = await res.json();

  const urls = publishers
    .map(
      (pub: any) => `
      <url>
        <loc>https://hilfulfujulbd.com/kitabghor/publishers/${pub.id}</loc>
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
