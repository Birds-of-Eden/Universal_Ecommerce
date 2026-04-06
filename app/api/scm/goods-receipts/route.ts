import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import { receiveVariantInventory } from "@/lib/inventory";
import {
  computePurchaseOrderLandedCostAllocation,
  generateGoodsReceiptNumber,
  getPurchaseOrderLandedCostLockReason,
  goodsReceiptInclude,
  purchaseOrderInclude,
  refreshPurchaseOrderReceiptStatus,
  toGoodsReceiptLogSnapshot,
} from "@/lib/scm";
import { Prisma } from "@/generated/prisma";

const GOODS_RECEIPT_READ_PERMISSIONS = [
  "goods_receipts.read",
  "goods_receipts.manage",
] as const;

function toCleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function canReadGoodsReceipts(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return access.hasAny([...GOODS_RECEIPT_READ_PERMISSIONS]);
}

function hasGlobalGoodsReceiptScope(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return GOODS_RECEIPT_READ_PERMISSIONS.some((permission) => access.hasGlobal(permission));
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(
      session?.user as { id?: string; role?: string } | undefined,
    );

    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canReadGoodsReceipts(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const purchaseOrderId = Number(
      request.nextUrl.searchParams.get("purchaseOrderId") || "",
    );
    const warehouseId = Number(request.nextUrl.searchParams.get("warehouseId") || "");

    const where: Record<string, unknown> = {};
    if (Number.isInteger(purchaseOrderId) && purchaseOrderId > 0) {
      where.purchaseOrderId = purchaseOrderId;
    }

    if (hasGlobalGoodsReceiptScope(access)) {
      if (Number.isInteger(warehouseId) && warehouseId > 0) {
        where.warehouseId = warehouseId;
      }
    } else if (Number.isInteger(warehouseId) && warehouseId > 0) {
      if (!access.canAccessWarehouse(warehouseId)) {
        return NextResponse.json([]);
      }
      where.warehouseId = warehouseId;
    } else if (access.warehouseIds.length > 0) {
      where.warehouseId = { in: access.warehouseIds };
    } else {
      return NextResponse.json([]);
    }

    const receipts = await prisma.goodsReceipt.findMany({
      where,
      orderBy: [{ receivedAt: "desc" }, { id: "desc" }],
      include: goodsReceiptInclude,
    });

    return NextResponse.json(receipts);
  } catch (error) {
    console.error("SCM GOODS RECEIPTS GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load goods receipts." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(
      session?.user as { id?: string; role?: string } | undefined,
    );

    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      purchaseOrderId?: unknown;
      note?: unknown;
      items?: Array<{
        purchaseOrderItemId?: unknown;
        quantityReceived?: unknown;
      }>;
    };

    const purchaseOrderId = Number(body.purchaseOrderId);
    if (!Number.isInteger(purchaseOrderId) || purchaseOrderId <= 0) {
      return NextResponse.json(
        { error: "Purchase order is required." },
        { status: 400 },
      );
    }

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: purchaseOrderInclude,
    });
    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found." },
        { status: 404 },
      );
    }
    if (!access.can("goods_receipts.manage", purchaseOrder.warehouseId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!["APPROVED", "PARTIALLY_RECEIVED"].includes(purchaseOrder.status)) {
      return NextResponse.json(
        {
          error:
            "Only approved or partially received purchase orders can be received into stock.",
        },
        { status: 400 },
      );
    }

    const items = Array.isArray(body.items) ? body.items : [];
    const normalizedItems = items
      .map((item, index) => {
        const purchaseOrderItemId = Number(item.purchaseOrderItemId);
        const quantityReceived = Number(item.quantityReceived);
        if (!Number.isInteger(purchaseOrderItemId) || purchaseOrderItemId <= 0) {
          throw new Error(`Item ${index + 1}: purchase order item is required`);
        }
        if (!Number.isInteger(quantityReceived) || quantityReceived <= 0) {
          throw new Error(`Item ${index + 1}: quantity must be greater than 0`);
        }
        return {
          purchaseOrderItemId,
          quantityReceived,
        };
      })
      .filter((item) => item.quantityReceived > 0);

    if (normalizedItems.length === 0) {
      return NextResponse.json(
        { error: "At least one receipt line with a positive quantity is required." },
        { status: 400 },
      );
    }

    const purchaseOrderItemMap = new Map(
      purchaseOrder.items.map((item) => [item.id, item]),
    );
    const landedAllocation = computePurchaseOrderLandedCostAllocation(
      purchaseOrder.items.map((item) => ({
        id: item.id,
        quantityOrdered: item.quantityOrdered,
        unitCost: item.unitCost,
      })),
      purchaseOrder.landedCosts.map((cost) => ({
        amount: cost.amount,
      })),
    );
    const landedAllocationByItemId = new Map(
      landedAllocation.lines.map((line) => [line.purchaseOrderItemId, line]),
    );
    const landedCostLockedReason = getPurchaseOrderLandedCostLockReason({
      status: purchaseOrder.status,
      hasGoodsReceipts: purchaseOrder.goodsReceipts.length > 0,
    });
    for (const item of normalizedItems) {
      const purchaseOrderItem = purchaseOrderItemMap.get(item.purchaseOrderItemId);
      if (!purchaseOrderItem) {
        return NextResponse.json(
          { error: `Purchase order item ${item.purchaseOrderItemId} not found.` },
          { status: 400 },
        );
      }
      const remaining =
        purchaseOrderItem.quantityOrdered - purchaseOrderItem.quantityReceived;
      if (item.quantityReceived > remaining) {
        return NextResponse.json(
          {
            error: `Receipt quantity for ${purchaseOrderItem.productVariant.sku} exceeds remaining quantity.`,
          },
          { status: 400 },
        );
      }
    }

    const createdReceipt = await prisma.$transaction(async (tx) => {
      const receiptNumber = await generateGoodsReceiptNumber(tx);
      const created = await tx.goodsReceipt.create({
        data: {
          receiptNumber,
          purchaseOrderId: purchaseOrder.id,
          warehouseId: purchaseOrder.warehouseId,
          note: toCleanText(body.note, 500) || null,
          receivedById: access.userId,
        },
      });

      for (const item of normalizedItems) {
        const purchaseOrderItem = purchaseOrderItemMap.get(item.purchaseOrderItemId);
        if (!purchaseOrderItem) {
          throw new Error("Purchase order item lookup failed");
        }

        await tx.purchaseOrderItem.update({
          where: { id: purchaseOrderItem.id },
          data: {
            quantityReceived: {
              increment: item.quantityReceived,
            },
          },
        });

        await tx.goodsReceiptItem.create({
          data: {
            goodsReceiptId: created.id,
            purchaseOrderItemId: purchaseOrderItem.id,
            productVariantId: purchaseOrderItem.productVariantId,
            quantityReceived: item.quantityReceived,
            unitCost: (
              landedAllocationByItemId.get(purchaseOrderItem.id)?.effectiveUnitCost ??
              purchaseOrderItem.unitCost
            ).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
          },
        });

        await receiveVariantInventory({
          tx,
          productId: purchaseOrderItem.productVariant.productId,
          productVariantId: purchaseOrderItem.productVariantId,
          warehouseId: purchaseOrder.warehouseId,
          quantity: item.quantityReceived,
          reason: `Goods receipt ${receiptNumber} against ${purchaseOrder.poNumber}`,
        });
      }

      await refreshPurchaseOrderReceiptStatus(tx, purchaseOrder.id);

      const receipt = await tx.goodsReceipt.findUnique({
        where: { id: created.id },
        include: goodsReceiptInclude,
      });
      if (!receipt) {
        throw new Error("Goods receipt lookup failed after create");
      }
      return receipt;
    });

    await logActivity({
      action: "create",
      entity: "goods_receipt",
      entityId: createdReceipt.id,
      access,
      request,
      metadata: {
        message: `Received goods via ${createdReceipt.receiptNumber} for ${createdReceipt.purchaseOrder.poNumber}${landedCostLockedReason ? " (landed costs locked after receipt)" : ""}`,
      },
      after: toGoodsReceiptLogSnapshot(createdReceipt),
    });

    return NextResponse.json(createdReceipt, { status: 201 });
  } catch (error: any) {
    console.error("SCM GOODS RECEIPTS POST ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create goods receipt." },
      { status: 500 },
    );
  }
}
