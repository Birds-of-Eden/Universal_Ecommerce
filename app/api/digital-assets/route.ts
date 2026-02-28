import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/* =========================
   GET DIGITAL ASSETS
========================= */
export async function GET() {
  try {
    const assets = await prisma.digitalAsset.findMany({
      orderBy: { id: "desc" },
      select: {
        id: true,
        title: true,
        fileUrl: true,
        mimeType: true,
        fileSize: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch digital assets" },
      { status: 500 },
    );
  }
}

