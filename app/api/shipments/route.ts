import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { ShipmentStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCourierProvider } from "@/lib/couriers";

type CreateShipmentBody = {
  orderId: number;
  courierId?: number;
  courier?: string;
  warehouseId?: number | null;
  note?: string | null;
};

// GET /api/shipments
// - admin: all shipments (pagination + optional filters)
// - user: only his own order shipments
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    const role = (session.user as { role?: string }).role;

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const orderId = searchParams.get("orderId");
    const courierId = searchParams.get("courierId");

    const where: Record<string, unknown> = {};
    if (role !== "admin") {
      where.order = { userId };
    }
    if (status) where.status = status;
    if (orderId && !Number.isNaN(Number(orderId))) where.orderId = Number(orderId);
    if (courierId && !Number.isNaN(Number(courierId))) where.courierId = Number(courierId);

    const skip = Math.max(page - 1, 0) * Math.max(limit, 1);
    const take = Math.max(limit, 1);

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          courierRef: {
            select: { id: true, name: true, type: true, isActive: true },
          },
          order: {
            select: {
              id: true,
              userId: true,
              name: true,
              phone_number: true,
              status: true,
              paymentStatus: true,
            },
          },
        },
      }),
      prisma.shipment.count({ where }),
    ]);

    return NextResponse.json({
      shipments,
      pagination: {
        page,
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("Error fetching shipments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/shipments
// Creates shipment and sends create request to selected courier.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user || role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as CreateShipmentBody;
    const orderId = Number(body.orderId);
    const courierId = body.courierId ? Number(body.courierId) : null;
    const courierName = body.courier?.trim();

    if (
      !orderId ||
      Number.isNaN(orderId) ||
      ((!courierId || Number.isNaN(courierId)) && !courierName)
    ) {
      return NextResponse.json(
        { error: "orderId and (courierId or courier name) are required" },
        { status: 400 },
      );
    }

    const [order, existingShipment] = await Promise.all([
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: {
                select: { name: true },
              },
            },
          },
        },
      }),
      prisma.shipment.findUnique({ where: { orderId } }),
    ]);

    const courier = await prisma.courier.findFirst({
      where: courierId
        ? { id: courierId }
        : {
            name: {
              equals: courierName,
              mode: "insensitive",
            },
          },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (!courier || !courier.isActive) {
      return NextResponse.json({ error: "Courier not found or inactive" }, { status: 400 });
    }
    if (existingShipment) {
      return NextResponse.json(
        { error: "This order already has a shipment" },
        { status: 409 },
      );
    }

    // 1) Create local shipment first.
    const localShipment = await prisma.shipment.create({
      data: {
        orderId,
        warehouseId: body.warehouseId ?? null,
        courier: courier.name,
        courierId: courier.id,
        status: "PENDING",
      },
    });

    // 2) Hit courier API based on courier.type.
    try {
      const provider = getCourierProvider(courier);
      const remote = await provider.createShipment(courier, {
        shipmentId: localShipment.id,
        orderId: order.id,
        orderAmount: Number(order.grand_total),
        cashOnDelivery: order.paymentStatus !== "PAID",
        recipient: {
          name: order.name,
          phone: order.phone_number,
          address: order.address_details,
          area: order.area,
          district: order.district,
          country: order.country,
        },
        items: order.orderItems.map((item) => ({
          name: item.product?.name || `Item-${item.id}`,
          quantity: item.quantity,
          unitPrice: Number(item.price),
        })),
        note: body.note ?? null,
      });

      const updated = await prisma.shipment.update({
        where: { id: localShipment.id },
        data: {
          externalId: remote.externalId || null,
          trackingNumber: remote.trackingNumber || null,
          trackingUrl: remote.trackingUrl || null,
          courierStatus: remote.courierStatus || "created",
          status: (remote.status || "PENDING") as ShipmentStatus,
          lastSyncedAt: new Date(),
          shippedAt: new Date(),
        },
        include: {
          courierRef: { select: { id: true, name: true, type: true } },
        },
      });

      return NextResponse.json(updated, { status: 201 });
    } catch (providerError) {
      console.error("Courier create shipment failed:", providerError);
      const failed = await prisma.shipment.update({
        where: { id: localShipment.id },
        data: {
          courierStatus: "CREATE_FAILED",
          lastSyncedAt: new Date(),
        },
      });

      return NextResponse.json(
        {
          error: "Courier API create failed",
          shipment: failed,
          details: providerError instanceof Error ? providerError.message : "Unknown error",
        },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("Error creating shipment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
