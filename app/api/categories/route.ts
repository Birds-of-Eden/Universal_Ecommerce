// api/categories/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { deleted: false },
      orderBy: { id: "desc" },
      include: {
        products: {
          where: { deleted: false },
        },
      },
    });

    const formatted = categories.map((c: any) => ({
      ...c,
      productCount: c.products.length,
    }));

    return NextResponse.json(formatted);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const { name } = await req.json();

    const category = await prisma.category.create({
      data: { name },
    });

    return NextResponse.json(category);
  } catch {
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
}
