// api/brands/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import slugify from "slugify";

/* =========================
   GET ALL BRANDS
========================= */
export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      where: { deleted: false },
      orderBy: { id: "desc" },
      include: {
        _count: {
          select: {
            products: {
              where: { deleted: false },
            },
          },
        },
      },
    });

    return NextResponse.json(
      brands.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        logo: b.logo,
        productCount: b._count.products,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      }))
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}

/* =========================
   CREATE BRAND
========================= */
export async function POST(req: Request) {
  try {
    const { name, logo } = await req.json();

    if (!name)
      return NextResponse.json(
        { error: "Brand name required" },
        { status: 400 }
      );

    const slug = slugify(name, { lower: true, strict: true });

    const exists = await prisma.brand.findUnique({
      where: { slug },
    });

    if (exists)
      return NextResponse.json(
        { error: "Brand already exists" },
        { status: 400 }
      );

    const brand = await prisma.brand.create({
      data: {
        name,
        slug,
        logo: logo || null,
      },
    });

    return NextResponse.json(brand, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to create brand" },
      { status: 500 }
    );
  }
}