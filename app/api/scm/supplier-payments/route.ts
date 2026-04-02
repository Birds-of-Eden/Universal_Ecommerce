import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import {
  generateSupplierPaymentNumber,
  syncSupplierInvoicePaymentStatus,
  toDecimalAmount,
  toSupplierPaymentLogSnapshot,
} from "@/lib/scm";

function toCleanText(value: unknown, max = 255) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function canReadSupplierPayments(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return access.hasGlobal("supplier_ledger.read") || access.hasGlobal("supplier_payments.read") || access.hasGlobal("supplier_payments.manage");
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
    if (!canReadSupplierPayments(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supplierId = Number(request.nextUrl.searchParams.get("supplierId") || "");
    const payments = await prisma.supplierPayment.findMany({
      where: {
        ...(Number.isInteger(supplierId) && supplierId > 0 ? { supplierId } : {}),
      },
      orderBy: [{ paymentDate: "desc" }, { id: "desc" }],
      include: {
        supplier: {
          select: { id: true, name: true, code: true },
        },
        supplierInvoice: {
          select: { id: true, invoiceNumber: true, total: true, status: true },
        },
      },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("SUPPLIER PAYMENTS GET ERROR:", error);
    return NextResponse.json({ error: "Failed to load supplier payments." }, { status: 500 });
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
    if (!access.hasGlobal("supplier_payments.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      supplierId?: unknown;
      supplierInvoiceId?: unknown;
      paymentDate?: unknown;
      amount?: unknown;
      currency?: unknown;
      method?: unknown;
      reference?: unknown;
      note?: unknown;
    };

    const supplierId = Number(body.supplierId);
    const supplierInvoiceId =
      body.supplierInvoiceId === null || body.supplierInvoiceId === undefined || body.supplierInvoiceId === ""
        ? null
        : Number(body.supplierInvoiceId);

    if (!Number.isInteger(supplierId) || supplierId <= 0) {
      return NextResponse.json({ error: "Supplier is required." }, { status: 400 });
    }
    if (supplierInvoiceId !== null && (!Number.isInteger(supplierInvoiceId) || supplierInvoiceId <= 0)) {
      return NextResponse.json({ error: "Invalid supplier invoice." }, { status: 400 });
    }

    const paymentDate = body.paymentDate ? new Date(String(body.paymentDate)) : new Date();
    if (Number.isNaN(paymentDate.getTime())) {
      return NextResponse.json({ error: "Invalid payment date." }, { status: 400 });
    }

    const amount = toDecimalAmount(body.amount, "Payment amount");
    if (amount.lte(0)) {
      return NextResponse.json({ error: "Payment amount must be greater than 0." }, { status: 400 });
    }

    const [supplier, invoice] = await Promise.all([
      prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { id: true, name: true, code: true, currency: true },
      }),
      supplierInvoiceId
        ? prisma.supplierInvoice.findUnique({
            where: { id: supplierInvoiceId },
            include: {
              payments: {
                select: { amount: true },
              },
            },
          })
        : Promise.resolve(null),
    ]);

    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found." }, { status: 404 });
    }
    if (supplierInvoiceId && !invoice) {
      return NextResponse.json({ error: "Supplier invoice not found." }, { status: 404 });
    }
    if (invoice && invoice.supplierId !== supplierId) {
      return NextResponse.json(
        { error: "Selected invoice does not belong to the supplier." },
        { status: 400 },
      );
    }

    if (invoice) {
      const paidSoFar = invoice.payments.reduce((sum, item) => sum.plus(item.amount), amount.sub(amount));
      const outstanding = invoice.total.minus(paidSoFar);
      if (amount.gt(outstanding)) {
        return NextResponse.json(
          { error: "Payment exceeds the invoice outstanding amount." },
          { status: 400 },
        );
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const paymentNumber = await generateSupplierPaymentNumber(tx);
      const payment = await tx.supplierPayment.create({
        data: {
          paymentNumber,
          supplierId,
          supplierInvoiceId,
          paymentDate,
          createdById: access.userId,
          amount,
          currency: toCleanText(body.currency, 3).toUpperCase() || supplier.currency || "BDT",
          method: (toCleanText(body.method, 40) || "BANK_TRANSFER") as any,
          reference: toCleanText(body.reference, 120) || null,
          note: toCleanText(body.note, 500) || null,
        },
      });

      await tx.supplierLedgerEntry.create({
        data: {
          supplierId,
          entryDate: paymentDate,
          entryType: "PAYMENT",
          direction: "CREDIT",
          amount,
          currency: payment.currency,
          note: payment.note,
          referenceType: "SUPPLIER_PAYMENT",
          referenceNumber: payment.paymentNumber,
          supplierInvoiceId,
          supplierPaymentId: payment.id,
          createdById: access.userId,
        },
      });

      if (supplierInvoiceId) {
        await syncSupplierInvoicePaymentStatus(tx, supplierInvoiceId);
      }

      return payment;
    });

    await logActivity({
      action: "create",
      entity: "supplier_payment",
      entityId: created.id,
      access,
      request,
      metadata: {
        message: `Created supplier payment ${created.paymentNumber}`,
      },
      after: toSupplierPaymentLogSnapshot(created),
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("SUPPLIER PAYMENTS POST ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create supplier payment." },
      { status: 500 },
    );
  }
}
