import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const db = prisma as any;

function toDecimal(value: unknown, field: string): Prisma.Decimal {
  if (value === null || value === undefined || value === "") {
    throw new Error(`${field} is required`);
  }
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`${field} must be a non-negative number`);
  }
  return new Prisma.Decimal(num);
}

function toOptionalDecimal(value: unknown): Prisma.Decimal | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error("Optional decimal fields must be non-negative numbers");
  }
  return new Prisma.Decimal(num);
}

function validateWeightSlabs(input: unknown) {
  if (input === null || input === undefined || input === "") return null;
  if (!Array.isArray(input)) {
    throw new Error("weightSlabs must be an array");
  }

  for (const slab of input) {
    if (typeof slab !== "object" || slab === null) {
      throw new Error("Each weight slab must be an object");
    }
    const minWeight = Number((slab as any).minWeight);
    const maxWeightRaw = (slab as any).maxWeight;
    const maxWeight =
      maxWeightRaw === null || maxWeightRaw === undefined || maxWeightRaw === ""
        ? null
        : Number(maxWeightRaw);
    const cost = Number((slab as any).cost);

    if (!Number.isFinite(minWeight) || minWeight < 0) {
      throw new Error("Weight slab minWeight must be a non-negative number");
    }
    if (
      maxWeight !== null &&
      (!Number.isFinite(maxWeight) || maxWeight <= minWeight)
    ) {
      throw new Error("Weight slab maxWeight must be greater than minWeight");
    }
    if (!Number.isFinite(cost) || cost < 0) {
      throw new Error("Weight slab cost must be a non-negative number");
    }
  }

  return input;
}

async function ensureAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  return Boolean(session?.user && role === "admin");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await ensureAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await request.json();
    const data: any = {};

    data.country = "BD";
    if (body.area !== undefined) {
      const area = String(body.area || "").trim();
      if (!area) {
        return NextResponse.json({ error: "area cannot be empty" }, { status: 400 });
      }
      data.area = area;
    }

    if (body.baseCost !== undefined) data.baseCost = toDecimal(body.baseCost, "baseCost");
    if (body.weightSlabs !== undefined) data.weightSlabs = validateWeightSlabs(body.weightSlabs);
    if (body.freeMinOrder !== undefined) data.freeMinOrder = toOptionalDecimal(body.freeMinOrder);
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    if (body.priority !== undefined) {
      const num = Number(body.priority);
      if (!Number.isFinite(num)) {
        return NextResponse.json({ error: "priority must be a number" }, { status: 400 });
      }
      data.priority = num;
    }

    const updated = await db.shippingRate.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PATCH SHIPPING RATE ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update shipping rate" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await ensureAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: idStr } = await params;
    const id = Number(idStr);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await db.shippingRate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE SHIPPING RATE ERROR:", error);
    return NextResponse.json({ error: "Failed to delete shipping rate" }, { status: 500 });
  }
}
