// api/products/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        deleted: false,
        available: true,
      },
      orderBy: { id: "desc" },
      include: {
        writer: true,
        publisher: true,
        category: true,
      },
    });

    const cleaned = products
      .map((p: any) => ({
        ...p,
        writer: p.writer?.deleted ? null : p.writer,
        publisher: p.publisher?.deleted ? null : p.publisher,
        category: p.category?.deleted ? null : p.category,
      }))
      .filter(
        (p: any) =>
          p.writer !== null &&
          p.publisher !== null &&
          p.category !== null
      ); // <-- FILTER HERE

    return NextResponse.json(cleaned);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 }
    );
  }
}


export async function POST(req: Request) {
  try {
    const body = await req.json();

    const exists = await prisma.product.findUnique({
      where: { slug: body.slug },
    });

    if (exists) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 400 }
      );
    }

    const writerId = body.writerId ? Number(body.writerId) : null;
    const publisherId = body.publisherId ? Number(body.publisherId) : null;

    const categoryId = Number(body.categoryId);

    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        price: Number(body.price),
        original_price: body.original_price
          ? Number(body.original_price)
          : null,
        // Ensure discount is always an Int (or 0) for Prisma
        discount: body.discount ? Number(body.discount) : 0,
        stock: Number(body.stock),
        available: body.available,

        writerId,
        publisherId,
        categoryId,

        image: body.image,
        gallery: body.gallery || [],
        pdf: body.pdf || null,
      },
    });

    return NextResponse.json(product);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
