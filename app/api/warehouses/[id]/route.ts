import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/* =========================
   UPDATE WAREHOUSE
========================= */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();
    const existing = await prisma.warehouse.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 },
      );
    }

    const name =
      body.name !== undefined ? String(body.name || "").trim() : existing.name;
    const code =
      body.code !== undefined
        ? String(body.code || "")
            .trim()
            .toUpperCase()
        : existing.code;
    const isDefault =
      body.isDefault !== undefined
        ? Boolean(body.isDefault)
        : existing.isDefault;
    const address =
      body.address !== undefined ? body.address ?? null : existing.address;

    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and Code are required" },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.warehouse.updateMany({
          where: { id: { not: id } },
          data: { isDefault: false },
        });
      }

      return tx.warehouse.update({
        where: { id },
        data: { name, code, isDefault, address },
      });
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT WAREHOUSE ERROR:", error);
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Warehouse code already exists" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to update warehouse" },
      { status: 500 },
    );
  }
}

/* =========================
   DELETE WAREHOUSE
========================= */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: idParam } = await params;
    const id = Number(idParam);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.stockLevel.deleteMany({ where: { warehouseId: id } });
      await tx.inventoryLog.updateMany({
        where: { warehouseId: id },
        data: { warehouseId: null },
      });
      await tx.warehouse.delete({ where: { id } });
    });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("DELETE WAREHOUSE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to delete warehouse" },
      { status: 500 },
    );
  }
}

