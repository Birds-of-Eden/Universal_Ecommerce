import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/* =========================
   UPDATE VAT RATE
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

    const existing = await prisma.vatRate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "VAT rate not found" }, { status: 404 });
    }

    const countryCode =
      body.countryCode !== undefined
        ? String(body.countryCode).trim().toUpperCase()
        : existing.countryCode;

    if (countryCode.length !== 2) {
      return NextResponse.json(
        { error: "Country code must be 2 letters (e.g. BD)" },
        { status: 400 },
      );
    }

    const regionCode =
      body.regionCode !== undefined
        ? body.regionCode
          ? String(body.regionCode).trim().toUpperCase()
          : null
        : existing.regionCode;

    const rate =
      body.rate !== undefined ? Number(body.rate) : Number(existing.rate);
    if (!Number.isFinite(rate) || rate < 0) {
      return NextResponse.json(
        { error: "Rate must be a number (decimal, e.g. 0.075)" },
        { status: 400 },
      );
    }

    const startDate =
      body.startDate !== undefined
        ? body.startDate
          ? new Date(String(body.startDate))
          : null
        : existing.startDate;

    const endDate =
      body.endDate !== undefined
        ? body.endDate
          ? new Date(String(body.endDate))
          : null
        : existing.endDate;

    const inclusive =
      body.inclusive !== undefined ? Boolean(body.inclusive) : existing.inclusive;

    const updated = await prisma.vatRate.update({
      where: { id },
      data: {
        countryCode,
        regionCode,
        rate,
        inclusive,
        startDate,
        endDate,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT VAT RATE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to update vat rate" },
      { status: 500 },
    );
  }
}

/* =========================
   DELETE VAT RATE
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

    await prisma.vatRate.delete({ where: { id } });
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("DELETE VAT RATE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to delete vat rate" },
      { status: 500 },
    );
  }
}

