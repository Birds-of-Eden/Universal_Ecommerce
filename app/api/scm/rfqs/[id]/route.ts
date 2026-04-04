import { Prisma } from "@/generated/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import {
  computePurchaseOrderTotals,
  generatePurchaseOrderNumber,
  rfqInclude,
  toDecimalAmount,
  toPurchaseOrderLogSnapshot,
  toRfqLogSnapshot,
} from "@/lib/scm";

const RFQ_READ_PERMISSIONS = ["rfq.read", "rfq.manage", "rfq.approve"] as const;

function cleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanCurrency(value: unknown, fallback = "BDT") {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : fallback;
  return raw.length === 3 ? raw : fallback;
}

function canReadRfqs(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return access.hasAny([...RFQ_READ_PERMISSIONS]);
}

function hasGlobalRfqScope(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return RFQ_READ_PERMISSIONS.some((permission) => access.hasGlobal(permission));
}

function canAccessRfq(
  access: Awaited<ReturnType<typeof getAccessContext>>,
  rfq: { warehouseId: number },
) {
  return hasGlobalRfqScope(access) || access.canAccessWarehouse(rfq.warehouseId);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const rfqId = Number(id);
    if (!Number.isInteger(rfqId) || rfqId <= 0) {
      return NextResponse.json({ error: "Invalid RFQ id." }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const access = await getAccessContext(
      session?.user as { id?: string; role?: string } | undefined,
    );

    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!canReadRfqs(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rfq = await prisma.rfq.findUnique({
      where: { id: rfqId },
      include: rfqInclude,
    });
    if (!rfq) {
      return NextResponse.json({ error: "RFQ not found." }, { status: 404 });
    }
    if (!canAccessRfq(access, rfq)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(rfq);
  } catch (error) {
    console.error("SCM RFQ GET BY ID ERROR:", error);
    return NextResponse.json({ error: "Failed to load RFQ." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const rfqId = Number(id);
    if (!Number.isInteger(rfqId) || rfqId <= 0) {
      return NextResponse.json({ error: "Invalid RFQ id." }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const access = await getAccessContext(
      session?.user as { id?: string; role?: string } | undefined,
    );
    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rfq = await prisma.rfq.findUnique({
      where: { id: rfqId },
      include: rfqInclude,
    });
    if (!rfq) {
      return NextResponse.json({ error: "RFQ not found." }, { status: 404 });
    }
    if (!canAccessRfq(access, rfq)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      submissionDeadline?: unknown;
      note?: unknown;
      currency?: unknown;
      supplierIds?: unknown[];
      supplierId?: unknown;
      quotationId?: unknown;
      validUntil?: unknown;
      quotationNote?: unknown;
      taxTotal?: unknown;
      items?: Array<{
        rfqItemId?: unknown;
        quantityQuoted?: unknown;
        unitCost?: unknown;
        description?: unknown;
      }>;
    };
    const action = typeof body.action === "string" ? body.action.trim().toLowerCase() : "";
    const before = toRfqLogSnapshot(rfq);

    if (!action) {
      if (!access.can("rfq.manage", rfq.warehouseId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (rfq.status !== "DRAFT") {
        return NextResponse.json(
          { error: "Only draft RFQs can be edited." },
          { status: 400 },
        );
      }

      const submissionDeadline = body.submissionDeadline
        ? new Date(String(body.submissionDeadline))
        : null;
      if (submissionDeadline && Number.isNaN(submissionDeadline.getTime())) {
        return NextResponse.json(
          { error: "Submission deadline is invalid." },
          { status: 400 },
        );
      }

      const updated = await prisma.rfq.update({
        where: { id: rfq.id },
        data: {
          submissionDeadline,
          note: cleanText(body.note, 1000) || null,
          currency: cleanCurrency(body.currency, rfq.currency),
        },
        include: rfqInclude,
      });

      await logActivity({
        action: "update",
        entity: "rfq",
        entityId: updated.id,
        access,
        request,
        metadata: { message: `Updated RFQ ${updated.rfqNumber}` },
        before,
        after: toRfqLogSnapshot(updated),
      });

      return NextResponse.json(updated);
    }

    if (action === "submit") {
      if (!access.can("rfq.manage", rfq.warehouseId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (rfq.status !== "DRAFT") {
        return NextResponse.json(
          { error: "Only draft RFQs can be submitted." },
          { status: 400 },
        );
      }
      if (rfq.items.length === 0) {
        return NextResponse.json(
          { error: "RFQ must include at least one line item before submit." },
          { status: 400 },
        );
      }

      const updated = await prisma.rfq.update({
        where: { id: rfq.id },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
          cancelledAt: null,
        },
        include: rfqInclude,
      });

      await logActivity({
        action: "submit",
        entity: "rfq",
        entityId: updated.id,
        access,
        request,
        metadata: { message: `Submitted RFQ ${updated.rfqNumber}` },
        before,
        after: toRfqLogSnapshot(updated),
      });

      return NextResponse.json(updated);
    }

    if (action === "close") {
      if (!access.can("rfq.manage", rfq.warehouseId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!["SUBMITTED", "AWARDED"].includes(rfq.status)) {
        return NextResponse.json(
          { error: "Only submitted/awarded RFQs can be closed." },
          { status: 400 },
        );
      }

      const updated = await prisma.rfq.update({
        where: { id: rfq.id },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
        },
        include: rfqInclude,
      });

      await logActivity({
        action: "close",
        entity: "rfq",
        entityId: updated.id,
        access,
        request,
        metadata: { message: `Closed RFQ ${updated.rfqNumber}` },
        before,
        after: toRfqLogSnapshot(updated),
      });

      return NextResponse.json(updated);
    }

    if (action === "cancel") {
      if (!access.can("rfq.manage", rfq.warehouseId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!["DRAFT", "SUBMITTED", "CLOSED"].includes(rfq.status)) {
        return NextResponse.json(
          { error: "This RFQ can no longer be cancelled." },
          { status: 400 },
        );
      }

      const updated = await prisma.rfq.update({
        where: { id: rfq.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
        },
        include: rfqInclude,
      });

      await logActivity({
        action: "cancel",
        entity: "rfq",
        entityId: updated.id,
        access,
        request,
        metadata: { message: `Cancelled RFQ ${updated.rfqNumber}` },
        before,
        after: toRfqLogSnapshot(updated),
      });

      return NextResponse.json(updated);
    }

    if (action === "invite_suppliers") {
      if (!access.can("rfq.manage", rfq.warehouseId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!["DRAFT", "SUBMITTED"].includes(rfq.status)) {
        return NextResponse.json(
          { error: "Suppliers can only be invited on draft/submitted RFQs." },
          { status: 400 },
        );
      }

      const supplierIdsRaw = Array.isArray(body.supplierIds) ? body.supplierIds : [];
      const supplierIds = [
        ...new Set(
          supplierIdsRaw
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value > 0),
        ),
      ];
      if (supplierIds.length === 0) {
        return NextResponse.json(
          { error: "At least one supplier is required." },
          { status: 400 },
        );
      }

      const suppliers = await prisma.supplier.findMany({
        where: {
          id: { in: supplierIds },
          isActive: true,
        },
        select: {
          id: true,
        },
      });
      if (suppliers.length !== supplierIds.length) {
        return NextResponse.json(
          { error: "One or more suppliers were not found or inactive." },
          { status: 400 },
        );
      }

      const inviteNote = cleanText(body.note, 500) || null;
      const updated = await prisma.$transaction(async (tx) => {
        for (const supplierId of supplierIds) {
          await tx.rfqSupplierInvite.upsert({
            where: {
              rfqId_supplierId: {
                rfqId: rfq.id,
                supplierId,
              },
            },
            create: {
              rfqId: rfq.id,
              supplierId,
              status: "INVITED",
              note: inviteNote,
              createdById: access.userId,
            },
            update: {
              status: "INVITED",
              invitedAt: new Date(),
              respondedAt: null,
              note: inviteNote,
              createdById: access.userId,
            },
          });
        }

        return tx.rfq.findUnique({
          where: { id: rfq.id },
          include: rfqInclude,
        });
      });
      if (!updated) {
        throw new Error("RFQ lookup failed after supplier invite");
      }

      await logActivity({
        action: "invite_suppliers",
        entity: "rfq",
        entityId: updated.id,
        access,
        request,
        metadata: {
          message: `Invited ${supplierIds.length} supplier(s) to RFQ ${updated.rfqNumber}`,
          supplierIds,
        },
        before,
        after: toRfqLogSnapshot(updated),
      });

      return NextResponse.json(updated);
    }

    if (action === "submit_quotation") {
      if (!access.can("rfq.manage", rfq.warehouseId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!["SUBMITTED", "CLOSED", "AWARDED"].includes(rfq.status)) {
        return NextResponse.json(
          { error: "Quotations can only be submitted on submitted/closed RFQs." },
          { status: 400 },
        );
      }

      const supplierId = Number(body.supplierId);
      if (!Number.isInteger(supplierId) || supplierId <= 0) {
        return NextResponse.json({ error: "Supplier is required." }, { status: 400 });
      }
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { id: true, isActive: true, currency: true },
      });
      if (!supplier || !supplier.isActive) {
        return NextResponse.json(
          { error: "Supplier not found or inactive." },
          { status: 404 },
        );
      }

      const linesRaw = Array.isArray(body.items) ? body.items : [];
      if (linesRaw.length === 0) {
        return NextResponse.json(
          { error: "At least one quotation line is required." },
          { status: 400 },
        );
      }

      const rfqItemMap = new Map(rfq.items.map((item) => [item.id, item]));
      const seenRfqItemIds = new Set<number>();
      const quotationItems = linesRaw.map((line, index) => {
        const rfqItemId = Number(line.rfqItemId);
        if (!Number.isInteger(rfqItemId) || rfqItemId <= 0) {
          throw new Error(`Quotation line ${index + 1}: rfq item is required`);
        }
        if (seenRfqItemIds.has(rfqItemId)) {
          throw new Error(`Quotation line ${index + 1}: duplicate RFQ item selected`);
        }
        seenRfqItemIds.add(rfqItemId);

        const rfqItem = rfqItemMap.get(rfqItemId);
        if (!rfqItem) {
          throw new Error(`Quotation line ${index + 1}: RFQ item not found`);
        }

        const quantityQuoted = Number(line.quantityQuoted);
        if (!Number.isInteger(quantityQuoted) || quantityQuoted <= 0) {
          throw new Error(`Quotation line ${index + 1}: quoted quantity must be greater than 0`);
        }
        const unitCost = toDecimalAmount(line.unitCost, `Unit cost for line ${index + 1}`);
        const lineTotal = unitCost.mul(quantityQuoted);

        return {
          rfqItemId,
          productVariantId: rfqItem.productVariantId,
          quantityQuoted,
          unitCost,
          lineTotal,
          description: cleanText(line.description, 255) || rfqItem.description || null,
        };
      });

      const subtotal = quotationItems.reduce(
        (sum, item) => sum.plus(item.lineTotal),
        new Prisma.Decimal(0),
      );
      const taxTotal = body.taxTotal ? toDecimalAmount(body.taxTotal, "taxTotal") : new Prisma.Decimal(0);
      const total = subtotal.plus(taxTotal);
      const validUntil = body.validUntil ? new Date(String(body.validUntil)) : null;
      if (validUntil && Number.isNaN(validUntil.getTime())) {
        return NextResponse.json({ error: "Valid-until date is invalid." }, { status: 400 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const invite = await tx.rfqSupplierInvite.upsert({
          where: {
            rfqId_supplierId: {
              rfqId: rfq.id,
              supplierId,
            },
          },
          create: {
            rfqId: rfq.id,
            supplierId,
            status: "RESPONDED",
            invitedAt: new Date(),
            respondedAt: new Date(),
            createdById: access.userId,
          },
          update: {
            status: "RESPONDED",
            respondedAt: new Date(),
          },
          select: {
            id: true,
          },
        });

        const existingQuotation = await tx.supplierQuotation.findUnique({
          where: {
            rfqId_supplierId: {
              rfqId: rfq.id,
              supplierId,
            },
          },
          select: {
            id: true,
          },
        });

        if (existingQuotation) {
          await tx.supplierQuotationItem.deleteMany({
            where: {
              supplierQuotationId: existingQuotation.id,
            },
          });
          await tx.supplierQuotation.update({
            where: { id: existingQuotation.id },
            data: {
              rfqSupplierInviteId: invite.id,
              status: "SUBMITTED",
              quotedAt: new Date(),
              validUntil,
              submittedById: access.userId,
              currency: cleanCurrency(body.currency, supplier.currency || rfq.currency),
              subtotal,
              taxTotal,
              total,
              note: cleanText(body.quotationNote, 1000) || null,
              items: {
                create: quotationItems,
              },
            },
          });
        } else {
          await tx.supplierQuotation.create({
            data: {
              rfqId: rfq.id,
              supplierId,
              rfqSupplierInviteId: invite.id,
              status: "SUBMITTED",
              quotedAt: new Date(),
              validUntil,
              submittedById: access.userId,
              currency: cleanCurrency(body.currency, supplier.currency || rfq.currency),
              subtotal,
              taxTotal,
              total,
              note: cleanText(body.quotationNote, 1000) || null,
              items: {
                create: quotationItems,
              },
            },
          });
        }

        return tx.rfq.findUnique({
          where: { id: rfq.id },
          include: rfqInclude,
        });
      });

      if (!updated) {
        throw new Error("RFQ lookup failed after quotation submission");
      }

      await logActivity({
        action: "submit_quotation",
        entity: "rfq",
        entityId: updated.id,
        access,
        request,
        metadata: {
          message: `Submitted supplier quotation for RFQ ${updated.rfqNumber}`,
          supplierId,
          quotationTotal: total.toString(),
        },
        before,
        after: toRfqLogSnapshot(updated),
      });

      return NextResponse.json(updated);
    }

    if (action === "award") {
      if (!access.can("rfq.approve", rfq.warehouseId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!["SUBMITTED", "CLOSED", "AWARDED"].includes(rfq.status)) {
        return NextResponse.json(
          { error: "Only submitted/closed RFQs can be awarded." },
          { status: 400 },
        );
      }

      const quotationId = Number(body.quotationId);
      if (!Number.isInteger(quotationId) || quotationId <= 0) {
        return NextResponse.json({ error: "Quotation is required." }, { status: 400 });
      }

      const quotation = rfq.quotations.find((item) => item.id === quotationId);
      if (!quotation) {
        return NextResponse.json(
          { error: "Supplier quotation not found for this RFQ." },
          { status: 404 },
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const existingAward = await tx.rfqAward.findUnique({
          where: { rfqId: rfq.id },
          select: {
            id: true,
            purchaseOrderId: true,
          },
        });
        if (existingAward?.purchaseOrderId) {
          throw new Error("Award is already converted to purchase order and cannot be changed.");
        }

        await tx.rfqAward.upsert({
          where: { rfqId: rfq.id },
          create: {
            rfqId: rfq.id,
            supplierId: quotation.supplierId,
            supplierQuotationId: quotation.id,
            status: "AWARDED",
            awardedById: access.userId,
            awardedAt: new Date(),
            note: cleanText(body.note, 1000) || null,
          },
          update: {
            supplierId: quotation.supplierId,
            supplierQuotationId: quotation.id,
            status: "AWARDED",
            awardedById: access.userId,
            awardedAt: new Date(),
            note: cleanText(body.note, 1000) || null,
            purchaseOrderId: null,
          },
        });

        await tx.rfq.update({
          where: { id: rfq.id },
          data: {
            status: "AWARDED",
            awardedAt: new Date(),
            approvedById: access.userId,
          },
        });

        await tx.rfqSupplierInvite.updateMany({
          where: { rfqId: rfq.id },
          data: { status: "RESPONDED" },
        });
        await tx.rfqSupplierInvite.updateMany({
          where: {
            rfqId: rfq.id,
            supplierId: quotation.supplierId,
          },
          data: {
            status: "AWARDED",
            respondedAt: new Date(),
          },
        });

        return tx.rfq.findUnique({
          where: { id: rfq.id },
          include: rfqInclude,
        });
      });

      if (!updated) {
        throw new Error("RFQ lookup failed after award");
      }

      await logActivity({
        action: "award",
        entity: "rfq",
        entityId: updated.id,
        access,
        request,
        metadata: {
          message: `Awarded RFQ ${updated.rfqNumber} to supplier ${quotation.supplier.code}`,
          quotationId: quotation.id,
          supplierId: quotation.supplierId,
        },
        before,
        after: toRfqLogSnapshot(updated),
      });

      return NextResponse.json(updated);
    }

    if (action === "convert_to_po") {
      if (!access.can("purchase_orders.manage", rfq.warehouseId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (rfq.status !== "AWARDED") {
        return NextResponse.json(
          { error: "Only awarded RFQs can be converted to purchase order." },
          { status: 400 },
        );
      }
      if (!rfq.award) {
        return NextResponse.json(
          { error: "RFQ has no award decision to convert." },
          { status: 400 },
        );
      }
      if (rfq.award.purchaseOrderId) {
        return NextResponse.json(
          { error: "RFQ award is already linked to a purchase order." },
          { status: 400 },
        );
      }

      const awardedQuotation = rfq.quotations.find(
        (quotation) => quotation.id === rfq.award?.supplierQuotationId,
      );
      if (!awardedQuotation) {
        return NextResponse.json(
          { error: "Awarded quotation record was not found." },
          { status: 404 },
        );
      }
      if (awardedQuotation.items.length === 0) {
        return NextResponse.json(
          { error: "Awarded quotation contains no line items." },
          { status: 400 },
        );
      }

      const purchaseOrderItems = awardedQuotation.items.map((item) => ({
        productVariantId: item.productVariantId,
        quantityOrdered: item.quantityQuoted,
        unitCost: item.unitCost,
        description:
          item.description ||
          `${item.productVariant.product.name} (${item.productVariant.sku})`,
        lineTotal: item.lineTotal,
      }));
      const totals = computePurchaseOrderTotals(
        purchaseOrderItems.map((item) => ({
          quantityOrdered: item.quantityOrdered,
          unitCost: item.unitCost,
        })),
      );

      const createdPurchaseOrder = await prisma.$transaction(async (tx) => {
        const poNumber = await generatePurchaseOrderNumber(tx);
        const purchaseOrder = await tx.purchaseOrder.create({
          data: {
            poNumber,
            supplierId: awardedQuotation.supplierId,
            purchaseRequisitionId: rfq.purchaseRequisitionId,
            warehouseId: rfq.warehouseId,
            expectedAt: rfq.submissionDeadline ?? null,
            notes:
              cleanText(body.note, 1000) ||
              `Created from RFQ ${rfq.rfqNumber} award.`,
            currency: cleanCurrency(awardedQuotation.currency, rfq.currency),
            createdById: access.userId,
            subtotal: totals.subtotal,
            taxTotal: totals.taxTotal,
            shippingTotal: totals.shippingTotal,
            grandTotal: totals.grandTotal,
            items: {
              create: purchaseOrderItems,
            },
          },
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
                code: true,
                currency: true,
              },
            },
            warehouse: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            approvedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            items: {
              orderBy: { id: "asc" },
              include: {
                productVariant: {
                  select: {
                    id: true,
                    productId: true,
                    sku: true,
                    stock: true,
                    product: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
            goodsReceipts: {
              select: {
                id: true,
                receiptNumber: true,
                status: true,
                receivedAt: true,
              },
              orderBy: { receivedAt: "desc" },
            },
          },
        });

        await tx.rfqAward.update({
          where: { id: rfq.award!.id },
          data: {
            status: "CONVERTED_TO_PO",
            purchaseOrderId: purchaseOrder.id,
          },
        });

        return purchaseOrder;
      });

      const updatedRfq = await prisma.rfq.findUnique({
        where: { id: rfq.id },
        include: rfqInclude,
      });
      if (!updatedRfq) {
        throw new Error("RFQ lookup failed after purchase order conversion");
      }

      await logActivity({
        action: "convert_to_po",
        entity: "rfq",
        entityId: updatedRfq.id,
        access,
        request,
        metadata: {
          message: `Converted RFQ ${updatedRfq.rfqNumber} to PO ${createdPurchaseOrder.poNumber}`,
          purchaseOrderId: createdPurchaseOrder.id,
        },
        before,
        after: toRfqLogSnapshot(updatedRfq),
      });

      await logActivity({
        action: "create",
        entity: "purchase_order",
        entityId: createdPurchaseOrder.id,
        access,
        request,
        metadata: {
          message: `Created purchase order ${createdPurchaseOrder.poNumber} from RFQ ${updatedRfq.rfqNumber}`,
          rfqId: updatedRfq.id,
        },
        after: toPurchaseOrderLogSnapshot(createdPurchaseOrder),
      });

      return NextResponse.json({
        rfq: updatedRfq,
        purchaseOrder: createdPurchaseOrder,
      });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error: any) {
    console.error("SCM RFQ PATCH ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update RFQ." },
      { status: 500 },
    );
  }
}
