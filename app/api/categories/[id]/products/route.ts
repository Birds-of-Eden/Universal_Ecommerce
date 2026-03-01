import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getDescendantCategoryIds(rootId: number) {
  const allIds = new Set<number>([rootId]);
  let queue: number[] = [rootId];

  while (queue.length > 0) {
    const parents = queue;
    queue = [];

    const children = await prisma.category.findMany({
      where: {
        deleted: false,
        parentId: { in: parents },
      },
      select: { id: true },
    });

    for (const child of children) {
      if (!allIds.has(child.id)) {
        allIds.add(child.id);
        queue.push(child.id);
      }
    }
  }

  return Array.from(allIds);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const numericId = Number(id);
    const isNumeric = !Number.isNaN(numericId) && String(numericId) === id;

    const category = await prisma.category.findFirst({
      where: isNumeric
        ? { deleted: false, id: numericId }
        : { deleted: false, slug: id },
      select: { id: true, name: true, slug: true },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const categoryIds = await getDescendantCategoryIds(category.id);

    const products = await prisma.product.findMany({
      where: {
        deleted: false,
        categoryId: { in: categoryIds },
      },
      orderBy: { id: "desc" },
      include: {
        category: true,
        brand: true,
        writer: true,
        publisher: true,
        variants: true,
      },
    });

    return NextResponse.json({
      category,
      categoryIds,
      total: products.length,
      products,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load category products" },
      { status: 500 },
    );
  }
}
