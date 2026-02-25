// app/api/shipments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ShipmentStatus =
  | "PENDING"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "RETURNED"
  | "CANCELLED";

// GET /api/shipments
// - admin: all shipments (pagination + optional status/orderId filter)
// - normal user: only shipments of his/her orders
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const role = (session.user as any).role as string | undefined;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const statusParam = searchParams.get("status"); // e.g. "IN_TRANSIT"
    const orderIdParam = searchParams.get("orderId"); // optional filter by orderId

    const skip = (page - 1) * limit;

    const where: any = {};

    // normal user -> শুধু নিজের order গুলোর shipment দেখতে পারবে
    if (role !== "admin") {
      where.order = { userId };
    }

    // optional filter: status
    if (statusParam) {
      const validShipmentStatuses: ShipmentStatus[] = [
        "PENDING",
        "IN_TRANSIT",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "RETURNED",
        "CANCELLED",
      ];

      if (!validShipmentStatuses.includes(statusParam as ShipmentStatus)) {
        return NextResponse.json(
          { error: "Invalid shipment status filter" },
          { status: 400 }
        );
      }
      where.status = statusParam as ShipmentStatus;
    }

    // optional filter: orderId
    if (orderIdParam) {
      const orderIdNum = Number(orderIdParam);
      if (!Number.isNaN(orderIdNum)) {
        where.orderId = orderIdNum;
      }
    }

    const [shipments, total] = await Promise.all([
      prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          order: {
            select: {
              id: true,
              userId: true,
              name: true,
              phone_number: true,
              email: true,
              status: true,
              paymentStatus: true,
              createdAt: true,
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
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching shipments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/shipments
// Body:
// {
//   orderId: number,
//   courier: string,
//   trackingNumber?: string,
//   status?: ShipmentStatus, // PENDING, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, RETURNED, CANCELLED
//   shippedAt?: string (ISO),
//   expectedDate?: string (ISO),
//   deliveredAt?: string (ISO)
// }
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role as string | undefined;

    // শুধুমাত্র admin নতুন shipment create করতে পারবে
    if (!session?.user || role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      orderId,
      courier,
      trackingNumber,
      status,
      shippedAt,
      expectedDate,
      deliveredAt,
    } = body;

    if (!orderId || !courier) {
      return NextResponse.json(
        { error: "orderId এবং courier আবশ্যক" },
        { status: 400 }
      );
    }

    // order টি আছে কিনা check
    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
      select: {
        id: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // এক order এর জন্য একটিই shipment (orderId unique)
    const existingShipment = await prisma.shipment.findUnique({
      where: { orderId: Number(orderId) },
    });

    if (existingShipment) {
      return NextResponse.json(
        {
          error:
            "This order already has a shipment. Please update the existing shipment.",
        },
        { status: 400 }
      );
    }

    // status validate
    let shipmentStatus: ShipmentStatus = "PENDING";
    if (status) {
      const validShipmentStatuses: ShipmentStatus[] = [
        "PENDING",
        "IN_TRANSIT",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "RETURNED",
        "CANCELLED",
      ];

      if (!validShipmentStatuses.includes(status as ShipmentStatus)) {
        return NextResponse.json(
          { error: "Invalid shipment status" },
          { status: 400 }
        );
      }
      shipmentStatus = status as ShipmentStatus;
    }

    const shipment = await prisma.shipment.create({
      data: {
        orderId: Number(orderId),
        courier,
        trackingNumber: trackingNumber ?? null,
        status: shipmentStatus,
        shippedAt: shippedAt ? new Date(shippedAt) : null,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        deliveredAt: deliveredAt ? new Date(deliveredAt) : null,
      },
    });

    return NextResponse.json(shipment, { status: 201 });
  } catch (error) {
    console.error("Error creating shipment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
