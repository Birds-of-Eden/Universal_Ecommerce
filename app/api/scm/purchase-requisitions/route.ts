import { Prisma } from "@/generated/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import {
  generatePurchaseRequisitionNumber,
  purchaseRequisitionInclude,
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

function buildWarehouseScopedWhere(
  access: Awaited<ReturnType<typeof getAccessContext>>,
  requestedWarehouseId: number | null,
): Prisma.PurchaseRequisitionWhereInput | null {
  if (hasGlobalPurchaseRequisitionScope(access)) {
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
    if (!canReadPurchaseRequisitions(access)) {
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

    const requisitions = await prisma.purchaseRequisition.findMany({
      where: {
        ...warehouseFilter,
        ...(status
          ? { status: status as Prisma.EnumPurchaseRequisitionStatusFilter["equals"] }
          : {}),
        ...(search
          ? {
              OR: [
                {
                  requisitionNumber: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  warehouse: {
                    name: { contains: search, mode: "insensitive" },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
      include: purchaseRequisitionInclude,
    });

    return NextResponse.json(requisitions);
  } catch (error) {
    console.error("SCM PURCHASE REQUISITIONS GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load purchase requisitions." },
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
      warehouseId?: unknown;
      neededBy?: unknown;
      note?: unknown;
      items?: Array<{
        productVariantId?: unknown;
        quantityRequested?: unknown;
        description?: unknown;
      }>;
    };

    const warehouseId = Number(body.warehouseId);
    if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
      return NextResponse.json({ error: "Warehouse is required." }, { status: 400 });
    }
    if (!access.can("purchase_requisitions.manage", warehouseId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json(
        { error: "At least one requisition item is required." },
        { status: 400 },
      );
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
      return {
        productVariantId,
        quantityRequested,
        description: toCleanText(item.description, 255),
      };
    });

    const [warehouse, variants] = await Promise.all([
      prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: { id: true, name: true, code: true },
      }),
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

    const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
    const neededBy = body.neededBy ? new Date(String(body.neededBy)) : null;
    if (neededBy && Number.isNaN(neededBy.getTime())) {
      return NextResponse.json({ error: "Needed-by date is invalid." }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const requisitionNumber = await generatePurchaseRequisitionNumber(tx);
      return tx.purchaseRequisition.create({
        data: {
          requisitionNumber,
          warehouseId,
          neededBy,
          note: toCleanText(body.note, 500) || null,
          createdById: access.userId,
          items: {
            create: normalizedItems.map((item) => ({
              productVariantId: item.productVariantId,
              quantityRequested: item.quantityRequested,
              description:
                item.description ||
                `${variantMap.get(item.productVariantId)?.product.name ?? "Variant"} (${variantMap.get(item.productVariantId)?.sku ?? "SKU"})`,
            })),
          },
        },
        include: purchaseRequisitionInclude,
      });
    });

    await logActivity({
      action: "create",
      entity: "purchase_requisition",
      entityId: created.id,
      access,
      request,
      metadata: {
        message: `Created purchase requisition ${created.requisitionNumber}`,
      },
      after: toPurchaseRequisitionLogSnapshot(created),
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("SCM PURCHASE REQUISITIONS POST ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create purchase requisition." },
      { status: 500 },
    );
  }
}
