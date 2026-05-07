import { daysAgo, daysFromNow, money } from "./helpers";
import type { OperationsSeedContext, TxClient } from "./types";

const SHIPMENTS = [
  {
    orderKey: "pendingCod",
    warehouseKey: "dhaka",
    courierKey: "steadfast",
    status: "PENDING",
    trackingNumber: "OPS-TRK-1001",
    shippedAt: null,
    expectedDate: daysFromNow(3),
    deliveredAt: null,
    priority: 1,
  },
  {
    orderKey: "confirmedPaid",
    warehouseKey: "dhaka",
    courierKey: "pathao",
    status: "ASSIGNED",
    trackingNumber: "OPS-TRK-1002",
    shippedAt: null,
    expectedDate: daysFromNow(2),
    deliveredAt: null,
    priority: 2,
  },
  {
    orderKey: "processingCard",
    warehouseKey: "chattogram",
    courierKey: "redx",
    status: "IN_TRANSIT",
    trackingNumber: "OPS-TRK-1003",
    shippedAt: daysAgo(2),
    expectedDate: daysFromNow(1),
    deliveredAt: null,
    priority: 2,
  },
  {
    orderKey: "shippedPaid",
    warehouseKey: "sylhet",
    courierKey: "custom",
    status: "OUT_FOR_DELIVERY",
    trackingNumber: "OPS-TRK-1004",
    shippedAt: daysAgo(3),
    expectedDate: daysFromNow(0),
    deliveredAt: null,
    priority: 3,
  },
  {
    orderKey: "deliveredPaid",
    warehouseKey: "khulna",
    courierKey: "express",
    status: "DELIVERED",
    trackingNumber: "OPS-TRK-1005",
    shippedAt: daysAgo(8),
    expectedDate: daysAgo(5),
    deliveredAt: daysAgo(4),
    priority: 0,
  },
] as const;

const STATUS_FLOW: Record<string, string[]> = {
  PENDING: ["PENDING"],
  ASSIGNED: ["PENDING", "ASSIGNED"],
  IN_TRANSIT: ["PENDING", "ASSIGNED", "IN_TRANSIT"],
  OUT_FOR_DELIVERY: ["PENDING", "ASSIGNED", "IN_TRANSIT", "OUT_FOR_DELIVERY"],
  DELIVERED: ["PENDING", "ASSIGNED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"],
};

export async function seedOperationsShipments(
  prisma: TxClient,
  ctx: OperationsSeedContext,
): Promise<OperationsSeedContext> {
  for (const item of SHIPMENTS) {
    const existing = await prisma.shipment.findUnique({
      where: { orderId: ctx.orders[item.orderKey] },
      select: { id: true },
    });

    const shipmentData = {
      orderId: ctx.orders[item.orderKey],
      warehouseId: ctx.warehouses[item.warehouseKey],
      courier: item.courierKey,
      courierId: ctx.couriers[item.courierKey],
      trackingNumber: item.trackingNumber,
      externalId: `OPS-EXT-${item.orderKey}`,
      trackingUrl: `https://tracking.example.com/${item.trackingNumber}`,
      status: item.status as any,
      courierStatus: item.status,
      lastSyncedAt: new Date(),
      shippedAt: item.shippedAt,
      expectedDate: item.expectedDate,
      deliveredAt: item.deliveredAt,
      deliveryConfirmationPin: item.status === "DELIVERED" ? "123456" : null,
      deliveryConfirmationRequestedAt: item.status === "DELIVERED" ? daysAgo(4) : null,
      deliveryConfirmationToken: `ops-token-${item.orderKey}`,
      estimatedCost: money(100 + item.priority * 20),
      actualCost: item.status === "DELIVERED" ? money(130) : null,
      packagingCost: money(20),
      handlingCost: money(15),
      thirdPartyCost: money(60 + item.priority * 10),
      priority: item.priority,
      assignedToUserId: ctx.users.deliveryAgent,
      assignedAt: daysAgo(2),
      pickedAt: item.shippedAt,
      outForDeliveryAt: item.status === "OUT_FOR_DELIVERY" || item.status === "DELIVERED" ? daysAgo(1) : null,
      dispatchNote: "Seeded operations shipment",
    };

    const shipment = existing
      ? await prisma.shipment.update({ where: { id: existing.id }, data: shipmentData, select: { id: true } })
      : await prisma.shipment.create({ data: shipmentData, select: { id: true } });

    ctx.shipments[item.orderKey] = shipment.id;

    const orderItems = await prisma.orderItem.findMany({
      where: { orderId: ctx.orders[item.orderKey] },
      select: { id: true, quantity: true },
    });

    await prisma.shipmentItem.deleteMany({ where: { shipmentId: shipment.id } });
    for (const orderItem of orderItems) {
      await prisma.shipmentItem.create({
        data: {
          shipmentId: shipment.id,
          orderItemId: orderItem.id,
          quantity: orderItem.quantity,
        },
      });
    }

    await prisma.shipmentStatusLog.deleteMany({ where: { shipmentId: shipment.id } });
    const flow = STATUS_FLOW[item.status] ?? [item.status];
    for (let index = 0; index < flow.length; index += 1) {
      await prisma.shipmentStatusLog.create({
        data: {
          shipmentId: shipment.id,
          fromStatus: index === 0 ? null : (flow[index - 1] as any),
          toStatus: flow[index] as any,
          source: "SEED",
          note: `Operations seed status: ${flow[index]}`,
          createdAt: daysAgo(flow.length - index),
        },
      });
    }

    await prisma.shipmentCostLog.deleteMany({ where: { shipmentId: shipment.id } });
    for (const cost of [
      { costType: "PACKAGING", amount: 20, note: "Packing material" },
      { costType: "HANDLING", amount: 15, note: "Warehouse handling" },
      { costType: "COURIER", amount: 80 + item.priority * 10, note: "Courier estimate" },
    ]) {
      await prisma.shipmentCostLog.create({
        data: {
          shipmentId: shipment.id,
          costType: cost.costType,
          amount: money(cost.amount),
          note: cost.note,
          createdById: ctx.adminUserId ?? null,
        },
      });
    }

    await prisma.shipmentAssignment.deleteMany({ where: { shipmentId: shipment.id } });
    await prisma.shipmentAssignment.create({
      data: {
        shipmentId: shipment.id,
        assignedToId: ctx.users.deliveryAgent,
        assignedById: ctx.adminUserId ?? ctx.users.orderManager,
        warehouseId: ctx.warehouses[item.warehouseKey],
        role: "DELIVERY_AGENT",
        note: "Seeded shipment assignment",
        assignedAt: daysAgo(2),
        completedAt: item.status === "DELIVERED" ? daysAgo(4) : null,
      },
    });
  }

  return ctx;
}
