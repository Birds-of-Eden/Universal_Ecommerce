// app/api/shipments/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/shipments/:id
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const role = (session.user as any).role as string | undefined;
    const { id: idStr } = await params;
    const id = Number(idStr);

    if (Number.isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid shipment id" },
        { status: 400 }
      );
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        order: true,
        courierRef: true,
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    // normal user হলে: কেবল নিজের order এর shipment দেখতে পারবে
    if (role !== "admin" && shipment.order.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(shipment);
  } catch (error) {
    console.error("Error fetching shipment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/shipments/:id
// Body (সব optional, যা পাঠাবে তাই update হবে):
// {
//   courier?: string,
//   trackingNumber?: string | null,
//   status?: ShipmentStatus,
//   shippedAt?: string | null,
//   expectedDate?: string | null,
//   deliveredAt?: string | null
// }
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as string | undefined;

    // shipment update -> শুধু admin
    if (!session?.user || role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = Number(idStr);
    if (Number.isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: "Invalid shipment id" },
        { status: 400 }
      );
    }

    // Check if shipment exists
    const existingShipment = await prisma.shipment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        orderId: true,
      },
    });

    if (!existingShipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const {
      courier,
      courierId,
      warehouseId,
      trackingNumber,
      status,
      shippedAt,
      expectedDate,
      deliveredAt,
    } = body;

    const data: any = {};

    if (courier !== undefined) data.courier = courier;
    if (courierId !== undefined) {
      const courierIdNum = Number(courierId);
      if (Number.isNaN(courierIdNum) || courierIdNum <= 0) {
        return NextResponse.json({ error: "Invalid courierId" }, { status: 400 });
      }
      const courierEntity = await prisma.courier.findUnique({
        where: { id: courierIdNum },
      });
      if (!courierEntity || !courierEntity.isActive) {
        return NextResponse.json(
          { error: "Courier not found or inactive" },
          { status: 400 },
        );
      }
      data.courierId = courierEntity.id;
      data.courier = courierEntity.name;
    }
    if (warehouseId !== undefined) {
      if (warehouseId === null || warehouseId === "") {
        data.warehouseId = null;
      } else {
        const warehouseIdNum = Number(warehouseId);
        if (Number.isNaN(warehouseIdNum) || warehouseIdNum <= 0) {
          return NextResponse.json({ error: "Invalid warehouseId" }, { status: 400 });
        }
        const warehouseEntity = await prisma.warehouse.findUnique({
          where: { id: warehouseIdNum },
          select: { id: true },
        });
        if (!warehouseEntity) {
          return NextResponse.json({ error: "Warehouse not found" }, { status: 400 });
        }
        data.warehouseId = warehouseEntity.id;
      }
    }
    if (trackingNumber !== undefined) data.trackingNumber = trackingNumber;

    if (status !== undefined) {
      const validShipmentStatuses = [
        "PENDING",
        "IN_TRANSIT",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "RETURNED",
        "CANCELLED",
      ] as const;

      if (!validShipmentStatuses.includes(status)) {
        return NextResponse.json(
          { error: "Invalid shipment status" },
          { status: 400 }
        );
      }

      const allowedTransitions: Record<string, string[]> = {
        PENDING: ["IN_TRANSIT", "CANCELLED"],
        IN_TRANSIT: ["OUT_FOR_DELIVERY", "RETURNED", "CANCELLED"],
        OUT_FOR_DELIVERY: ["DELIVERED", "RETURNED", "CANCELLED"],
        DELIVERED: [],
        RETURNED: [],
        CANCELLED: [],
      };

      if (
        status !== existingShipment.status &&
        !(allowedTransitions[existingShipment.status] || []).includes(status)
      ) {
        return NextResponse.json(
          {
            error: `Invalid status transition: ${existingShipment.status} -> ${status}`,
          },
          { status: 400 },
        );
      }
      data.status = status;
    }

    if (shippedAt !== undefined) {
      data.shippedAt = shippedAt ? new Date(shippedAt) : null;
    }
    if (expectedDate !== undefined) {
      data.expectedDate = expectedDate ? new Date(expectedDate) : null;
    }
    if (deliveredAt !== undefined) {
      data.deliveredAt = deliveredAt ? new Date(deliveredAt) : null;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextStatus = data.status as string | undefined;
      const prevStatus = existingShipment.status as string;

      // Update soldCount based on shipment status transition
      // - DELIVERED: add quantities (only once)
      // - RETURNED/CANCELLED: subtract quantities only if it was previously DELIVERED
      const shouldIncrement = nextStatus === "DELIVERED" && prevStatus !== "DELIVERED";
      const shouldDecrement =
        (nextStatus === "RETURNED" || nextStatus === "CANCELLED") && prevStatus === "DELIVERED";

      if (shouldIncrement || shouldDecrement) {
        const items = await tx.orderItem.findMany({
          where: { orderId: existingShipment.orderId },
          select: { productId: true, quantity: true },
        });

        const qtyByProduct = new Map<number, number>();
        for (const it of items) {
          qtyByProduct.set(it.productId, (qtyByProduct.get(it.productId) || 0) + it.quantity);
        }

        for (const [productId, qty] of qtyByProduct.entries()) {
          const product = await tx.product.findUnique({
            where: { id: productId },
            select: { soldCount: true },
          });

          const current = product?.soldCount ?? 0;
          const next = shouldIncrement ? current + qty : current - qty;

          await tx.product.update({
            where: { id: productId },
            data: {
              soldCount: Math.max(next, 0),
            },
          });
        }
      }

      return tx.shipment.update({
        where: { id },
        data,
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating shipment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/shipments/:id
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id: idStr } = await params;
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as string | undefined;

    // shipment deletion -> only admin
    if (!session?.user || role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const id = Number(idStr);
    if (Number.isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: "Invalid shipment id" },
        { status: 400 }
      );
    }

    // Check if shipment exists
    const existingShipment = await prisma.shipment.findUnique({
      where: { id },
    });

    if (!existingShipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 }
      );
    }

    await prisma.shipment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting shipment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
