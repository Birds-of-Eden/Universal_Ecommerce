import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/* =========================
   GET VAT RATES
   Optional query: ?VatClassId=1
========================= */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const vatClassIdParam = url.searchParams.get("VatClassId");
    const VatClassId = vatClassIdParam ? Number(vatClassIdParam) : null;

    const rates = await prisma.vatRate.findMany({
      where: VatClassId ? { VatClassId } : undefined,
      orderBy: { id: "desc" },
    });

    return NextResponse.json(rates);
  } catch (error) {
    console.error("GET VAT RATES ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch vat rates" },
      { status: 500 },
    );
  }
}

/* =========================
   CREATE VAT RATE
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const VatClassId = Number(body.VatClassId);
    if (!VatClassId || Number.isNaN(VatClassId)) {
      return NextResponse.json(
        { error: "VatClassId is required" },
        { status: 400 },
      );
    }

    const countryCode = String(body.countryCode || "")
      .trim()
      .toUpperCase();
    if (countryCode.length !== 2) {
      return NextResponse.json(
        { error: "Country code must be 2 letters (e.g. BD)" },
        { status: 400 },
      );
    }

    const regionCode =
      body.regionCode !== undefined && body.regionCode !== null && body.regionCode !== ""
        ? String(body.regionCode).trim().toUpperCase()
        : null;

    const rate = Number(body.rate);
    if (!Number.isFinite(rate) || rate < 0) {
      return NextResponse.json(
        { error: "Rate must be a number (decimal, e.g. 0.075)" },
        { status: 400 },
      );
    }

    const startDate = body.startDate ? new Date(String(body.startDate)) : null;
    const endDate = body.endDate ? new Date(String(body.endDate)) : null;

    const created = await prisma.vatRate.create({
      data: {
        VatClassId,
        countryCode,
        regionCode,
        rate,
        inclusive: Boolean(body.inclusive),
        startDate,
        endDate,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST VAT RATE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to create vat rate" },
      { status: 500 },
    );
  }
}

