import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/* =========================
   GET STOCK LEVELS
   Query: ?productVariantId=1 or ?productId=1
========================= */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const variantIdParam = url.searchParams.get("productVariantId");
    const productIdParam = url.searchParams.get("productId");

    const productVariantId = variantIdParam ? Number(variantIdParam) : null;
    const productId = productIdParam ? Number(productIdParam) : null;

    if (productVariantId && !Number.isNaN(productVariantId)) {
      const levels = await prisma.stockLevel.findMany({
        where: { productVariantId },
        orderBy: { id: "desc" },
        include: { warehouse: true },
      });
      return NextResponse.json(levels);
    }

    if (productId && !Number.isNaN(productId)) {
      const variants = await prisma.productVariant.findMany({
        where: { productId },
        orderBy: { id: "desc" },
        include: {
          stockLevels: {
            include: { warehouse: true },
            orderBy: { id: "desc" },
          },
        },
      });
      return NextResponse.json(variants);
    }

    const levels = await prisma.stockLevel.findMany({
      orderBy: { id: "desc" },
      include: { warehouse: true, variant: true },
    });
    return NextResponse.json(levels);
  } catch (error) {
    console.error("GET STOCK LEVELS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock levels" },
      { status: 500 },
    );
  }
}

/* =========================
   UPSERT STOCK LEVEL
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const warehouseId = Number(body.warehouseId);
    const productVariantId = Number(body.productVariantId);
    const quantity = Number(body.quantity);

    if (!warehouseId || Number.isNaN(warehouseId)) {
      return NextResponse.json(
        { error: "warehouseId is required" },
        { status: 400 },
      );
    }
    if (!productVariantId || Number.isNaN(productVariantId)) {
      return NextResponse.json(
        { error: "productVariantId is required" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      return NextResponse.json(
        { error: "Quantity must be 0 or more" },
        { status: 400 },
      );
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: productVariantId },
      include: { product: { select: { id: true, type: true } } },
    });

    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    if (variant.product.type !== "PHYSICAL") {
      return NextResponse.json(
        { error: "Stock levels are only available for PHYSICAL products" },
        { status: 400 },
      );
    }

    const existing = await prisma.stockLevel.findUnique({
      where: {
        warehouseId_productVariantId: { warehouseId, productVariantId },
      },
    });

    const updated = await prisma.stockLevel.upsert({
      where: {
        warehouseId_productVariantId: { warehouseId, productVariantId },
      },
      create: {
        warehouseId,
        productVariantId,
        quantity,
        reserved: 0,
      },
      update: {
        quantity,
      },
      include: { warehouse: true },
    });

    const oldQty = existing ? Number(existing.quantity) : 0;
    const change = quantity - oldQty;

    const levels = await prisma.stockLevel.findMany({
      where: { productVariantId },
      select: { quantity: true, reserved: true },
    });
    const availableSum = Math.max(
      0,
      levels.reduce(
        (acc, l) => acc + (Number(l.quantity) - Number(l.reserved)),
        0,
      ),
    );

    await prisma.productVariant.update({
      where: { id: productVariantId },
      data: { stock: availableSum },
    });

    if (change !== 0) {
      await prisma.inventoryLog.create({
        data: {
          productId: variant.product.id,
          variantId: productVariantId,
          warehouseId,
          change,
          reason: `Admin stock level adjustment (${updated.warehouse.code})`,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("POST STOCK LEVEL ERROR:", error);
    return NextResponse.json(
      { error: "Failed to save stock level" },
      { status: 500 },
    );
  }
}

