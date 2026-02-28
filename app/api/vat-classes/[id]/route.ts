import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/* =========================
   UPDATE VAT CLASS
========================= */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    const body = await req.json();

    const existing = await prisma.vatClass.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "VAT class not found" },
        { status: 404 }
      );
    }

    // If code changed, check duplicate
    if (body.code && body.code !== existing.code) {
      const duplicate = await prisma.vatClass.findUnique({
        where: { code: body.code },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "VAT code already exists" },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.vatClass.update({
      where: { id },
      data: {
        name: body.name,
        code: body.code,
        description: body.description,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT VAT CLASS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update vat class" },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE VAT CLASS
========================= */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);

    await prisma.vatRate.deleteMany({
      where: { VatClassId: id },
    });

    await prisma.vatClass.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("DELETE VAT CLASS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to delete vat class" },
      { status: 500 }
    );
  }
}
