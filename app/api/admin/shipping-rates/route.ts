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

export async function GET(request: NextRequest) {
  try {
    if (!(await ensureAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const area = searchParams.get("area");
    const isActive = searchParams.get("isActive");

    const where: any = { country: "BD" };
    if (area) where.area = area.trim();
    if (isActive !== null) where.isActive = isActive === "true";

    const rates = await db.shippingRate.findMany({
      where,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(rates);
  } catch (error) {
    console.error("GET SHIPPING RATES ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipping rates" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await ensureAdmin())) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const area = String(body.area || "").trim();
    if (!area) {
      return NextResponse.json({ error: "area is required" }, { status: 400 });
    }

    const data: any = {
      country: "BD",
      area,
      baseCost: toDecimal(body.baseCost, "baseCost"),
      weightSlabs: validateWeightSlabs(body.weightSlabs),
      freeMinOrder: toOptionalDecimal(body.freeMinOrder),
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
      priority: Number.isFinite(Number(body.priority)) ? Number(body.priority) : 1000,
    };

    const created = await db.shippingRate.create({ data });
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("POST SHIPPING RATE ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create shipping rate" },
      { status: 500 },
    );
  }
}
