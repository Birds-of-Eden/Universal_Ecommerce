import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/couriers
// Public for read-only usage (admin form + tracking metadata).
export async function GET() {
  try {
    const couriers = await prisma.courier.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        baseUrl: true,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(couriers);
  } catch (error) {
    console.error("Error fetching couriers:", error);
    return NextResponse.json({ error: "Failed to fetch couriers" }, { status: 500 });
  }
}

// POST /api/couriers
// Optional admin endpoint to register courier credentials from admin panel.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user || role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json()) as {
      name: string;
      type: "PATHAO" | "REDX" | "CUSTOM";
      baseUrl: string;
      apiKey?: string;
      secretKey?: string;
      clientId?: string;
      isActive?: boolean;
    };

    if (!body.name || !body.type || !body.baseUrl) {
      return NextResponse.json(
        { error: "name, type, baseUrl are required" },
        { status: 400 },
      );
    }

    const courier = await prisma.courier.create({
      data: {
        name: body.name.trim(),
        type: body.type,
        baseUrl: body.baseUrl.trim(),
        apiKey: body.apiKey?.trim() || null,
        secretKey: body.secretKey?.trim() || null,
        clientId: body.clientId?.trim() || null,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json(courier, { status: 201 });
  } catch (error) {
    console.error("Error creating courier:", error);
    return NextResponse.json({ error: "Failed to create courier" }, { status: 500 });
  }
}
