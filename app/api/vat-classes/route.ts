import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/* =========================
   GET VAT CLASSES
========================= */
export async function GET() {
  try {
    const vatClasses = await prisma.vatClass.findMany({
      orderBy: { id: "desc" },
      include: {
        rates: {
          orderBy: { id: "desc" },
        },
      },
    });

    return NextResponse.json(vatClasses);
  } catch (error) {
    console.error("GET VAT CLASS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to fetch vat classes" },
      { status: 500 }
    );
  }
}

/* =========================
   CREATE VAT CLASS
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.name || !body.code) {
      return NextResponse.json(
        { error: "Name and Code are required" },
        { status: 400 }
      );
    }

    const code = String(body.code).trim();

    // Check duplicate code
    const exists = await prisma.vatClass.findUnique({
      where: { code },
    });

    if (exists) {
      return NextResponse.json(
        { error: "VAT code already exists" },
        { status: 400 }
      );
    }

    const vatClass = await prisma.vatClass.create({
      data: {
        name: String(body.name).trim(),
        code,
        description: body.description || null,
      },
    });

    return NextResponse.json(vatClass);
  } catch (error) {
    console.error("POST VAT CLASS ERROR:", error);
    return NextResponse.json(
      { error: "Failed to create vat class" },
      { status: 500 }
    );
  }
}
