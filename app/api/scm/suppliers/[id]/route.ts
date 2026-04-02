import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";

function toCleanText(value: unknown, max = 255) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeSupplierCode(raw: unknown, fallbackName: string) {
  const source = toCleanText(raw, 40) || fallbackName;
  return source
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
}

function toSupplierSnapshot(supplier: {
  code: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  leadTimeDays: number | null;
  paymentTermsDays: number | null;
  currency: string;
  taxNumber: string | null;
  notes: string | null;
  isActive: boolean;
}) {
  return {
    code: supplier.code,
    name: supplier.name,
    contactName: supplier.contactName,
    email: supplier.email,
    phone: supplier.phone,
    address: supplier.address,
    city: supplier.city,
    country: supplier.country,
    leadTimeDays: supplier.leadTimeDays,
    paymentTermsDays: supplier.paymentTermsDays,
    currency: supplier.currency,
    taxNumber: supplier.taxNumber,
    notes: supplier.notes,
    isActive: supplier.isActive,
  };
}

function hasSupplierReadAccess(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return access.hasGlobal("suppliers.read") || access.hasGlobal("suppliers.manage");
}

function hasSupplierManageAccess(access: Awaited<ReturnType<typeof getAccessContext>>) {
  return access.hasGlobal("suppliers.manage");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supplierId = Number(id);
    if (!Number.isInteger(supplierId) || supplierId <= 0) {
      return NextResponse.json({ error: "Invalid supplier id." }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const access = await getAccessContext(
      session?.user as { id?: string; role?: string } | undefined,
    );
    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasSupplierReadAccess(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found." }, { status: 404 });
    }

    return NextResponse.json(supplier);
  } catch (error) {
    console.error("SCM SUPPLIER GET ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load supplier." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supplierId = Number(id);
    if (!Number.isInteger(supplierId) || supplierId <= 0) {
      return NextResponse.json({ error: "Invalid supplier id." }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const access = await getAccessContext(
      session?.user as { id?: string; role?: string } | undefined,
    );
    if (!access.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!hasSupplierManageAccess(access)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Supplier not found." }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const name = toCleanText(body.name, 120) || existing.name;
    const code = normalizeSupplierCode(body.code, name) || existing.code;

    const leadTimeDays =
      body.leadTimeDays === null || body.leadTimeDays === undefined || body.leadTimeDays === ""
        ? null
        : Number(body.leadTimeDays);
    const paymentTermsDays =
      body.paymentTermsDays === null ||
      body.paymentTermsDays === undefined ||
      body.paymentTermsDays === ""
        ? null
        : Number(body.paymentTermsDays);

    if (
      (leadTimeDays !== null && (!Number.isInteger(leadTimeDays) || leadTimeDays < 0)) ||
      (paymentTermsDays !== null &&
        (!Number.isInteger(paymentTermsDays) || paymentTermsDays < 0))
    ) {
      return NextResponse.json(
        { error: "Lead time and payment terms must be non-negative integers." },
        { status: 400 },
      );
    }

    const updated = await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        code,
        name,
        contactName: toCleanText(body.contactName, 120) || null,
        email: toCleanText(body.email, 120) || null,
        phone: toCleanText(body.phone, 40) || null,
        address: toCleanText(body.address, 255) || null,
        city: toCleanText(body.city, 80) || null,
        country: toCleanText(body.country, 8) || "BD",
        leadTimeDays,
        paymentTermsDays,
        currency: toCleanText(body.currency, 3).toUpperCase() || "BDT",
        taxNumber: toCleanText(body.taxNumber, 60) || null,
        notes: toCleanText(body.notes, 500) || null,
        isActive: body.isActive === undefined ? existing.isActive : Boolean(body.isActive),
      },
    });

    await logActivity({
      action: "update",
      entity: "supplier",
      entityId: updated.id,
      access,
      request,
      metadata: {
        message: `Updated supplier ${updated.name} (${updated.code})`,
      },
      before: toSupplierSnapshot(existing),
      after: toSupplierSnapshot(updated),
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("SCM SUPPLIER PATCH ERROR:", error);
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Supplier code already exists." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to update supplier." },
      { status: 500 },
    );
  }
}
