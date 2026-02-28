import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/* =========================
   GET PRODUCT VARIANTS
   Optional query: ?productId=1
========================= */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const productIdParam = url.searchParams.get("productId");
    const productId = productIdParam ? Number(productIdParam) : null;

    const variants = await prisma.productVariant.findMany({
      where: productId ? { productId } : undefined,
      orderBy: { id: "desc" },
      include: {
        stockLevels: {
          include: { warehouse: true },
          orderBy: { id: "desc" },
        },
      },
    });

    return NextResponse.json(variants);
  } catch (error) {
    console.error("GET PRODUCT VARIANTS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch variants" },
      { status: 500 },
    );
  }
}

/* =========================
   CREATE PRODUCT VARIANT
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const productId = Number(body.productId);
    if (!productId || Number.isNaN(productId)) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 },
      );
    }

    const sku = String(body.sku || "")
      .trim()
      .toUpperCase();
    if (!sku) {
      return NextResponse.json({ error: "SKU is required" }, { status: 400 });
    }

    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Price is required" }, { status: 400 });
    }

    const currency = String(body.currency || "USD").trim().toUpperCase();
    const stock = body.stock !== undefined ? Number(body.stock) : 0;
    if (!Number.isFinite(stock) || stock < 0) {
      return NextResponse.json(
        { error: "Stock must be a number (0 or more)" },
        { status: 400 },
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, type: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const initialStock = product.type === "PHYSICAL" ? stock : 0;

    const created = await prisma.productVariant.create({
      data: {
        productId,
        sku,
        price,
        currency,
        stock: initialStock,
        digitalAssetId: body.digitalAssetId ? Number(body.digitalAssetId) : null,
        options: body.options ?? {},
      },
    });

    if (initialStock !== 0) {
      await prisma.inventoryLog.create({
        data: {
          productId,
          variantId: created.id,
          change: initialStock,
          reason: "Admin variant initial stock",
        },
      });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("POST PRODUCT VARIANT ERROR:", error);
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "SKU already exists" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create variant" },
      { status: 500 },
    );
  }
}

