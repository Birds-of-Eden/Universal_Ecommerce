import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getAccessContext } from "@/lib/rbac";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

/* =========================
   GET WAREHOUSES
========================= */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(
      session?.user as { id?: string; role?: string } | undefined,
    );
    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      !access.hasAny([
        "settings.warehouse.manage",
        "inventory.manage",
        "shipments.manage",
        "orders.read_all",
        "dashboard.read",
      ])
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const warehouses = await prisma.warehouse.findMany({
      where:
        access.isSuperAdmin ||
        access.hasGlobal("settings.warehouse.manage") ||
        access.hasGlobal("inventory.manage") ||
        access.hasGlobal("shipments.manage") ||
        access.hasGlobal("orders.read_all") ||
        access.hasGlobal("dashboard.read")
          ? undefined
          : access.warehouseIds.length > 0
            ? { id: { in: access.warehouseIds } }
            : { id: -1 },
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
    const session = await getServerSession(authOptions);
    const access = await getAccessContext(
      session?.user as { id?: string; role?: string } | undefined,
    );
    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!access.hasGlobal("settings.warehouse.manage") && !access.hasGlobal("settings.manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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

