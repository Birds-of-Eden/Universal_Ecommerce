import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/* =========================
   UPDATE PRODUCT VARIANT
========================= */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const existing = await prisma.productVariant.findUnique({
      where: { id },
      include: { product: { select: { id: true, type: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    const sku =
      body.sku !== undefined
        ? String(body.sku || "")
            .trim()
            .toUpperCase()
        : existing.sku;
    if (!sku) {
      return NextResponse.json({ error: "SKU is required" }, { status: 400 });
    }

    const price =
      body.price !== undefined ? Number(body.price) : Number(existing.price);
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Price is required" }, { status: 400 });
    }

    const currency =
      body.currency !== undefined
        ? String(body.currency || "USD").trim().toUpperCase()
        : existing.currency;

    const newStock =
      body.stock !== undefined ? Number(body.stock) : Number(existing.stock);
    if (!Number.isFinite(newStock) || newStock < 0) {
      return NextResponse.json(
        { error: "Stock must be a number (0 or more)" },
        { status: 400 },
      );
    }

    const stock = existing.product.type === "PHYSICAL" ? newStock : 0;
    const change = stock - Number(existing.stock);

    const updated = await prisma.productVariant.update({
      where: { id },
      data: {
        sku,
        price,
        currency,
        stock,
        digitalAssetId:
          body.digitalAssetId !== undefined
            ? body.digitalAssetId
              ? Number(body.digitalAssetId)
              : null
            : existing.digitalAssetId,
        options:
          body.options !== undefined ? body.options ?? {} : existing.options,
      },
    });

    if (change !== 0) {
      await prisma.inventoryLog.create({
        data: {
          productId: existing.product.id,
          variantId: id,
          change,
          reason: "Admin variant stock adjustment",
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT PRODUCT VARIANT ERROR:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "SKU already exists" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to update variant" },
      { status: 500 },
    );
  }
}

/* =========================
   DELETE PRODUCT VARIANT
========================= */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockLevel.deleteMany({ where: { productVariantId: id } });
      await tx.inventoryLog.deleteMany({ where: { variantId: id } });
      await tx.productVariant.delete({ where: { id } });
    });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("DELETE PRODUCT VARIANT ERROR:", error);
    return NextResponse.json(
      { error: "Failed to delete variant" },
      { status: 500 },
    );
  }
}

