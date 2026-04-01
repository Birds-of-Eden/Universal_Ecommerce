import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getAccessContext } from "@/lib/rbac";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

const DETAILS_PERMISSIONS = [
  "settings.warehouse.manage",
  "inventory.manage",
  "shipments.manage",
  "orders.read_all",
  "dashboard.read",
] as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(
      session?.user as { id?: string; role?: string } | undefined,
    );
    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!access.hasAny([...DETAILS_PERMISSIONS])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: idParam } = await params;
    const warehouseId = Number(idParam);
    if (!warehouseId || Number.isNaN(warehouseId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const hasGlobalScope =
      access.isSuperAdmin ||
      DETAILS_PERMISSIONS.some((permission) => access.hasGlobal(permission));

    if (!hasGlobalScope && !access.warehouseIds.includes(warehouseId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [warehouse, stockLevels, shipmentCounts, shipmentDeliveredToday, sold, deliveryMenCount, assignmentCounts, staffCount] =
      await Promise.all([
        prisma.warehouse.findUnique({
          where: { id: warehouseId },
        }),
        prisma.stockLevel.findMany({
          where: { warehouseId },
          orderBy: [{ updatedAt: "desc" }],
          select: {
            id: true,
            quantity: true,
            reserved: true,
            updatedAt: true,
            variant: {
              select: {
                id: true,
                sku: true,
                lowStockThreshold: true,
                product: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
          },
        }),
        prisma.shipment.groupBy({
          by: ["status"],
          where: { warehouseId },
          _count: { _all: true },
        }),
        prisma.shipment.count({
          where: {
            warehouseId,
            status: "DELIVERED",
            deliveredAt: { gte: todayStart },
          },
        }),
        prisma.shipmentItem.aggregate({
          where: {
            shipment: {
              warehouseId,
              status: "DELIVERED",
            },
          },
          _sum: {
            quantity: true,
          },
        }),
        prisma.deliveryManProfile.count({
          where: { warehouseId },
        }),
        prisma.deliveryAssignment.groupBy({
          by: ["status"],
          where: { warehouseId },
          _count: { _all: true },
        }),
        prisma.warehouseMembership.count({
          where: { warehouseId },
        }),
      ]);

    if (!warehouse) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

    const shipmentStats = shipmentCounts.reduce(
      (acc, row) => {
        acc.total += row._count._all;
        acc.byStatus[row.status] = row._count._all;
        return acc;
      },
      { total: 0, byStatus: {} as Record<string, number> },
    );

    const assignmentStats = assignmentCounts.reduce(
      (acc, row) => {
        acc.total += row._count._all;
        acc.byStatus[row.status] = row._count._all;
        return acc;
      },
      { total: 0, byStatus: {} as Record<string, number> },
    );

    const totalUnits = stockLevels.reduce(
      (sum, level) => sum + Number(level.quantity),
      0,
    );

    const reservedUnits = stockLevels.reduce(
      (sum, level) => sum + Number(level.reserved),
      0,
    );

    const lowStockItems = stockLevels.filter((level) => {
      const available = Number(level.quantity) - Number(level.reserved);
      const threshold = Number(level.variant.lowStockThreshold || 0);
      return available > 0 && available <= threshold;
    }).length;

    const outOfStockItems = stockLevels.filter(
      (level) => Number(level.quantity) - Number(level.reserved) <= 0,
    ).length;

    return NextResponse.json({
      warehouse,
      summary: {
        totalUnits,
        reservedUnits,
        availableUnits: totalUnits - reservedUnits,
        productVariants: stockLevels.length,
        distinctProducts: new Set(stockLevels.map((level) => level.variant.product.id)).size,
        lowStockItems,
        outOfStockItems,
        shipments: shipmentStats,
        deliveredToday: shipmentDeliveredToday,
        soldUnits: Number(sold._sum.quantity ?? 0),
        deliveryMen: {
          count: deliveryMenCount,
        },
        deliveryAssignments: assignmentStats,
        staff: {
          count: staffCount,
        },
      },
      stockLevels: stockLevels.map((level) => ({
        id: level.id,
        quantity: Number(level.quantity),
        reserved: Number(level.reserved),
        available: Number(level.quantity) - Number(level.reserved),
        updatedAt: level.updatedAt,
        variant: level.variant,
      })),
    });
  } catch (error) {
    console.error("WAREHOUSE DETAILS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load warehouse details" },
      { status: 500 },
    );
  }
}
