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

    for (const c of children) {
      if (!allIds.has(c.id)) {
        allIds.add(c.id);
        queue.push(c.id);
      }
    }
  }

  return Array.from(allIds);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ param: string }> }
) {
  try {
    const { param } = await params;

    // ✅ param numeric হলে id হিসেবে ধরবো, না হলে slug
    const numericId = Number(param);
    const isNumeric = !Number.isNaN(numericId) && String(numericId) === param;

    const category = await prisma.category.findFirst({
      where: isNumeric
        ? { deleted: false, id: numericId }
        : { deleted: false, slug: param },
      select: { id: true, name: true, slug: true },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // ✅ এই category + তার সব child/sub category id
    const ids = await getDescendantCategoryIds(category.id);

    const products = await prisma.product.findMany({
      where: {
        deleted: false,
        categoryId: { in: ids },
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
      categoryIds: ids,
      total: products.length,
      products,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to load category products" },
      { status: 500 }
    );
  }
}