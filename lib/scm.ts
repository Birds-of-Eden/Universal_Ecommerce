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

export async function generatePurchaseRequisitionNumber(tx: TransactionClient) {
  const today = new Date();
  const prefix = `PR-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;
  const count = await tx.purchaseRequisition.count({
    where: {
      requisitionNumber: {
        startsWith: prefix,
      },
    },
  });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

export async function generateRfqNumber(tx: TransactionClient) {
  const today = new Date();
  const prefix = `RFQ-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;
  const count = await tx.rfq.count({
    where: {
      rfqNumber: {
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

export async function generateSupplierReturnNumber(tx: TransactionClient) {
  const today = new Date();
  const prefix = `SRT-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;
  const count = await tx.supplierReturn.count({
    where: {
      returnNumber: {
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

export async function generateWarehouseTransferNumber(tx: TransactionClient) {
  const today = new Date();
  const prefix = `WTR-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;
  const count = await tx.warehouseTransfer.count({
    where: {
      transferNumber: {
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

const EDITABLE_LANDED_COST_PO_STATUSES = new Set([
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
]);

export function getPurchaseOrderLandedCostLockReason(input: {
  status: string;
  hasGoodsReceipts: boolean;
}) {
  if (input.hasGoodsReceipts) {
    return "Landed costs are locked after goods receipt posting.";
  }
  if (!EDITABLE_LANDED_COST_PO_STATUSES.has(input.status)) {
    return `Landed costs can only be edited while purchase order is DRAFT, SUBMITTED, or APPROVED. Current status: ${input.status}.`;
  }
  return null;
}

export type PurchaseOrderLandedCostAllocationLine = {
  purchaseOrderItemId: number;
  quantityOrdered: number;
  baseUnitCost: Prisma.Decimal;
  baseLineTotal: Prisma.Decimal;
  landedAllocationTotal: Prisma.Decimal;
  landedPerUnit: Prisma.Decimal;
  effectiveUnitCost: Prisma.Decimal;
  effectiveLineTotal: Prisma.Decimal;
};

export type PurchaseOrderLandedCostAllocationResult = {
  baseSubtotal: Prisma.Decimal;
  landedTotal: Prisma.Decimal;
  effectiveSubtotal: Prisma.Decimal;
  lines: PurchaseOrderLandedCostAllocationLine[];
};

function toPreciseDecimal(value: Prisma.Decimal) {
  return value.toDecimalPlaces(6, Prisma.Decimal.ROUND_HALF_UP);
}

export function computePurchaseOrderLandedCostAllocation(
  items: Array<{
    id: number;
    quantityOrdered: number;
    unitCost: Prisma.Decimal;
  }>,
  landedCosts: Array<{ amount: Prisma.Decimal }>,
): PurchaseOrderLandedCostAllocationResult {
  const baseSubtotal = items.reduce(
    (sum, item) => sum.plus(item.unitCost.mul(item.quantityOrdered)),
    new Prisma.Decimal(0),
  );
  const landedTotal = landedCosts.reduce((sum, item) => sum.plus(item.amount), new Prisma.Decimal(0));

  if (items.length === 0) {
    return {
      baseSubtotal,
      landedTotal,
      effectiveSubtotal: baseSubtotal.plus(landedTotal),
      lines: [],
    };
  }

  if (landedTotal.lte(0)) {
    return {
      baseSubtotal,
      landedTotal,
      effectiveSubtotal: baseSubtotal,
      lines: items.map((item) => {
        const baseLineTotal = item.unitCost.mul(item.quantityOrdered);
        return {
          purchaseOrderItemId: item.id,
          quantityOrdered: item.quantityOrdered,
          baseUnitCost: item.unitCost,
          baseLineTotal,
          landedAllocationTotal: new Prisma.Decimal(0),
          landedPerUnit: new Prisma.Decimal(0),
          effectiveUnitCost: item.unitCost,
          effectiveLineTotal: baseLineTotal,
        };
      }),
    };
  }

  const totalOrderedQuantity = items.reduce((sum, item) => sum + item.quantityOrdered, 0);
  const useValueBasis = baseSubtotal.gt(0);
  const useQuantityBasis = !useValueBasis && totalOrderedQuantity > 0;
  const denominator = useValueBasis
    ? baseSubtotal
    : useQuantityBasis
      ? new Prisma.Decimal(totalOrderedQuantity)
      : new Prisma.Decimal(items.length);

  let allocatedSoFar = new Prisma.Decimal(0);
  const lines = items.map((item, index) => {
    const baseLineTotal = item.unitCost.mul(item.quantityOrdered);
    const isLast = index === items.length - 1;
    const weightValue = useValueBasis
      ? baseLineTotal
      : useQuantityBasis
        ? new Prisma.Decimal(item.quantityOrdered)
        : new Prisma.Decimal(1);

    const landedAllocationTotal = isLast
      ? landedTotal.minus(allocatedSoFar)
      : toPreciseDecimal(landedTotal.mul(weightValue).div(denominator));

    if (!isLast) {
      allocatedSoFar = allocatedSoFar.plus(landedAllocationTotal);
    }

    const landedPerUnit =
      item.quantityOrdered > 0
        ? toPreciseDecimal(landedAllocationTotal.div(item.quantityOrdered))
        : new Prisma.Decimal(0);
    const effectiveUnitCost = toPreciseDecimal(item.unitCost.plus(landedPerUnit));
    const effectiveLineTotal = toPreciseDecimal(effectiveUnitCost.mul(item.quantityOrdered));

    return {
      purchaseOrderItemId: item.id,
      quantityOrdered: item.quantityOrdered,
      baseUnitCost: item.unitCost,
      baseLineTotal,
      landedAllocationTotal,
      landedPerUnit,
      effectiveUnitCost,
      effectiveLineTotal,
    };
  });

  return {
    baseSubtotal,
    landedTotal,
    effectiveSubtotal: baseSubtotal.plus(landedTotal),
    lines,
  };
}

export const purchaseOrderInclude = Prisma.validator<Prisma.PurchaseOrderInclude>()({
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
  landedCosts: {
    orderBy: [{ incurredAt: "desc" }, { id: "desc" }],
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
});

export const purchaseRequisitionInclude = Prisma.validator<Prisma.PurchaseRequisitionInclude>()({
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
  convertedBy: {
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
  purchaseOrders: {
    select: {
      id: true,
      poNumber: true,
      status: true,
      supplier: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: { id: "desc" },
  },
});

export const rfqInclude = Prisma.validator<Prisma.RfqInclude>()({
  warehouse: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  purchaseRequisition: {
    select: {
      id: true,
      requisitionNumber: true,
      status: true,
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
  supplierInvites: {
    orderBy: [{ invitedAt: "asc" }, { id: "asc" }],
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
          code: true,
          currency: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
  quotations: {
    orderBy: [{ quotedAt: "desc" }, { id: "desc" }],
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
          code: true,
          currency: true,
        },
      },
      submittedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: {
        orderBy: { id: "asc" },
        include: {
          rfqItem: {
            select: {
              id: true,
              quantityRequested: true,
              productVariantId: true,
            },
          },
          productVariant: {
            select: {
              id: true,
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
    },
  },
  award: {
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      supplierQuotation: {
        select: {
          id: true,
          status: true,
          total: true,
          quotedAt: true,
        },
      },
      purchaseOrder: {
        select: {
          id: true,
          poNumber: true,
          status: true,
        },
      },
      awardedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
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

export const supplierInvoiceInclude = Prisma.validator<Prisma.SupplierInvoiceInclude>()({
  supplier: {
    select: {
      id: true,
      name: true,
      code: true,
      currency: true,
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
          unitCost: true,
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
  payments: {
    select: {
      id: true,
      paymentNumber: true,
      amount: true,
      paymentDate: true,
    },
    orderBy: { paymentDate: "desc" },
  },
  paymentHoldReleasedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
});

export const supplierReturnInclude = Prisma.validator<Prisma.SupplierReturnInclude>()({
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
  purchaseOrder: {
    select: {
      id: true,
      poNumber: true,
      status: true,
    },
  },
  goodsReceipt: {
    select: {
      id: true,
      receiptNumber: true,
      receivedAt: true,
      purchaseOrder: {
        select: {
          id: true,
          poNumber: true,
          supplierId: true,
          warehouseId: true,
        },
      },
    },
  },
  supplierInvoice: {
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      total: true,
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
  dispatchedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  closedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  items: {
    orderBy: { id: "asc" },
    include: {
      goodsReceiptItem: {
        select: {
          id: true,
          quantityReceived: true,
        },
      },
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

export const warehouseTransferInclude = Prisma.validator<Prisma.WarehouseTransferInclude>()({
  sourceWarehouse: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  destinationWarehouse: {
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
  dispatchedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  receivedBy: {
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
          stockLevels: {
            select: {
              warehouseId: true,
              quantity: true,
              reserved: true,
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

export type PurchaseRequisitionWithRelations = Prisma.PurchaseRequisitionGetPayload<{
  include: typeof purchaseRequisitionInclude;
}>;

export type RfqWithRelations = Prisma.RfqGetPayload<{
  include: typeof rfqInclude;
}>;

export type GoodsReceiptWithRelations = Prisma.GoodsReceiptGetPayload<{
  include: typeof goodsReceiptInclude;
}>;

export type SupplierInvoiceWithRelations = Prisma.SupplierInvoiceGetPayload<{
  include: typeof supplierInvoiceInclude;
}>;

export type SupplierReturnWithRelations = Prisma.SupplierReturnGetPayload<{
  include: typeof supplierReturnInclude;
}>;

export type WarehouseTransferWithRelations = Prisma.WarehouseTransferGetPayload<{
  include: typeof warehouseTransferInclude;
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
    landedCosts: purchaseOrder.landedCosts.map((cost) => ({
      id: cost.id,
      component: cost.component,
      amount: cost.amount.toString(),
      currency: cost.currency,
      incurredAt: cost.incurredAt.toISOString(),
      note: cost.note ?? null,
      createdById: cost.createdById ?? null,
      createdByName: cost.createdBy?.name ?? null,
    })),
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

export function toPurchaseRequisitionLogSnapshot(
  requisition: PurchaseRequisitionWithRelations,
) {
  return {
    requisitionNumber: requisition.requisitionNumber,
    status: requisition.status,
    warehouseId: requisition.warehouseId,
    warehouseCode: requisition.warehouse.code,
    requestedAt: requisition.requestedAt.toISOString(),
    neededBy: requisition.neededBy?.toISOString() ?? null,
    submittedAt: requisition.submittedAt?.toISOString() ?? null,
    approvedAt: requisition.approvedAt?.toISOString() ?? null,
    rejectedAt: requisition.rejectedAt?.toISOString() ?? null,
    convertedAt: requisition.convertedAt?.toISOString() ?? null,
    note: requisition.note ?? null,
    purchaseOrders: requisition.purchaseOrders.map((purchaseOrder) => ({
      id: purchaseOrder.id,
      poNumber: purchaseOrder.poNumber,
      status: purchaseOrder.status,
      supplierId: purchaseOrder.supplier.id,
      supplierName: purchaseOrder.supplier.name,
    })),
    items: requisition.items.map((item) => ({
      id: item.id,
      variantId: item.productVariantId,
      sku: item.productVariant.sku,
      productName: item.productVariant.product.name,
      quantityRequested: item.quantityRequested,
      quantityApproved: item.quantityApproved,
    })),
  };
}

export function toRfqLogSnapshot(rfq: RfqWithRelations) {
  return {
    rfqNumber: rfq.rfqNumber,
    status: rfq.status,
    warehouseId: rfq.warehouseId,
    warehouseCode: rfq.warehouse.code,
    purchaseRequisitionId: rfq.purchaseRequisitionId,
    purchaseRequisitionNumber: rfq.purchaseRequisition?.requisitionNumber ?? null,
    requestedAt: rfq.requestedAt.toISOString(),
    submissionDeadline: rfq.submissionDeadline?.toISOString() ?? null,
    submittedAt: rfq.submittedAt?.toISOString() ?? null,
    closedAt: rfq.closedAt?.toISOString() ?? null,
    awardedAt: rfq.awardedAt?.toISOString() ?? null,
    cancelledAt: rfq.cancelledAt?.toISOString() ?? null,
    currency: rfq.currency,
    note: rfq.note ?? null,
    items: rfq.items.map((item) => ({
      id: item.id,
      variantId: item.productVariantId,
      sku: item.productVariant.sku,
      productName: item.productVariant.product.name,
      quantityRequested: item.quantityRequested,
      targetUnitCost: item.targetUnitCost?.toString() ?? null,
    })),
    supplierInvites: rfq.supplierInvites.map((invite) => ({
      id: invite.id,
      supplierId: invite.supplierId,
      supplierCode: invite.supplier.code,
      supplierName: invite.supplier.name,
      status: invite.status,
      invitedAt: invite.invitedAt.toISOString(),
      respondedAt: invite.respondedAt?.toISOString() ?? null,
      note: invite.note ?? null,
    })),
    quotations: rfq.quotations.map((quotation) => ({
      id: quotation.id,
      supplierId: quotation.supplierId,
      supplierCode: quotation.supplier.code,
      supplierName: quotation.supplier.name,
      status: quotation.status,
      quotedAt: quotation.quotedAt.toISOString(),
      validUntil: quotation.validUntil?.toISOString() ?? null,
      subtotal: quotation.subtotal.toString(),
      taxTotal: quotation.taxTotal.toString(),
      total: quotation.total.toString(),
      items: quotation.items.map((item) => ({
        id: item.id,
        rfqItemId: item.rfqItemId,
        variantId: item.productVariantId,
        sku: item.productVariant.sku,
        productName: item.productVariant.product.name,
        quantityQuoted: item.quantityQuoted,
        unitCost: item.unitCost.toString(),
        lineTotal: item.lineTotal.toString(),
      })),
    })),
    award: rfq.award
      ? {
          id: rfq.award.id,
          supplierId: rfq.award.supplierId,
          supplierCode: rfq.award.supplier.code,
          supplierName: rfq.award.supplier.name,
          status: rfq.award.status,
          awardedAt: rfq.award.awardedAt.toISOString(),
          purchaseOrderId: rfq.award.purchaseOrderId,
          purchaseOrderNumber: rfq.award.purchaseOrder?.poNumber ?? null,
          quotationId: rfq.award.supplierQuotationId,
          quotationTotal: rfq.award.supplierQuotation.total.toString(),
        }
      : null,
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
  matchStatus?: string;
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
  paymentHoldStatus?: string;
  paymentHoldReason?: string | null;
  paymentHoldOverrideNote?: string | null;
  slaRecommendedCredit?: Prisma.Decimal;
  slaCreditStatus?: string;
  slaCreditReason?: string | null;
}) {
  return {
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    matchStatus: invoice.matchStatus ?? null,
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
    paymentHoldStatus: invoice.paymentHoldStatus ?? null,
    paymentHoldReason: invoice.paymentHoldReason ?? null,
    paymentHoldOverrideNote: invoice.paymentHoldOverrideNote ?? null,
    slaRecommendedCredit: invoice.slaRecommendedCredit?.toString() ?? "0",
    slaCreditStatus: invoice.slaCreditStatus ?? null,
    slaCreditReason: invoice.slaCreditReason ?? null,
  };
}

function decimalAbs(value: Prisma.Decimal) {
  return value.lt(0) ? value.mul(-1) : value;
}

function isDecimalEqual(
  left: Prisma.Decimal | string | number,
  right: Prisma.Decimal | string | number,
  tolerance = new Prisma.Decimal("0.01"),
) {
  const leftDecimal = left instanceof Prisma.Decimal ? left : new Prisma.Decimal(left);
  const rightDecimal = right instanceof Prisma.Decimal ? right : new Prisma.Decimal(right);
  return decimalAbs(leftDecimal.minus(rightDecimal)).lte(tolerance);
}

export function evaluateSupplierInvoiceThreeWayMatch(
  invoice: SupplierInvoiceWithRelations,
) {
  if (!invoice.purchaseOrderId || !invoice.purchaseOrder) {
    return {
      status: "PENDING" as const,
      summary: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        purchaseOrderId: null,
        purchaseOrderNumber: null,
        matchedLineCount: 0,
        varianceCount: 0,
        invoiceSubtotal: invoice.subtotal.toString(),
        expectedSubtotal: null,
        lines: [],
        issues: ["Invoice is not linked to a purchase order."],
      },
    };
  }

  if (invoice.items.length === 0) {
    return {
      status: "PENDING" as const,
      summary: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        purchaseOrderId: invoice.purchaseOrderId,
        purchaseOrderNumber: invoice.purchaseOrder.poNumber,
        matchedLineCount: 0,
        varianceCount: 0,
        invoiceSubtotal: invoice.subtotal.toString(),
        expectedSubtotal: null,
        lines: [],
        issues: ["Invoice has no line items to match."],
      },
    };
  }

  const poItemMap = new Map(invoice.purchaseOrder.items.map((item) => [item.id, item]));
  const lines = invoice.items.map((item) => {
    const purchaseOrderItem =
      (item.purchaseOrderItemId ? poItemMap.get(item.purchaseOrderItemId) : null) ??
      invoice.purchaseOrder?.items.find(
        (candidate) => candidate.productVariantId === item.productVariantId,
      ) ??
      null;

    const expectedUnitCost = purchaseOrderItem?.unitCost ?? null;
    const expectedReceivedQty = purchaseOrderItem?.quantityReceived ?? 0;
    const expectedOrderedQty = purchaseOrderItem?.quantityOrdered ?? 0;
    const expectedLineTotal = expectedUnitCost
      ? expectedUnitCost.mul(item.quantityInvoiced)
      : null;

    const issues: string[] = [];
    if (!purchaseOrderItem) {
      issues.push("Invoice line is not linked to a purchase order item.");
    } else {
      if (item.quantityInvoiced > expectedReceivedQty) {
        issues.push("Invoiced quantity exceeds goods received quantity.");
      }
      if (item.quantityInvoiced > expectedOrderedQty) {
        issues.push("Invoiced quantity exceeds ordered quantity.");
      }
      if (expectedUnitCost && !isDecimalEqual(item.unitCost, expectedUnitCost)) {
        issues.push("Invoice unit cost does not match purchase order unit cost.");
      }
      if (expectedLineTotal && !isDecimalEqual(item.lineTotal, expectedLineTotal)) {
        issues.push("Invoice line total does not match expected PO value.");
      }
    }

    return {
      id: item.id,
      sku: item.productVariant.sku,
      productName: item.productVariant.product.name,
      quantityInvoiced: item.quantityInvoiced,
      quantityReceived: expectedReceivedQty,
      quantityOrdered: expectedOrderedQty,
      invoiceUnitCost: item.unitCost.toString(),
      purchaseOrderUnitCost: expectedUnitCost?.toString() ?? null,
      invoiceLineTotal: item.lineTotal.toString(),
      expectedLineTotal: expectedLineTotal?.toString() ?? null,
      isMatched: issues.length === 0,
      issues,
    };
  });

  const expectedSubtotal = lines.reduce(
    (sum, line) =>
      line.expectedLineTotal ? sum.plus(new Prisma.Decimal(line.expectedLineTotal)) : sum,
    new Prisma.Decimal(0),
  );
  const invoiceLineSubtotal = invoice.items.reduce(
    (sum, item) => sum.plus(item.lineTotal),
    new Prisma.Decimal(0),
  );

  const issues: string[] = [];
  if (!isDecimalEqual(invoice.subtotal, invoiceLineSubtotal)) {
    issues.push("Invoice subtotal does not equal sum of invoice lines.");
  }
  if (!isDecimalEqual(invoiceLineSubtotal, expectedSubtotal)) {
    issues.push("Invoice line subtotal does not equal expected PO/GR matched subtotal.");
  }

  const varianceCount =
    lines.filter((line) => !line.isMatched).length + issues.length;
  return {
    status: (varianceCount === 0 ? "MATCHED" : "VARIANCE") as
      | "MATCHED"
      | "VARIANCE",
    summary: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      purchaseOrderId: invoice.purchaseOrderId,
      purchaseOrderNumber: invoice.purchaseOrder.poNumber,
      matchedLineCount: lines.filter((line) => line.isMatched).length,
      varianceCount,
      invoiceSubtotal: invoice.subtotal.toString(),
      expectedSubtotal: expectedSubtotal.toString(),
      lines,
      issues,
    },
  };
}

export async function refreshSupplierInvoiceThreeWayMatch(
  tx: TransactionClient,
  supplierInvoiceId: number,
  matchedById?: string | null,
) {
  const invoice = await tx.supplierInvoice.findUnique({
    where: { id: supplierInvoiceId },
    include: supplierInvoiceInclude,
  });

  if (!invoice) {
    throw new Error("Supplier invoice not found");
  }

  const evaluation = evaluateSupplierInvoiceThreeWayMatch(invoice);

  const updated = await tx.supplierInvoice.update({
    where: { id: supplierInvoiceId },
    data: {
      matchStatus: evaluation.status,
      matchedAt: new Date(),
      ...(matchedById ? { matchedById } : {}),
    },
    include: supplierInvoiceInclude,
  });

  return {
    invoice: updated,
    evaluation,
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

export function toSupplierReturnLogSnapshot(supplierReturn: SupplierReturnWithRelations) {
  return {
    returnNumber: supplierReturn.returnNumber,
    status: supplierReturn.status,
    supplierId: supplierReturn.supplierId,
    supplierName: supplierReturn.supplier.name,
    warehouseId: supplierReturn.warehouseId,
    warehouseCode: supplierReturn.warehouse.code,
    purchaseOrderId: supplierReturn.purchaseOrderId,
    purchaseOrderNumber: supplierReturn.purchaseOrder?.poNumber ?? null,
    goodsReceiptId: supplierReturn.goodsReceiptId,
    goodsReceiptNumber: supplierReturn.goodsReceipt.receiptNumber,
    supplierInvoiceId: supplierReturn.supplierInvoiceId,
    supplierInvoiceNumber: supplierReturn.supplierInvoice?.invoiceNumber ?? null,
    requestedAt: supplierReturn.requestedAt.toISOString(),
    requiredBy: supplierReturn.requiredBy?.toISOString() ?? null,
    submittedAt: supplierReturn.submittedAt?.toISOString() ?? null,
    approvedAt: supplierReturn.approvedAt?.toISOString() ?? null,
    dispatchedAt: supplierReturn.dispatchedAt?.toISOString() ?? null,
    closedAt: supplierReturn.closedAt?.toISOString() ?? null,
    ledgerPostedAt: supplierReturn.ledgerPostedAt?.toISOString() ?? null,
    reasonCode: supplierReturn.reasonCode ?? null,
    note: supplierReturn.note ?? null,
    items: supplierReturn.items.map((item) => ({
      id: item.id,
      goodsReceiptItemId: item.goodsReceiptItemId,
      purchaseOrderItemId: item.purchaseOrderItemId,
      variantId: item.productVariantId,
      sku: item.productVariant.sku,
      productName: item.productVariant.product.name,
      quantityRequested: item.quantityRequested,
      quantityDispatched: item.quantityDispatched,
      unitCost: item.unitCost.toString(),
      lineTotal: item.lineTotal.toString(),
      reason: item.reason ?? null,
    })),
  };
}

export function toWarehouseTransferLogSnapshot(transfer: WarehouseTransferWithRelations) {
  return {
    transferNumber: transfer.transferNumber,
    status: transfer.status,
    sourceWarehouseId: transfer.sourceWarehouseId,
    sourceWarehouseCode: transfer.sourceWarehouse.code,
    destinationWarehouseId: transfer.destinationWarehouseId,
    destinationWarehouseCode: transfer.destinationWarehouse.code,
    requestedAt: transfer.requestedAt.toISOString(),
    requiredBy: transfer.requiredBy?.toISOString() ?? null,
    submittedAt: transfer.submittedAt?.toISOString() ?? null,
    approvedAt: transfer.approvedAt?.toISOString() ?? null,
    dispatchedAt: transfer.dispatchedAt?.toISOString() ?? null,
    receivedAt: transfer.receivedAt?.toISOString() ?? null,
    note: transfer.note ?? null,
    items: transfer.items.map((item) => ({
      id: item.id,
      variantId: item.productVariantId,
      sku: item.productVariant.sku,
      productName: item.productVariant.product.name,
      quantityRequested: item.quantityRequested,
      quantityDispatched: item.quantityDispatched,
      quantityReceived: item.quantityReceived,
    })),
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
      ledgerEntries: {
        where: {
          entryType: "ADJUSTMENT",
          direction: "CREDIT",
        },
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
  const adjustmentCredit = invoice.ledgerEntries.reduce(
    (sum, entry) => sum.plus(entry.amount),
    new Prisma.Decimal(0),
  );
  const settledAmount = paidAmount.plus(adjustmentCredit);

  let nextStatus = invoice.status;
  if (settledAmount.gte(invoice.total)) {
    nextStatus = "PAID";
  } else if (settledAmount.gt(0)) {
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

export async function refreshSupplierReturnStatus(
  tx: TransactionClient,
  supplierReturnId: number,
) {
  const supplierReturn = await tx.supplierReturn.findUnique({
    where: { id: supplierReturnId },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      approvedAt: true,
      closedAt: true,
      items: {
        select: {
          quantityRequested: true,
          quantityDispatched: true,
        },
      },
    },
  });

  if (!supplierReturn) {
    throw new Error("Supplier return not found");
  }

  const requested = supplierReturn.items.reduce(
    (sum, item) => sum + item.quantityRequested,
    0,
  );
  const dispatched = supplierReturn.items.reduce(
    (sum, item) => sum + item.quantityDispatched,
    0,
  );

  let status = supplierReturn.status;
  let dispatchedAt: Date | null | undefined = undefined;

  if (supplierReturn.closedAt) {
    status = "CLOSED";
  } else if (requested > 0 && dispatched >= requested) {
    status = "DISPATCHED";
    dispatchedAt = new Date();
  } else if (dispatched > 0) {
    status = "PARTIALLY_DISPATCHED";
    dispatchedAt = new Date();
  } else if (supplierReturn.approvedAt) {
    status = "APPROVED";
    dispatchedAt = null;
  } else if (supplierReturn.submittedAt) {
    status = "SUBMITTED";
    dispatchedAt = null;
  } else {
    status = "DRAFT";
    dispatchedAt = null;
  }

  return tx.supplierReturn.update({
    where: { id: supplierReturnId },
    data: {
      status,
      ...(dispatchedAt !== undefined ? { dispatchedAt } : {}),
    },
    include: supplierReturnInclude,
  });
}

export async function refreshWarehouseTransferStatus(
  tx: TransactionClient,
  warehouseTransferId: number,
) {
  const transfer = await tx.warehouseTransfer.findUnique({
    where: { id: warehouseTransferId },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      approvedAt: true,
      items: {
        select: {
          quantityRequested: true,
          quantityDispatched: true,
          quantityReceived: true,
        },
      },
    },
  });

  if (!transfer) {
    throw new Error("Warehouse transfer not found");
  }

  const requested = transfer.items.reduce((sum, item) => sum + item.quantityRequested, 0);
  const dispatched = transfer.items.reduce((sum, item) => sum + item.quantityDispatched, 0);
  const received = transfer.items.reduce((sum, item) => sum + item.quantityReceived, 0);

  let status = transfer.status;
  let receivedAt: Date | null | undefined = undefined;

  if (requested > 0 && received >= requested && dispatched >= requested) {
    status = "RECEIVED";
    receivedAt = new Date();
  } else if (received > 0) {
    status = "PARTIALLY_RECEIVED";
    receivedAt = null;
  } else if (requested > 0 && dispatched >= requested) {
    status = "DISPATCHED";
    receivedAt = null;
  } else if (dispatched > 0) {
    status = "PARTIALLY_DISPATCHED";
    receivedAt = null;
  } else if (transfer.approvedAt) {
    status = "APPROVED";
    receivedAt = null;
  } else if (transfer.submittedAt) {
    status = "SUBMITTED";
    receivedAt = null;
  } else {
    status = "DRAFT";
    receivedAt = null;
  }

  return tx.warehouseTransfer.update({
    where: { id: warehouseTransferId },
    data: {
      status,
      ...(receivedAt !== undefined ? { receivedAt } : {}),
    },
    include: warehouseTransferInclude,
  });
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
