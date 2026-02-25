import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch("https://hilfulfujulbd.com/api/products", {
    next: { revalidate: 3600 },
  });
  const products = await res.json();

  const urls = products
    .map(
      (product: any) => `
      <url>
        <loc>https://hilfulfujulbd.com/kitabghor/books/${product.id}</loc>
        <lastmod>${new Date().toISOString()}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.9</priority>
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
