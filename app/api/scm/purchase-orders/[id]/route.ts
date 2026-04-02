import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import { purchaseOrderInclude, toPurchaseOrderLogSnapshot } from "@/lib/scm";

const PURCHASE_ORDER_READ_PERMISSIONS = [
  "purchase_orders.read",
  "purchase_orders.manage",
  "purchase_orders.approve",
  "goods_receipts.manage",
] as const;

function toCleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function canReadPurchaseOrders(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return access.hasAny([...PURCHASE_ORDER_READ_PERMISSIONS]);
}

function hasGlobalPurchaseOrderScope(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return PURCHASE_ORDER_READ_PERMISSIONS.some((permission) => access.hasGlobal(permission));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const purchaseOrderId = Number(id);
    if (!Number.isInteger(purchaseOrderId) || purchaseOrderId <= 0) {
      return NextResponse.json(
        { error: "Invalid purchase order id." },
        { status: 400 },
      );
    }

    const session = await getServerSession(authOptions);
    const access = await getAccessContext(
      session?.user as { id?: string; role?: string } | undefined,
    );

    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canReadPurchaseOrders(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    if (
      !hasGlobalPurchaseOrderScope(access) &&
      !access.canAccessWarehouse(purchaseOrder.warehouseId)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(purchaseOrder);
  } catch (error) {
    console.error("SCM PURCHASE ORDER GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load purchase order." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const purchaseOrderId = Number(id);
    if (!Number.isInteger(purchaseOrderId) || purchaseOrderId <= 0) {
      return NextResponse.json(
        { error: "Invalid purchase order id." },
        { status: 400 },
      );
    }

    const session = await getServerSession(authOptions);
    const access = await getAccessContext(
      session?.user as { id?: string; role?: string } | undefined,
    );

    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    if (
      !hasGlobalPurchaseOrderScope(access) &&
      !access.canAccessWarehouse(purchaseOrder.warehouseId)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      expectedAt?: unknown;
      notes?: unknown;
    };
    const action = typeof body.action === "string" ? body.action.trim().toLowerCase() : "";
    const before = toPurchaseOrderLogSnapshot(purchaseOrder);

    let data: Record<string, unknown>;
    if (action === "submit") {
      if (!access.can("purchase_orders.manage", purchaseOrder.warehouseId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (purchaseOrder.status !== "DRAFT") {
        return NextResponse.json(
          { error: "Only draft purchase orders can be submitted." },
          { status: 400 },
        );
      }
      data = {
        status: "SUBMITTED",
        submittedAt: new Date(),
      };
    } else if (action === "approve") {
      if (!access.can("purchase_orders.approve", purchaseOrder.warehouseId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (purchaseOrder.status !== "SUBMITTED") {
        return NextResponse.json(
          { error: "Only submitted purchase orders can be approved." },
          { status: 400 },
        );
      }
      data = {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: access.userId,
      };
    } else if (action === "cancel") {
      if (
        !access.can("purchase_orders.manage", purchaseOrder.warehouseId) &&
        !access.can("purchase_orders.approve", purchaseOrder.warehouseId)
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!["DRAFT", "SUBMITTED", "APPROVED"].includes(purchaseOrder.status)) {
        return NextResponse.json(
          { error: "This purchase order can no longer be cancelled." },
          { status: 400 },
        );
      }
      data = {
        status: "CANCELLED",
      };
    } else {
      if (!access.can("purchase_orders.manage", purchaseOrder.warehouseId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (purchaseOrder.status !== "DRAFT") {
        return NextResponse.json(
          { error: "Only draft purchase orders can be edited." },
          { status: 400 },
        );
      }
      const expectedAt = body.expectedAt ? new Date(String(body.expectedAt)) : null;
      if (expectedAt && Number.isNaN(expectedAt.getTime())) {
        return NextResponse.json(
          { error: "Expected date is invalid." },
          { status: 400 },
        );
      }
      data = {
        expectedAt,
        notes: toCleanText(body.notes, 500) || null,
      };
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data,
      include: purchaseOrderInclude,
    });

    await logActivity({
      action: action || "update",
      entity: "purchase_order",
      entityId: updated.id,
      access,
      request,
      metadata: {
        message: `${action || "Updated"} purchase order ${updated.poNumber}`,
      },
      before,
      after: toPurchaseOrderLogSnapshot(updated),
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("SCM PURCHASE ORDER PATCH ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update purchase order." },
      { status: 500 },
    );
  }
}
