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
  req: Request,
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

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "20")));
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const productType = searchParams.get("productType") || "";
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") || "asc";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [warehouse, shipmentCounts, shipmentDeliveredToday, sold, deliveryMenCount, assignmentCounts, staffCount, categories] =
      await Promise.all([
        prisma.warehouse.findUnique({
          where: { id: warehouseId },
        }),
        prisma.shipment.groupBy({
          by: ["status"],
          where: { 
            warehouseId,
            ...(dateFrom || dateTo ? {
              createdAt: {
                ...(dateFrom && { gte: new Date(dateFrom) }),
                ...(dateTo && { lte: new Date(dateTo) }),
              },
            } : {}),
          },
          _count: { _all: true },
        }),
        prisma.shipment.count({
          where: {
            warehouseId,
            status: "DELIVERED",
            deliveredAt: { gte: todayStart },
            ...(dateFrom || dateTo ? {
              createdAt: {
                ...(dateFrom && { gte: new Date(dateFrom) }),
                ...(dateTo && { lte: new Date(dateTo) }),
              },
            } : {}),
          },
        }),
        prisma.shipmentItem.aggregate({
          where: {
            shipment: {
              warehouseId,
              status: "DELIVERED",
              ...(dateFrom || dateTo ? {
                createdAt: {
                  ...(dateFrom && { gte: new Date(dateFrom) }),
                  ...(dateTo && { lte: new Date(dateTo) }),
                },
              } : {}),
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
          where: { 
            warehouseId,
            ...(dateFrom || dateTo ? {
              createdAt: {
                ...(dateFrom && { gte: new Date(dateFrom) }),
                ...(dateTo && { lte: new Date(dateTo) }),
              },
            } : {}),
          },
          _count: { _all: true },
        }),
        prisma.warehouseMembership.count({
          where: { warehouseId },
        }),
        prisma.category.findMany({
          select: { id: true, name: true, slug: true },
          orderBy: { name: "asc" },
        }),
      ]);

    if (!warehouse) {
      return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
    }

    // Build where clause for stock levels with filters
    const whereClause: any = { warehouseId };
    if (search) {
      whereClause.variant = {
        product: {
          name: { contains: search, mode: "insensitive" },
        },
      };
    }
    if (category) {
      whereClause.variant = {
        ...whereClause.variant,
        product: {
          ...whereClause.variant?.product,
          categoryId: Number(category),
        },
      };
    }
    if (productType) {
      whereClause.variant = {
        ...whereClause.variant,
        product: {
          ...whereClause.variant?.product,
          type: productType,
        },
      };
    }

    // Get total count for pagination
    const totalCount = await prisma.stockLevel.count({ where: whereClause });

    // Build sorting
    const orderBy: any = {};
    if (sortBy === "name") {
      orderBy.variant = { product: { name: sortOrder } };
    } else if (sortBy === "quantity") {
      orderBy.quantity = sortOrder;
    } else if (sortBy === "available") {
      orderBy.quantity = sortOrder;
    } else if (sortBy === "sold") {
      // We'll handle sold sorting separately
    } else {
      orderBy.updatedAt = sortOrder;
    }

    // Get paginated stock levels
    const stockLevels = await prisma.stockLevel.findMany({
      where: whereClause,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
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
                categoryId: true,
                category: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
          },
        },
      },
    });

    // Calculate sold units per product for filtering and sorting
    const soldUnitsMap = new Map<number, number>();
    
    // First, get all order items to map orderItemId to variantId and productId
    const orderItems = await prisma.orderItem.findMany({
      where: {
        productId: { in: stockLevels.map(l => l.variant.product.id) },
      },
      select: {
        id: true,
        variantId: true,
        productId: true,
      },
    });

    // Create mapping from orderItemId to variantId and productId
    const orderItemMap = new Map<number, { variantId: number | null; productId: number }>(
      orderItems.map(oi => [oi.id, { variantId: oi.variantId, productId: oi.productId }])
    );
    
    if (sortBy === "sold" || searchParams.get("soldFilter")) {
      // Get shipment items and aggregate manually to avoid SQL ambiguity
      const shipmentItems = await prisma.shipmentItem.findMany({
        where: {
          shipment: {
            warehouseId,
            status: "DELIVERED",
            ...(dateFrom || dateTo ? {
              createdAt: {
                ...(dateFrom && { gte: new Date(dateFrom) }),
                ...(dateTo && { lte: new Date(dateTo) }),
              },
            } : {}),
          },
          orderItem: {
            productId: { in: stockLevels.map(l => l.variant.product.id) },
          },
        },
        select: {
          orderItemId: true,
          quantity: true,
        },
      });

      // Aggregate by product
      for (const item of shipmentItems) {
        // Get the variantId and productId from the orderItem mapping
        const orderItemInfo = orderItemMap.get(item.orderItemId);
        if (orderItemInfo) {
          soldUnitsMap.set(orderItemInfo.productId, (soldUnitsMap.get(orderItemInfo.productId) || 0) + Number(item.quantity || 0));
        }
      }
    }

    // Apply sold filter if specified
    const soldFilter = searchParams.get("soldFilter");
    let filteredStockLevels = stockLevels;
    
    if (soldFilter === "best-selling") {
      // Get all sold units for this warehouse
      const allShipmentItems = await prisma.shipmentItem.findMany({
        where: {
          shipment: {
            warehouseId,
            status: "DELIVERED",
            ...(dateFrom || dateTo ? {
              createdAt: {
                ...(dateFrom && { gte: new Date(dateFrom) }),
                ...(dateTo && { lte: new Date(dateTo) }),
              },
            } : {}),
          },
          orderItem: {
            productId: { in: stockLevels.map(l => l.variant.product.id) },
          },
        },
        select: {
          orderItemId: true,
          quantity: true,
        },
      });

      const allSoldUnitsMap = new Map<number, number>();
      for (const item of allShipmentItems) {
        // Get the variantId and productId from the orderItem mapping
        const orderItemInfo = orderItemMap.get(item.orderItemId);
        if (orderItemInfo) {
          allSoldUnitsMap.set(orderItemInfo.productId, (allSoldUnitsMap.get(orderItemInfo.productId) || 0) + Number(item.quantity || 0));
        }
      }

      // Sort by sold units and take top 20%
      const sortedBySold = [...stockLevels].sort((a, b) => {
        const soldA = allSoldUnitsMap.get(a.variant.product.id) || 0;
        const soldB = allSoldUnitsMap.get(b.variant.product.id) || 0;
        return soldB - soldA;
      });
      
      const topCount = Math.max(1, Math.floor(sortedBySold.length * 0.2));
      const topProductIds = new Set(sortedBySold.slice(0, topCount).map(l => l.variant.product.id));
      filteredStockLevels = stockLevels.filter(l => topProductIds.has(l.variant.product.id));
      
    } else if (soldFilter === "low-selling") {
      // Get all sold units for this warehouse
      const allShipmentItems = await prisma.shipmentItem.findMany({
        where: {
          shipment: {
            warehouseId,
            status: "DELIVERED",
            ...(dateFrom || dateTo ? {
              createdAt: {
                ...(dateFrom && { gte: new Date(dateFrom) }),
                ...(dateTo && { lte: new Date(dateTo) }),
              },
            } : {}),
          },
          orderItem: {
            productId: { in: stockLevels.map(l => l.variant.product.id) },
          },
        },
        select: {
          orderItemId: true,
          quantity: true,
        },
      });

      const allSoldUnitsMap = new Map<number, number>();
      for (const item of allShipmentItems) {
        // Get the variantId and productId from the orderItem mapping
        const orderItemInfo = orderItemMap.get(item.orderItemId);
        if (orderItemInfo) {
          allSoldUnitsMap.set(orderItemInfo.productId, (allSoldUnitsMap.get(orderItemInfo.productId) || 0) + Number(item.quantity || 0));
        }
      }

      // Sort by sold units and take bottom 20% (excluding zero sales)
      const sortedBySold = [...stockLevels].sort((a, b) => {
        const soldA = allSoldUnitsMap.get(a.variant.product.id) || 0;
        const soldB = allSoldUnitsMap.get(b.variant.product.id) || 0;
        return soldA - soldB;
      });
      
      // Filter out products with zero sales, then take bottom 20%
      const withSales = sortedBySold.filter(l => (allSoldUnitsMap.get(l.variant.product.id) || 0) > 0);
      const bottomCount = Math.max(1, Math.floor(withSales.length * 0.2));
      const bottomProductIds = new Set(withSales.slice(0, bottomCount).map(l => l.variant.product.id));
      filteredStockLevels = stockLevels.filter(l => bottomProductIds.has(l.variant.product.id));
    }

    // Sort by sold units if needed
    let sortedStockLevels = filteredStockLevels;
    if (sortBy === "sold") {
      sortedStockLevels = [...filteredStockLevels].sort((a, b) => {
        const soldA = soldUnitsMap.get(a.variant.product.id) || 0;
        const soldB = soldUnitsMap.get(b.variant.product.id) || 0;
        return sortOrder === "desc" ? soldB - soldA : soldA - soldB;
      });
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

    const totalUnits = sortedStockLevels.reduce(
      (sum, level) => sum + Number(level.quantity),
      0,
    );

    const reservedUnits = sortedStockLevels.reduce(
      (sum, level) => sum + Number(level.reserved),
      0,
    );

    const lowStockItems = sortedStockLevels.filter((level) => {
      const available = Number(level.quantity) - Number(level.reserved);
      const threshold = Number(level.variant.lowStockThreshold || 0);
      return available > 0 && available <= threshold;
    }).length;

    const outOfStockItems = sortedStockLevels.filter(
      (level) => Number(level.quantity) - Number(level.reserved) <= 0,
    ).length;

    // Get total sold units for all filtered products
    const finalSoldUnitsMap = new Map<number, number>();
    
    // Get order items for the final calculation
    const finalOrderItems = await prisma.orderItem.findMany({
      where: {
        productId: { in: sortedStockLevels.map(l => l.variant.product.id) },
      },
      select: {
        id: true,
        variantId: true,
        productId: true,
      },
    });

    // Create mapping from orderItemId to variantId and productId
    const finalOrderItemMap = new Map<number, { variantId: number | null; productId: number }>(
      finalOrderItems.map(oi => [oi.id, { variantId: oi.variantId, productId: oi.productId }])
    );

    const finalSoldData = await prisma.shipmentItem.findMany({
      where: {
        shipment: {
          warehouseId,
          status: "DELIVERED",
          ...(dateFrom || dateTo ? {
            createdAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          } : {}),
        },
        orderItem: {
          productId: { in: sortedStockLevels.map(l => l.variant.product.id) },
        },
      },
      select: {
        orderItemId: true,
        quantity: true,
      },
    });

    for (const item of finalSoldData) {
    // Get the variantId and productId from the orderItem mapping
    const orderItemInfo = finalOrderItemMap.get(item.orderItemId);
    if (orderItemInfo) {
      finalSoldUnitsMap.set(orderItemInfo.productId, (finalSoldUnitsMap.get(orderItemInfo.productId) || 0) + Number(item.quantity || 0));
    }
  }

    return NextResponse.json({
      warehouse,
      summary: {
        totalUnits,
        reservedUnits,
        availableUnits: totalUnits - reservedUnits,
        productVariants: totalCount,
        distinctProducts: new Set(sortedStockLevels.map((level) => level.variant.product.id)).size,
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
      stockLevels: sortedStockLevels.map((level) => ({
        id: level.id,
        quantity: Number(level.quantity),
        reserved: Number(level.reserved),
        available: Number(level.quantity) - Number(level.reserved),
        updatedAt: level.updatedAt,
        variant: level.variant,
        soldUnits: finalSoldUnitsMap.get(level.variant.product.id) || 0,
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      filters: {
        categories,
      },
    });
  } catch (error) {
    console.error("WAREHOUSE DETAILS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load warehouse details" },
      { status: 500 },
    );
  }
}
