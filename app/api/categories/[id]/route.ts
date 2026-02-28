// api/categories/[id]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import slugify from "slugify";

/* =========================
   GET SINGLE CATEGORY
========================= */
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = Number(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid category id" },
        { status: 400 },
      );
    }

    const category = await prisma.category.findFirst({
      where: { id, deleted: false },
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
        products: {
          where: { deleted: false },
          include: {
            writer: true,
            brand: true,
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.image, // ✅ added
      parentId: category.parentId,
      parentName: category.parent?.name || null,
      productCount: category._count.products,
      childrenCount: category.children.length,
      products: category.products,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 },
    );
  }
}

/* =========================
   UPDATE CATEGORY
========================= */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = Number(params.id);
    const { name, parentId, image } = await req.json();

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid category id" },
        { status: 400 },
      );
    }

    const existing = await prisma.category.findFirst({
      where: { id, deleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    let slug;
    if (name) {
      slug = slugify(name, { lower: true, strict: true });

      const duplicate = await prisma.category.findFirst({
        where: {
          slug,
          NOT: { id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "Category name already exists" },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        slug: slug ?? existing.slug,
        image: image !== undefined ? image : existing.image, // ✅ added
        parentId: parentId ?? existing.parentId,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 },
    );
  }
}

/* =========================
   SOFT DELETE CATEGORY
========================= */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const id = Number(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid category id" },
        { status: 400 },
      );
    }

    const existing = await prisma.category.findFirst({
      where: { id, deleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 },
      );
    }

    await prisma.category.update({
      where: { id },
      data: { deleted: true },
    });

    return NextResponse.json({
      message: "Category soft deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 },
    );
  }
}
