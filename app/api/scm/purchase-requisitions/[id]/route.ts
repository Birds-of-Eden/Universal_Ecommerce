import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import {
  computePurchaseOrderTotals,
  generatePurchaseOrderNumber,
  purchaseOrderInclude,
  purchaseRequisitionInclude,
  toDecimalAmount,
  toPurchaseOrderLogSnapshot,
  toPurchaseRequisitionLogSnapshot,
} from "@/lib/scm";

const PURCHASE_REQUISITION_READ_PERMISSIONS = [
  "purchase_requisitions.read",
  "purchase_requisitions.manage",
  "purchase_requisitions.approve",
] as const;

function toCleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function canReadPurchaseRequisitions(
  access: Awaited<ReturnType<typeof getAccessContext>>,
) {
  return access.hasAny([...PURCHASE_REQUISITION_READ_PERMISSIONS]);
}

function hasGlobalPurchaseRequisitionScope(
  access: Awaited<ReturnType<typeof getAccessContext>>,
) {
  return PURCHASE_REQUISITION_READ_PERMISSIONS.some((permission) =>
    access.hasGlobal(permission),
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const requisitionId = Number(id);
    if (!Number.isInteger(requisitionId) || requisitionId <= 0) {
      return NextResponse.json(
        { error: "Invalid purchase requisition id." },
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
    if (!canReadPurchaseRequisitions(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requisition = await prisma.purchaseRequisition.findUnique({
      where: { id: requisitionId },
      include: purchaseRequisitionInclude,
    });
    if (!requisition) {
      return NextResponse.json(
        { error: "Purchase requisition not found." },
        { status: 404 },
      );
    }
    if (
      !hasGlobalPurchaseRequisitionScope(access) &&
      !access.canAccessWarehouse(requisition.warehouseId)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(requisition);
  } catch (error) {
    console.error("SCM PURCHASE REQUISITION GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load purchase requisition." },
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
    const requisitionId = Number(id);
    if (!Number.isInteger(requisitionId) || requisitionId <= 0) {
      return NextResponse.json(
        { error: "Invalid purchase requisition id." },
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

    const requisition = await prisma.purchaseRequisition.findUnique({
      where: { id: requisitionId },
      include: purchaseRequisitionInclude,
    });
    if (!requisition) {
      return NextResponse.json(
        { error: "Purchase requisition not found." },
        { status: 404 },
      );
    }
    if (
      !hasGlobalPurchaseRequisitionScope(access) &&
      !access.canAccessWarehouse(requisition.warehouseId)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      neededBy?: unknown;
      note?: unknown;
      supplierId?: unknown;
      expectedAt?: unknown;
      notes?: unknown;
      unitCosts?: Array<{
        itemId?: unknown;
        unitCost?: unknown;
      }>;
    };
    const action = typeof body.action === "string" ? body.action.trim().toLowerCase() : "";
    const before = toPurchaseRequisitionLogSnapshot(requisition);

    if (!action) {
      if (!access.can("purchase_requisitions.manage", requisition.warehouseId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (requisition.status !== "DRAFT") {
        return NextResponse.json(
          { error: "Only draft requisitions can be edited." },
          { status: 400 },
        );
      }
      const neededBy = body.neededBy ? new Date(String(body.neededBy)) : null;
      if (neededBy && Number.isNaN(neededBy.getTime())) {
        return NextResponse.json(
          { error: "Needed-by date is invalid." },
          { status: 400 },
        );
      }

      const updated = await prisma.purchaseRequisition.update({
        where: { id: requisition.id },
        data: {
          neededBy,
          note: toCleanText(body.note, 500) || null,
        },
        include: purchaseRequisitionInclude,
      });

      await logActivity({
        action: "update",
        entity: "purchase_requisition",
        entityId: updated.id,
        access,
        request,
        metadata: {
          message: `Updated purchase requisition ${updated.requisitionNumber}`,
        },
        before,
        after: toPurchaseRequisitionLogSnapshot(updated),
      });

      return NextResponse.json(updated);
    }

    if (action === "submit") {
      if (!access.can("purchase_requisitions.manage", requisition.warehouseId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (requisition.status !== "DRAFT") {
        return NextResponse.json(
          { error: "Only draft requisitions can be submitted." },
          { status: 400 },
        );
      }

      const updated = await prisma.purchaseRequisition.update({
        where: { id: requisition.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
        include: purchaseRequisitionInclude,
      });

      await logActivity({
        action: "submit",
        entity: "purchase_requisition",
        entityId: updated.id,
        access,
        request,
        metadata: {
          message: `Submitted purchase requisition ${updated.requisitionNumber}`,
        },
        before,
        after: toPurchaseRequisitionLogSnapshot(updated),
      });

      return NextResponse.json(updated);
    }

    if (action === "approve") {
      if (!access.can("purchase_requisitions.approve", requisition.warehouseId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (requisition.status !== "SUBMITTED") {
        return NextResponse.json(
          { error: "Only submitted requisitions can be approved." },
          { status: 400 },
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        await Promise.all(
          requisition.items.map((item) =>
            tx.purchaseRequisitionItem.update({
              where: { id: item.id },
              data: {
                quantityApproved: item.quantityApproved ?? item.quantityRequested,
              },
            }),
          ),
        );

        return tx.purchaseRequisition.update({
          where: { id: requisition.id },
          data: {
            status: "APPROVED",
            approvedAt: new Date(),
            rejectedAt: null,
            approvedById: access.userId,
          },
          include: purchaseRequisitionInclude,
        });
      });

      await logActivity({
        action: "approve",
        entity: "purchase_requisition",
        entityId: updated.id,
        access,
        request,
        metadata: {
          message: `Approved purchase requisition ${updated.requisitionNumber}`,
        },
        before,
        after: toPurchaseRequisitionLogSnapshot(updated),
      });

      return NextResponse.json(updated);
    }

    if (action === "reject") {
      if (!access.can("purchase_requisitions.approve", requisition.warehouseId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (requisition.status !== "SUBMITTED") {
        return NextResponse.json(
          { error: "Only submitted requisitions can be rejected." },
          { status: 400 },
        );
      }

      const updated = await prisma.purchaseRequisition.update({
        where: { id: requisition.id },
        data: {
          status: "REJECTED",
          rejectedAt: new Date(),
        },
        include: purchaseRequisitionInclude,
      });

      await logActivity({
        action: "reject",
        entity: "purchase_requisition",
        entityId: updated.id,
        access,
        request,
        metadata: {
          message: `Rejected purchase requisition ${updated.requisitionNumber}`,
        },
        before,
        after: toPurchaseRequisitionLogSnapshot(updated),
      });

      return NextResponse.json(updated);
    }

    if (action === "cancel") {
      if (!access.can("purchase_requisitions.manage", requisition.warehouseId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!["DRAFT", "SUBMITTED", "APPROVED"].includes(requisition.status)) {
        return NextResponse.json(
          { error: "This purchase requisition can no longer be cancelled." },
          { status: 400 },
        );
      }

      const updated = await prisma.purchaseRequisition.update({
        where: { id: requisition.id },
        data: {
          status: "CANCELLED",
        },
        include: purchaseRequisitionInclude,
      });

      await logActivity({
        action: "cancel",
        entity: "purchase_requisition",
        entityId: updated.id,
        access,
        request,
        metadata: {
          message: `Cancelled purchase requisition ${updated.requisitionNumber}`,
        },
        before,
        after: toPurchaseRequisitionLogSnapshot(updated),
      });

      return NextResponse.json(updated);
    }

    if (action === "convert") {
      if (!access.can("purchase_orders.manage", requisition.warehouseId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (requisition.status !== "APPROVED") {
        return NextResponse.json(
          { error: "Only approved requisitions can be converted to purchase orders." },
          { status: 400 },
        );
      }
      if (requisition.purchaseOrders.length > 0) {
        return NextResponse.json(
          { error: "This requisition is already linked to a purchase order." },
          { status: 400 },
        );
      }

      const supplierId = Number(body.supplierId);
      if (!Number.isInteger(supplierId) || supplierId <= 0) {
        return NextResponse.json({ error: "Supplier is required." }, { status: 400 });
      }

      const unitCostsRaw = Array.isArray(body.unitCosts) ? body.unitCosts : [];
      const unitCostMap = new Map<number, ReturnType<typeof toDecimalAmount>>();
      for (const item of unitCostsRaw) {
        const itemId = Number(item.itemId);
        if (!Number.isInteger(itemId) || itemId <= 0) continue;
        unitCostMap.set(itemId, toDecimalAmount(item.unitCost, `Unit cost for item ${itemId}`));
      }

      for (const item of requisition.items) {
        if (!unitCostMap.has(item.id)) {
          return NextResponse.json(
            { error: `Unit cost is required for ${item.productVariant.sku}.` },
            { status: 400 },
          );
        }
      }

      const [supplier, warehouse] = await Promise.all([
        prisma.supplier.findUnique({
          where: { id: supplierId },
          select: { id: true, name: true, code: true, currency: true },
        }),
        prisma.warehouse.findUnique({
          where: { id: requisition.warehouseId },
          select: { id: true, name: true, code: true },
        }),
      ]);

      if (!supplier) {
        return NextResponse.json({ error: "Supplier not found." }, { status: 404 });
      }
      if (!warehouse) {
        return NextResponse.json({ error: "Warehouse not found." }, { status: 404 });
      }

      const requisitionItems = requisition.items.map((item) => {
        const quantityOrdered = item.quantityApproved ?? item.quantityRequested;
        const unitCost = unitCostMap.get(item.id);
        if (!unitCost) {
          throw new Error("Missing unit cost for requisition item");
        }
        return {
          productVariantId: item.productVariantId,
          quantityOrdered,
          unitCost,
          description:
            item.description ||
            `${item.productVariant.product.name} (${item.productVariant.sku})`,
          lineTotal: unitCost.mul(quantityOrdered),
        };
      });
      const totals = computePurchaseOrderTotals(requisitionItems);
      const expectedAt = body.expectedAt ? new Date(String(body.expectedAt)) : requisition.neededBy;
      if (expectedAt && Number.isNaN(expectedAt.getTime())) {
        return NextResponse.json(
          { error: "Expected delivery date is invalid." },
          { status: 400 },
        );
      }

      const createdPurchaseOrder = await prisma.$transaction(async (tx) => {
        const poNumber = await generatePurchaseOrderNumber(tx);
        const purchaseOrder = await tx.purchaseOrder.create({
          data: {
            poNumber,
            supplierId,
            purchaseRequisitionId: requisition.id,
            warehouseId: requisition.warehouseId,
            expectedAt: expectedAt ?? null,
            notes: toCleanText(body.notes, 500) || requisition.note || null,
            currency: supplier.currency || "BDT",
            createdById: access.userId,
            subtotal: totals.subtotal,
            taxTotal: totals.taxTotal,
            shippingTotal: totals.shippingTotal,
            grandTotal: totals.grandTotal,
            items: {
              create: requisitionItems.map((item) => ({
                productVariantId: item.productVariantId,
                description: item.description,
                quantityOrdered: item.quantityOrdered,
                unitCost: item.unitCost,
                lineTotal: item.lineTotal,
              })),
            },
          },
          include: purchaseOrderInclude,
        });

        await tx.purchaseRequisition.update({
          where: { id: requisition.id },
          data: {
            status: "CONVERTED",
            convertedAt: new Date(),
            convertedById: access.userId,
          },
        });

        return purchaseOrder;
      });

      const updatedRequisition = await prisma.purchaseRequisition.findUnique({
        where: { id: requisition.id },
        include: purchaseRequisitionInclude,
      });
      if (!updatedRequisition) {
        throw new Error("Purchase requisition lookup failed after conversion");
      }

      await logActivity({
        action: "convert",
        entity: "purchase_requisition",
        entityId: updatedRequisition.id,
        access,
        request,
        metadata: {
          message: `Converted purchase requisition ${updatedRequisition.requisitionNumber} to ${createdPurchaseOrder.poNumber}`,
        },
        before,
        after: toPurchaseRequisitionLogSnapshot(updatedRequisition),
      });

      await logActivity({
        action: "create",
        entity: "purchase_order",
        entityId: createdPurchaseOrder.id,
        access,
        request,
        metadata: {
          message: `Created purchase order ${createdPurchaseOrder.poNumber} from requisition ${updatedRequisition.requisitionNumber}`,
        },
        after: toPurchaseOrderLogSnapshot(createdPurchaseOrder),
      });

      return NextResponse.json({
        requisition: updatedRequisition,
        purchaseOrder: createdPurchaseOrder,
      });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error: any) {
    console.error("SCM PURCHASE REQUISITION PATCH ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update purchase requisition." },
      { status: 500 },
    );
  }
}
