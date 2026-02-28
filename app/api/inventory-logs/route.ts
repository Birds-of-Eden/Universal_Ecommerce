import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/* =========================
   GET INVENTORY LOGS
   Query: ?productId=1 (recommended) or ?variantId=1
========================= */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const productIdParam = url.searchParams.get("productId");
    const variantIdParam = url.searchParams.get("variantId");

    const productId = productIdParam ? Number(productIdParam) : null;
    const variantId = variantIdParam ? Number(variantIdParam) : null;

    const logs = await prisma.inventoryLog.findMany({
      where: {
        ...(productId && !Number.isNaN(productId) ? { productId } : {}),
        ...(variantId && !Number.isNaN(variantId) ? { variantId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        variant: { select: { id: true, sku: true } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
      take: 200,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("GET INVENTORY LOGS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory logs" },
      { status: 500 },
    );
  }
}

