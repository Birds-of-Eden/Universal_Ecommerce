import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/* =========================
   GET WAREHOUSES
========================= */
export async function GET() {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: [{ isDefault: "desc" }, { id: "desc" }],
    });

    return NextResponse.json(warehouses);
  } catch (error) {
    console.error("GET WAREHOUSES ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch warehouses" },
      { status: 500 },
    );
  }
}

/* =========================
   CREATE WAREHOUSE
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const name = String(body.name || "").trim();
    const code = String(body.code || "")
      .trim()
      .toUpperCase();
    const isDefault = Boolean(body.isDefault);

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and Code are required" },
        { status: 400 },
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.warehouse.updateMany({
          data: { isDefault: false },
        });
      }

      return tx.warehouse.create({
        data: {
          name,
          code,
          isDefault,
          address: body.address ?? null,
        },
      });
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("POST WAREHOUSE ERROR:", error);
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Warehouse code already exists" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to create warehouse" },
      { status: 500 },
    );
  }
}

