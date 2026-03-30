import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    
    if (!idParam) {
      return NextResponse.json(
        { success: false, message: "Delivery man ID is required" },
        { status: 400 }
      );
    }

    const deliveryMan = await prisma.deliveryManProfile.findUnique({
      where: { id: idParam },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        references: {
          orderBy: { createdAt: "desc" },
        },
        documents: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!deliveryMan) {
      console.error("Delivery man not found with ID:", idParam);
      return NextResponse.json(
        { success: false, message: "Delivery man not found" },
        { status: 404 }
      );
    }

    console.log("Delivery man found:", {
      id: deliveryMan.id,
      name: deliveryMan.fullName,
      documentsCount: deliveryMan.documents?.length || 0
    });

    return NextResponse.json({
      success: true,
      data: deliveryMan,
    });
  } catch (error) {
    console.error("DELIVERY_MAN_FETCH_ERROR:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
      idParam: idParam
    });

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
        error: process.env.NODE_ENV === 'development' ? {
          details: error instanceof Error ? error.message : "Unknown error",
          idParam: idParam
        } : undefined
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    
    if (!idParam) {
      return NextResponse.json(
        { success: false, message: "Delivery man ID is required" },
        { status: 400 }
      );
    }

    // Check if delivery man exists first
    const existingDeliveryMan = await prisma.deliveryManProfile.findUnique({
      where: { id: idParam },
    });

    if (!existingDeliveryMan) {
      return NextResponse.json(
        { success: false, message: "Delivery man not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    
    // Convert string values to numbers where needed
    const updateData: any = {};
    
    if (body.warehouseId !== undefined) {
      updateData.warehouseId = parseInt(body.warehouseId);
    }
    
    // Add other fields as-is
    Object.keys(body).forEach(key => {
      if (key !== 'warehouseId') {
        updateData[key] = body[key];
      }
    });

    const deliveryMan = await prisma.deliveryManProfile.update({
      where: { id: idParam },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        references: {
          orderBy: { createdAt: "desc" },
        },
        documents: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Delivery man updated successfully",
      data: deliveryMan,
    });
  } catch (error) {
    console.error("DELIVERY_MAN_UPDATE_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
