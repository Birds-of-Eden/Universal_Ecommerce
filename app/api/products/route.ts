import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import slugify from "slugify";

/* =========================
   GET PRODUCTS
========================= */
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        deleted: false,
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

    return NextResponse.json(products);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 }
    );
  }
}

/* =========================
   CREATE PRODUCT
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.name || !body.categoryId || !body.basePrice) {
      return NextResponse.json(
        { error: "Name, category and base price required" },
        { status: 400 }
      );
    }

    const slug = slugify(body.name, { lower: true, strict: true });

    const existing = await prisma.product.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug,
        type: body.type || "PHYSICAL",
        sku: body.sku || null,

        categoryId: Number(body.categoryId),
        brandId: body.brandId ? Number(body.brandId) : null,

        writerId: body.writerId ? Number(body.writerId) : null,
        publisherId: body.publisherId ? Number(body.publisherId) : null,

        description: body.description || "",
        shortDesc: body.shortDesc || null,

        basePrice: Number(body.basePrice),
        originalPrice: body.originalPrice
          ? Number(body.originalPrice)
          : null,
        currency: body.currency || "USD",

        weight: body.weight ? Number(body.weight) : null,
        dimensions: body.dimensions || null,
        VatClassId: body.VatClassId ? Number(body.VatClassId) : null,

        digitalAssetId: body.digitalAssetId
          ? Number(body.digitalAssetId)
          : null,
        serviceDurationMinutes: body.serviceDurationMinutes
          ? Number(body.serviceDurationMinutes)
          : null,
        serviceLocation: body.serviceLocation || null,
        serviceOnlineLink: body.serviceOnlineLink || null,

        available: body.available ?? true,
        featured: body.featured ?? false,

        image: body.image || null,
        gallery: body.gallery || [],
        videoUrl: body.videoUrl || null,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}