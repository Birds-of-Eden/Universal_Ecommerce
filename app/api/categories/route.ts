// api/categories/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import slugify from "slugify";

/* =========================
   GET ALL CATEGORIES
========================= */
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { deleted: false },
      orderBy: { id: "desc" },
      include: {
        parent: true,
        children: {
          where: { deleted: false },
        },
        _count: {
          select: {
            products: {
              where: { deleted: false },
            },
          },
        },
      },
    });

    const formatted = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId,
      parentName: c.parent?.name || null,
      productCount: c._count.products,
      childrenCount: c.children.length,
      createdAt: c.createdAt,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

/* =========================
   CREATE CATEGORY
========================= */
export async function POST(req: Request) {
  try {
    const { name, parentId } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    const slug = slugify(name, { lower: true, strict: true });

    // Check duplicate slug
    const existing = await prisma.category.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        parentId: parentId || null,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}