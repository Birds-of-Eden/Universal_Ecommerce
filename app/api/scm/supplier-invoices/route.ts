import { Prisma } from "@/generated/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import {
  generateSupplierInvoiceNumber,
  toDecimalAmount,
  toSupplierInvoiceLogSnapshot,
} from "@/lib/scm";

function toCleanText(value: unknown, max = 255) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function canReadSupplierInvoices(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return access.hasGlobal("supplier_ledger.read") || access.hasGlobal("supplier_invoices.read") || access.hasGlobal("supplier_invoices.manage");
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
    if (!canReadSupplierInvoices(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supplierId = Number(request.nextUrl.searchParams.get("supplierId") || "");
    const status = request.nextUrl.searchParams.get("status")?.trim() || "";
    const invoices = await prisma.supplierInvoice.findMany({
      where: {
        ...(Number.isInteger(supplierId) && supplierId > 0 ? { supplierId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      orderBy: [{ issueDate: "desc" }, { id: "desc" }],
      include: {
        supplier: {
          select: { id: true, name: true, code: true },
        },
        purchaseOrder: {
          select: { id: true, poNumber: true, warehouseId: true },
        },
        payments: {
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            paymentDate: true,
          },
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("SUPPLIER INVOICES GET ERROR:", error);
    return NextResponse.json({ error: "Failed to load supplier invoices." }, { status: 500 });
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
    if (!access.hasGlobal("supplier_invoices.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      supplierId?: unknown;
      purchaseOrderId?: unknown;
      issueDate?: unknown;
      dueDate?: unknown;
      subtotal?: unknown;
      taxTotal?: unknown;
      otherCharges?: unknown;
      total?: unknown;
      currency?: unknown;
      note?: unknown;
    };

    const supplierId = Number(body.supplierId);
    const purchaseOrderId =
      body.purchaseOrderId === null || body.purchaseOrderId === undefined || body.purchaseOrderId === ""
        ? null
        : Number(body.purchaseOrderId);

    if (!Number.isInteger(supplierId) || supplierId <= 0) {
      return NextResponse.json({ error: "Supplier is required." }, { status: 400 });
    }
    if (purchaseOrderId !== null && (!Number.isInteger(purchaseOrderId) || purchaseOrderId <= 0)) {
      return NextResponse.json({ error: "Invalid purchase order." }, { status: 400 });
    }

    const issueDate = body.issueDate ? new Date(String(body.issueDate)) : new Date();
    const dueDate = body.dueDate ? new Date(String(body.dueDate)) : null;
    if (Number.isNaN(issueDate.getTime()) || (dueDate && Number.isNaN(dueDate.getTime()))) {
      return NextResponse.json({ error: "Invalid invoice date." }, { status: 400 });
    }

    const subtotal = toDecimalAmount(body.subtotal ?? 0, "Subtotal");
    const taxTotal = toDecimalAmount(body.taxTotal ?? 0, "Tax total");
    const otherCharges = toDecimalAmount(body.otherCharges ?? 0, "Other charges");
    const total =
      body.total === null || body.total === undefined || body.total === ""
        ? subtotal.plus(taxTotal).plus(otherCharges)
        : toDecimalAmount(body.total, "Total");

    if (total.lte(0)) {
      return NextResponse.json({ error: "Invoice total must be greater than 0." }, { status: 400 });
    }

    const [supplier, purchaseOrder] = await Promise.all([
      prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { id: true, name: true, code: true, currency: true },
      }),
      purchaseOrderId
        ? prisma.purchaseOrder.findUnique({
            where: { id: purchaseOrderId },
            select: {
              id: true,
              supplierId: true,
              poNumber: true,
              grandTotal: true,
            },
          })
        : Promise.resolve(null),
    ]);

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found." }, { status: 404 });
    }
    if (purchaseOrderId && !purchaseOrder) {
      return NextResponse.json({ error: "Purchase order not found." }, { status: 404 });
    }
    if (purchaseOrder && purchaseOrder.supplierId !== supplierId) {
      return NextResponse.json(
        { error: "Selected purchase order does not belong to the supplier." },
        { status: 400 },
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await generateSupplierInvoiceNumber(tx);
      const invoice = await tx.supplierInvoice.create({
        data: {
          invoiceNumber,
          supplierId,
          purchaseOrderId,
          issueDate,
          dueDate,
          postedAt: new Date(),
          createdById: access.userId,
          currency: toCleanText(body.currency, 3).toUpperCase() || supplier.currency || "BDT",
          subtotal,
          taxTotal,
          otherCharges,
          total,
          note: toCleanText(body.note, 500) || null,
        },
      });

      await tx.supplierLedgerEntry.create({
        data: {
          supplierId,
          entryDate: issueDate,
          entryType: "INVOICE",
          direction: "DEBIT",
          amount: total,
          currency: invoice.currency,
          note: invoice.note,
          referenceType: "SUPPLIER_INVOICE",
          referenceNumber: invoice.invoiceNumber,
          purchaseOrderId,
          supplierInvoiceId: invoice.id,
          createdById: access.userId,
        },
      });

      return invoice;
    });

    await logActivity({
      action: "create",
      entity: "supplier_invoice",
      entityId: created.id,
      access,
      request,
      metadata: {
        message: `Created supplier invoice ${created.invoiceNumber}`,
      },
      after: toSupplierInvoiceLogSnapshot(created),
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("SUPPLIER INVOICES POST ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create supplier invoice." },
      { status: 500 },
    );
  }
}
