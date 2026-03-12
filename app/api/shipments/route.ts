import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import type { ShipmentStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCourierProvider } from "@/lib/couriers";
import { getAccessContext } from "@/lib/rbac";
import {
  buildDeliveryConfirmationUrl,
  ensureShipmentDeliveryConfirmation,
} from "@/lib/delivery-proof";

type CreateShipmentBody = {
  orderId: number;
  courierId?: number;
  courier?: string;
  warehouseId?: number | null;
  note?: string | null;
};

function buildShipmentInclude() {
  return {
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
    deliveryProof: {
      select: {
        id: true,
        tickReceived: true,
        tickCorrectItems: true,
        tickGoodCondition: true,
        photoUrl: true,
        note: true,
        confirmedAt: true,
        createdAt: true,
        userId: true,
      },
    },
  } as const;
}

function withDeliveryConfirmationMeta<T extends {
  deliveryConfirmationToken?: string | null;
  deliveryConfirmationPin?: string | null;
}>(shipment: T, canReadAll: boolean) {
  const confirmationUrl = shipment.deliveryConfirmationToken
    ? buildDeliveryConfirmationUrl(shipment.deliveryConfirmationToken)
    : null;

  return {
    ...shipment,
    deliveryConfirmationUrl: confirmationUrl,
    deliveryConfirmationPin: canReadAll ? shipment.deliveryConfirmationPin ?? null : undefined,
  };
}

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
    const access = await getAccessContext(
      session.user as { id?: string; role?: string } | undefined,
    );
    const canReadAll =
      access.has("shipments.manage") || access.has("orders.read_all");
    const canReadOwn = canReadAll || access.has("orders.read_own");
    if (!canReadOwn) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!canReadAll && !access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "10");
    const status = searchParams.get("status");
    const orderId = searchParams.get("orderId");
    const courierId = searchParams.get("courierId");

    const where: Record<string, unknown> = {};
    if (!canReadAll) {
      where.order = { userId: access.userId ?? userId };
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
        include: buildShipmentInclude(),
      }),
      prisma.shipment.count({ where }),
    ]);

    return NextResponse.json({
      shipments: shipments.map((shipment) =>
        withDeliveryConfirmationMeta(shipment, canReadAll),
      ),
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
    const access = await getAccessContext(
      session?.user as { id?: string; role?: string } | undefined,
    );
    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!access.has("shipments.manage")) {
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

    if (courier.type === "CUSTOM") {
      let customShipment = await prisma.shipment.update({
        where: { id: localShipment.id },
        data: {
          courierStatus: "LOCAL_CREATED",
          lastSyncedAt: new Date(),
        },
        include: {
          courierRef: { select: { id: true, name: true, type: true } },
        },
      });

      customShipment =
        (await prisma.shipment.findUnique({
          where: { id: customShipment.id },
          include: buildShipmentInclude(),
        })) || customShipment;

      return NextResponse.json(
        withDeliveryConfirmationMeta(customShipment as any, true),
        { status: 201 },
      );
    }

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

      const updated = await prisma.$transaction(async (tx) => {
        const nextShipment = await tx.shipment.update({
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
        });

        await ensureShipmentDeliveryConfirmation(tx, nextShipment.id);

        return tx.shipment.findUnique({
          where: { id: nextShipment.id },
          include: buildShipmentInclude(),
        });
      });

      return NextResponse.json(
        withDeliveryConfirmationMeta(updated as any, true),
        { status: 201 },
      );
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
