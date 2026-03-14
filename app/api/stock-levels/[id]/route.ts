import { prisma } from "@/lib/prisma";
import { refreshVariantStock } from "@/lib/inventory";
import { captureVariantInventoryDailySnapshots } from "@/lib/report-history";
import { NextResponse } from "next/server";

/* =========================
   DELETE STOCK LEVEL
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

    const existing = await prisma.stockLevel.findUnique({
      where: { id },
      include: {
        warehouse: true,
        variant: {
          include: { product: { select: { id: true, type: true } } },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Stock level not found" },
        { status: 404 },
      );
    }

    await prisma.stockLevel.delete({ where: { id } });

    await refreshVariantStock(prisma, existing.productVariantId);
    await captureVariantInventoryDailySnapshots(prisma, existing.productVariantId);

    const change = -Number(existing.quantity);
    if (change !== 0 && existing.variant.product.type === "PHYSICAL") {
      await prisma.inventoryLog.create({
        data: {
          productId: existing.variant.product.id,
          variantId: existing.productVariantId,
          warehouseId: existing.warehouseId,
          change,
          reason: `Admin stock level deleted (${existing.warehouse.code})`,
        },
      });
    }

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("DELETE STOCK LEVEL ERROR:", error);
    return NextResponse.json(
      { error: "Failed to delete stock level" },
      { status: 500 },
    );
  }
}
