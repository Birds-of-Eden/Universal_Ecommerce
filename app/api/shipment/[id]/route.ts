import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET single shipment
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const shipment = await prisma.shipment.findUnique({
      where: { id: Number(id) },
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
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const shipment = await prisma.shipment.update({
      where: { id: Number(id) },
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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await prisma.shipment.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ message: "Shipment deleted" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete shipment" },
      { status: 500 },
    );
  }
}
