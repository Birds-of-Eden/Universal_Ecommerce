import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET single shipment
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const shipment = await prisma.shipment.findUnique({
      where: { id: Number(params.id) },
      include: {
        order: true,
        warehouse: true,
        items: {
          include: {
            orderItem: {
              include: {
                product: true,
                variant: true,
              },
            },
          },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { error: "Shipment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(shipment);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch shipment" },
      { status: 500 },
    );
  }
}

// UPDATE shipment
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json();

    const shipment = await prisma.shipment.update({
      where: { id: Number(params.id) },
      data: {
        courier: body.courier,
        trackingNumber: body.trackingNumber,
        status: body.status,
        shippedAt: body.shippedAt ? new Date(body.shippedAt) : undefined,
        expectedDate: body.expectedDate
          ? new Date(body.expectedDate)
          : undefined,
        deliveredAt: body.deliveredAt ? new Date(body.deliveredAt) : undefined,
      },
    });

    return NextResponse.json(shipment);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update shipment" },
      { status: 500 },
    );
  }
}

// DELETE shipment
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await prisma.shipment.delete({
      where: { id: Number(params.id) },
    });

    return NextResponse.json({ message: "Shipment deleted" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete shipment" },
      { status: 500 },
    );
  }
}
