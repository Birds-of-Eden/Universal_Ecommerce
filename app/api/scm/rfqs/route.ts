import { Prisma } from "@/generated/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import { generateRfqNumber, rfqInclude, toRfqLogSnapshot } from "@/lib/scm";

const RFQ_READ_PERMISSIONS = ["rfq.read", "rfq.manage", "rfq.approve"] as const;

function cleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanCurrency(value: unknown) {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "BDT";
  return raw.length === 3 ? raw : "BDT";
}

function canReadRfqs(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return access.hasAny([...RFQ_READ_PERMISSIONS]);
}

function hasGlobalRfqScope(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return RFQ_READ_PERMISSIONS.some((permission) => access.hasGlobal(permission));
}

function buildWarehouseScopedWhere(
  access: Awaited<ReturnType<typeof getAccessContext>>,
  requestedWarehouseId: number | null,
): Prisma.RfqWhereInput | null {
  if (hasGlobalRfqScope(access)) {
    return requestedWarehouseId ? { warehouseId: requestedWarehouseId } : {};
  }

  if (requestedWarehouseId) {
    if (!access.canAccessWarehouse(requestedWarehouseId)) {
      return null;
    }
    return { warehouseId: requestedWarehouseId };
  }

  if (access.warehouseIds.length === 0) {
    return null;
  }

  return { warehouseId: { in: access.warehouseIds } };
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
    if (!canReadRfqs(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const status = request.nextUrl.searchParams.get("status")?.trim() || "";
    const warehouseId = Number(request.nextUrl.searchParams.get("warehouseId") || "");
    const search = request.nextUrl.searchParams.get("search")?.trim() || "";

    const warehouseFilter = buildWarehouseScopedWhere(
      access,
      Number.isInteger(warehouseId) && warehouseId > 0 ? warehouseId : null,
    );
    if (warehouseFilter === null) {
      return NextResponse.json([]);
    }

    const filters: Prisma.RfqWhereInput[] = [warehouseFilter];
    if (status) {
      filters.push({
        status: status as Prisma.EnumRfqStatusFilter["equals"],
      });
    }
    if (search) {
      filters.push({
        OR: [
          {
            rfqNumber: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            warehouse: {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
          {
            supplierInvites: {
              some: {
                supplier: {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
          },
        ],
      });
    }

    const rfqs = await prisma.rfq.findMany({
      where: filters.length === 1 ? filters[0] : { AND: filters },
      orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
      include: rfqInclude,
    });

    return NextResponse.json(rfqs);
  } catch (error) {
    console.error("SCM RFQ GET ERROR:", error);
    return NextResponse.json({ error: "Failed to load RFQs." }, { status: 500 });
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
      warehouseId?: unknown;
      purchaseRequisitionId?: unknown;
      submissionDeadline?: unknown;
      note?: unknown;
      currency?: unknown;
      supplierIds?: unknown[];
      items?: Array<{
        productVariantId?: unknown;
        quantityRequested?: unknown;
        description?: unknown;
        targetUnitCost?: unknown;
      }>;
    };

    const warehouseId = Number(body.warehouseId);
    if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
      return NextResponse.json({ error: "Warehouse is required." }, { status: 400 });
    }
    if (!access.can("rfq.manage", warehouseId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const purchaseRequisitionId = Number(body.purchaseRequisitionId);
    const hasPurchaseRequisition =
      Number.isInteger(purchaseRequisitionId) && purchaseRequisitionId > 0;

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ error: "At least one RFQ item is required." }, { status: 400 });
    }

    const uniqueVariantIds = new Set<number>();
    const normalizedItems = items.map((item, index) => {
      const productVariantId = Number(item.productVariantId);
      const quantityRequested = Number(item.quantityRequested);
      if (!Number.isInteger(productVariantId) || productVariantId <= 0) {
        throw new Error(`Item ${index + 1}: variant is required`);
      }
      if (uniqueVariantIds.has(productVariantId)) {
        throw new Error(`Item ${index + 1}: duplicate variant selected`);
      }
      uniqueVariantIds.add(productVariantId);
      if (!Number.isInteger(quantityRequested) || quantityRequested <= 0) {
        throw new Error(`Item ${index + 1}: quantity must be greater than 0`);
      }

      const targetUnitCostValue = item.targetUnitCost;
      const targetUnitCost =
        targetUnitCostValue === null ||
        targetUnitCostValue === undefined ||
        targetUnitCostValue === ""
          ? null
          : new Prisma.Decimal(Number(targetUnitCostValue));
      if (targetUnitCost && targetUnitCost.lt(0)) {
        throw new Error(`Item ${index + 1}: target unit cost cannot be negative`);
      }

      return {
        productVariantId,
        quantityRequested,
        description: cleanText(item.description, 255),
        targetUnitCost,
      };
    });

    const supplierIdsRaw = Array.isArray(body.supplierIds) ? body.supplierIds : [];
    const supplierIds = [...new Set(supplierIdsRaw.map((value) => Number(value)).filter((id) => Number.isInteger(id) && id > 0))];

    const [warehouse, requisition, variants, suppliers] = await Promise.all([
      prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: { id: true, name: true, code: true },
      }),
      hasPurchaseRequisition
        ? prisma.purchaseRequisition.findUnique({
            where: { id: purchaseRequisitionId },
            select: {
              id: true,
              warehouseId: true,
              status: true,
            },
          })
        : Promise.resolve(null),
      prisma.productVariant.findMany({
        where: {
          id: { in: normalizedItems.map((item) => item.productVariantId) },
        },
        select: {
          id: true,
          sku: true,
          product: {
            select: {
              name: true,
            },
          },
        },
      }),
      supplierIds.length > 0
        ? prisma.supplier.findMany({
            where: {
              id: { in: supplierIds },
              isActive: true,
            },
            select: {
              id: true,
              name: true,
            },
          })
        : Promise.resolve([]),
    ]);

    if (!warehouse) {
      return NextResponse.json({ error: "Warehouse not found." }, { status: 404 });
    }
    if (variants.length !== normalizedItems.length) {
      return NextResponse.json(
        { error: "One or more variants were not found." },
        { status: 400 },
      );
    }
    if (hasPurchaseRequisition) {
      if (!requisition) {
        return NextResponse.json(
          { error: "Linked purchase requisition not found." },
          { status: 404 },
        );
      }
      if (requisition.warehouseId !== warehouseId) {
        return NextResponse.json(
          { error: "RFQ warehouse must match linked purchase requisition warehouse." },
          { status: 400 },
        );
      }
      if (!["APPROVED", "CONVERTED"].includes(requisition.status)) {
        return NextResponse.json(
          {
            error:
              "Only approved/converted purchase requisitions can be linked to a new RFQ.",
          },
          { status: 400 },
        );
      }
    }
    if (suppliers.length !== supplierIds.length) {
      return NextResponse.json(
        { error: "One or more invited suppliers were not found or inactive." },
        { status: 400 },
      );
    }

    const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
    const submissionDeadline = body.submissionDeadline
      ? new Date(String(body.submissionDeadline))
      : null;
    if (submissionDeadline && Number.isNaN(submissionDeadline.getTime())) {
      return NextResponse.json(
        { error: "Submission deadline date is invalid." },
        { status: 400 },
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const rfqNumber = await generateRfqNumber(tx);
      return tx.rfq.create({
        data: {
          rfqNumber,
          warehouseId,
          purchaseRequisitionId: hasPurchaseRequisition ? purchaseRequisitionId : null,
          submissionDeadline,
          note: cleanText(body.note, 1000) || null,
          currency: cleanCurrency(body.currency),
          createdById: access.userId,
          items: {
            create: normalizedItems.map((item) => ({
              productVariantId: item.productVariantId,
              quantityRequested: item.quantityRequested,
              description:
                item.description ||
                `${variantMap.get(item.productVariantId)?.product.name ?? "Variant"} (${variantMap.get(item.productVariantId)?.sku ?? "SKU"})`,
              targetUnitCost: item.targetUnitCost,
            })),
          },
          supplierInvites:
            supplierIds.length > 0
              ? {
                  create: supplierIds.map((supplierId) => ({
                    supplierId,
                    status: "INVITED",
                    createdById: access.userId,
                  })),
                }
              : undefined,
        },
        include: rfqInclude,
      });
    });

    await logActivity({
      action: "create",
      entity: "rfq",
      entityId: created.id,
      access,
      request,
      metadata: {
        message: `Created RFQ ${created.rfqNumber}`,
      },
      after: toRfqLogSnapshot(created),
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("SCM RFQ POST ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create RFQ." },
      { status: 500 },
    );
  }
}
