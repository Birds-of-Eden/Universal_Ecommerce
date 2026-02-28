import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import slugify from "slugify";

/* =========================
   GET SINGLE PRODUCT
========================= */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid product id" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findFirst({
      where: {
        id,
        deleted: false,
      },
      include: {
        category: true,
        brand: true,
        writer: true,
        publisher: true,
        variants: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

/* =========================
   UPDATE PRODUCT
========================= */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid product id" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const existing = await prisma.product.findFirst({
      where: { id, deleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    let slug = existing.slug;

    if (body.name && body.name !== existing.name) {
      slug = slugify(body.name, { lower: true, strict: true });

      const duplicate = await prisma.product.findFirst({
        where: {
          slug,
          NOT: { id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "Slug already exists" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        slug,

        type: body.type ?? existing.type,
        sku: body.sku ?? existing.sku,

        categoryId: body.categoryId
          ? Number(body.categoryId)
          : existing.categoryId,

        brandId:
          body.brandId !== undefined
            ? body.brandId
              ? Number(body.brandId)
              : null
            : existing.brandId,

        writerId:
          body.writerId !== undefined
            ? body.writerId
              ? Number(body.writerId)
              : null
            : existing.writerId,

        publisherId:
          body.publisherId !== undefined
            ? body.publisherId
              ? Number(body.publisherId)
              : null
            : existing.publisherId,

        description: body.description ?? existing.description,
        shortDesc: body.shortDesc ?? existing.shortDesc,

        basePrice: body.basePrice
          ? Number(body.basePrice)
          : existing.basePrice,

        originalPrice:
          body.originalPrice !== undefined
            ? body.originalPrice
              ? Number(body.originalPrice)
              : null
            : existing.originalPrice,

        currency: body.currency ?? existing.currency,

        weight:
          body.weight !== undefined
            ? body.weight
              ? Number(body.weight)
              : null
            : existing.weight,

        dimensions: body.dimensions ?? existing.dimensions,
        VatClassId:
          body.VatClassId !== undefined
            ? body.VatClassId
              ? Number(body.VatClassId)
              : null
            : existing.VatClassId,

        digitalAssetId:
          body.digitalAssetId !== undefined
            ? body.digitalAssetId
              ? Number(body.digitalAssetId)
              : null
            : existing.digitalAssetId,

        serviceDurationMinutes:
          body.serviceDurationMinutes !== undefined
            ? body.serviceDurationMinutes
              ? Number(body.serviceDurationMinutes)
              : null
            : existing.serviceDurationMinutes,

        serviceLocation:
          body.serviceLocation ?? existing.serviceLocation,

        serviceOnlineLink:
          body.serviceOnlineLink ?? existing.serviceOnlineLink,

        available:
          body.available !== undefined
            ? body.available
            : existing.available,

        featured:
          body.featured !== undefined
            ? body.featured
            : existing.featured,

        image: body.image ?? existing.image,
        gallery: body.gallery ?? existing.gallery,
        videoUrl: body.videoUrl ?? existing.videoUrl,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

/* =========================
   SOFT DELETE PRODUCT
========================= */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);

    if (isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid product id" },
        { status: 400 }
      );
    }

    const existing = await prisma.product.findFirst({
      where: { id, deleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    await prisma.product.update({
      where: { id },
      data: { deleted: true },
    });

    return NextResponse.json({
      message: "Product soft deleted successfully",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}