import { Prisma } from "@/generated/prisma";

type TransactionClient = Prisma.TransactionClient;

export function toDecimalAmount(value: unknown, field: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${field} must be a non-negative number`);
  }
  return new Prisma.Decimal(amount);
}

export async function generatePurchaseOrderNumber(tx: TransactionClient) {
  const today = new Date();
  const prefix = `PO-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;
  const count = await tx.purchaseOrder.count({
    where: {
      poNumber: {
        startsWith: prefix,
      },
    },
  });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

export async function generateGoodsReceiptNumber(tx: TransactionClient) {
  const today = new Date();
  const prefix = `GRN-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;
  const count = await tx.goodsReceipt.count({
    where: {
      receiptNumber: {
        startsWith: prefix,
      },
    },
  });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

export async function generateSupplierInvoiceNumber(tx: TransactionClient) {
  const today = new Date();
  const prefix = `SINV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;
  const count = await tx.supplierInvoice.count({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
  });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

export async function generateSupplierPaymentNumber(tx: TransactionClient) {
  const today = new Date();
  const prefix = `SPAY-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;
  const count = await tx.supplierPayment.count({
    where: {
      paymentNumber: {
        startsWith: prefix,
      },
    },
  });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

export function computePurchaseOrderTotals(
  items: Array<{ quantityOrdered: number; unitCost: Prisma.Decimal }>,
) {
  const subtotal = items.reduce(
    (sum, item) => sum.plus(item.unitCost.mul(item.quantityOrdered)),
    new Prisma.Decimal(0),
  );

  return {
    subtotal,
    taxTotal: new Prisma.Decimal(0),
    shippingTotal: new Prisma.Decimal(0),
    grandTotal: subtotal,
  };
}

export const purchaseOrderInclude = Prisma.validator<Prisma.PurchaseOrderInclude>()({
  supplier: {
    select: {
      id: true,
      name: true,
      code: true,
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
});

export const goodsReceiptInclude = Prisma.validator<Prisma.GoodsReceiptInclude>()({
  warehouse: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  receivedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  purchaseOrder: {
    include: purchaseOrderInclude,
  },
  items: {
    orderBy: { id: "asc" },
    include: {
      purchaseOrderItem: {
        select: {
          id: true,
          quantityOrdered: true,
          quantityReceived: true,
        },
      },
      productVariant: {
        select: {
          id: true,
          productId: true,
          sku: true,
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
});

export type PurchaseOrderWithRelations = Prisma.PurchaseOrderGetPayload<{
  include: typeof purchaseOrderInclude;
}>;

export type GoodsReceiptWithRelations = Prisma.GoodsReceiptGetPayload<{
  include: typeof goodsReceiptInclude;
}>;

export function toPurchaseOrderLogSnapshot(purchaseOrder: PurchaseOrderWithRelations) {
  return {
    poNumber: purchaseOrder.poNumber,
    status: purchaseOrder.status,
    supplierId: purchaseOrder.supplierId,
    supplierName: purchaseOrder.supplier.name,
    warehouseId: purchaseOrder.warehouseId,
    warehouseCode: purchaseOrder.warehouse.code,
    orderDate: purchaseOrder.orderDate.toISOString(),
    expectedAt: purchaseOrder.expectedAt?.toISOString() ?? null,
    submittedAt: purchaseOrder.submittedAt?.toISOString() ?? null,
    approvedAt: purchaseOrder.approvedAt?.toISOString() ?? null,
    receivedAt: purchaseOrder.receivedAt?.toISOString() ?? null,
    currency: purchaseOrder.currency,
    subtotal: purchaseOrder.subtotal.toString(),
    taxTotal: purchaseOrder.taxTotal.toString(),
    shippingTotal: purchaseOrder.shippingTotal.toString(),
    grandTotal: purchaseOrder.grandTotal.toString(),
    notes: purchaseOrder.notes ?? null,
    items: purchaseOrder.items.map((item) => ({
      id: item.id,
      variantId: item.productVariantId,
      sku: item.productVariant.sku,
      productName: item.productVariant.product.name,
      quantityOrdered: item.quantityOrdered,
      quantityReceived: item.quantityReceived,
      unitCost: item.unitCost.toString(),
      lineTotal: item.lineTotal.toString(),
    })),
  };
}

export function toGoodsReceiptLogSnapshot(receipt: GoodsReceiptWithRelations) {
  return {
    receiptNumber: receipt.receiptNumber,
    status: receipt.status,
    purchaseOrderId: receipt.purchaseOrderId,
    purchaseOrderNumber: receipt.purchaseOrder.poNumber,
    warehouseId: receipt.warehouseId,
    warehouseCode: receipt.warehouse.code,
    receivedAt: receipt.receivedAt.toISOString(),
    note: receipt.note ?? null,
    items: receipt.items.map((item) => ({
      id: item.id,
      purchaseOrderItemId: item.purchaseOrderItemId,
      variantId: item.productVariantId,
      sku: item.productVariant.sku,
      productName: item.productVariant.product.name,
      quantityReceived: item.quantityReceived,
      unitCost: item.unitCost.toString(),
    })),
  };
}

export function toSupplierInvoiceLogSnapshot(invoice: {
  invoiceNumber: string;
  status: string;
  supplierId: number;
  purchaseOrderId: number | null;
  issueDate: Date;
  dueDate: Date | null;
  postedAt: Date;
  currency: string;
  subtotal: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  otherCharges: Prisma.Decimal;
  total: Prisma.Decimal;
  note: string | null;
}) {
  return {
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    supplierId: invoice.supplierId,
    purchaseOrderId: invoice.purchaseOrderId,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate?.toISOString() ?? null,
    postedAt: invoice.postedAt.toISOString(),
    currency: invoice.currency,
    subtotal: invoice.subtotal.toString(),
    taxTotal: invoice.taxTotal.toString(),
    otherCharges: invoice.otherCharges.toString(),
    total: invoice.total.toString(),
    note: invoice.note,
  };
}

export function toSupplierPaymentLogSnapshot(payment: {
  paymentNumber: string;
  supplierId: number;
  supplierInvoiceId: number | null;
  paymentDate: Date;
  amount: Prisma.Decimal;
  currency: string;
  method: string;
  reference: string | null;
  note: string | null;
}) {
  return {
    paymentNumber: payment.paymentNumber,
    supplierId: payment.supplierId,
    supplierInvoiceId: payment.supplierInvoiceId,
    paymentDate: payment.paymentDate.toISOString(),
    amount: payment.amount.toString(),
    currency: payment.currency,
    method: payment.method,
    reference: payment.reference,
    note: payment.note,
  };
}

export async function syncSupplierInvoicePaymentStatus(
  tx: TransactionClient,
  supplierInvoiceId: number,
) {
  const invoice = await tx.supplierInvoice.findUnique({
    where: { id: supplierInvoiceId },
    select: {
      id: true,
      total: true,
      status: true,
      payments: {
        select: {
          amount: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new Error("Supplier invoice not found");
  }

  const paidAmount = invoice.payments.reduce(
    (sum, item) => sum.plus(item.amount),
    new Prisma.Decimal(0),
  );

  let nextStatus = invoice.status;
  if (paidAmount.gte(invoice.total)) {
    nextStatus = "PAID";
  } else if (paidAmount.gt(0)) {
    nextStatus = "PARTIALLY_PAID";
  } else if (invoice.status === "PAID" || invoice.status === "PARTIALLY_PAID") {
    nextStatus = "POSTED";
  }

  return tx.supplierInvoice.update({
    where: { id: supplierInvoiceId },
    data: {
      status: nextStatus,
    },
  });
}

export function computeSupplierLedgerTotals(
  entries: Array<{ direction: "DEBIT" | "CREDIT"; amount: Prisma.Decimal | number | string }>,
) {
  const totals = entries.reduce(
    (acc, entry) => {
      const amount =
        entry.amount instanceof Prisma.Decimal
          ? entry.amount
          : new Prisma.Decimal(entry.amount);
      if (entry.direction === "DEBIT") {
        acc.debit = acc.debit.plus(amount);
      } else {
        acc.credit = acc.credit.plus(amount);
      }
      return acc;
    },
    {
      debit: new Prisma.Decimal(0),
      credit: new Prisma.Decimal(0),
    },
  );

  return {
    debit: totals.debit,
    credit: totals.credit,
    balance: totals.debit.minus(totals.credit),
  };
}

export async function refreshPurchaseOrderReceiptStatus(
  tx: TransactionClient,
  purchaseOrderId: number,
) {
  const purchaseOrder = await tx.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    include: {
      items: {
        select: {
          quantityOrdered: true,
          quantityReceived: true,
        },
      },
    },
  });

  if (!purchaseOrder) {
    throw new Error("Purchase order not found");
  }

  const ordered = purchaseOrder.items.reduce((sum, item) => sum + item.quantityOrdered, 0);
  const received = purchaseOrder.items.reduce((sum, item) => sum + item.quantityReceived, 0);

  let status = purchaseOrder.status;
  let receivedAt = purchaseOrder.receivedAt;

  if (ordered > 0 && received >= ordered) {
    status = "RECEIVED";
    receivedAt = purchaseOrder.receivedAt ?? new Date();
  } else if (received > 0) {
    status = "PARTIALLY_RECEIVED";
    receivedAt = null;
  } else if (purchaseOrder.status === "RECEIVED" || purchaseOrder.status === "PARTIALLY_RECEIVED") {
    status = purchaseOrder.approvedAt ? "APPROVED" : purchaseOrder.submittedAt ? "SUBMITTED" : "DRAFT";
    receivedAt = null;
  }

  return tx.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: {
      status,
      receivedAt,
    },
    include: {
      supplier: {
        select: { id: true, name: true, code: true },
      },
      warehouse: {
        select: { id: true, name: true, code: true },
      },
      items: {
        include: {
          productVariant: {
            select: {
              id: true,
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
    },
  });
}
