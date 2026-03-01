import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const couriers = await prisma.courier.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(couriers);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const courier = await prisma.courier.create({
      data: {
        name: body.name,
        type: body.type,
        baseUrl: body.baseUrl,
        apiKey: body.apiKey,
        secretKey: body.secretKey,
        clientId: body.clientId,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(courier, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create courier" },
      { status: 500 }
    );
  }
}