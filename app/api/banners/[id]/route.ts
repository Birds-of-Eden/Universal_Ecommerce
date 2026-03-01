// app/api/banners/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/* =========================
   GET ALL BANNERS
========================= */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const activeOnly = searchParams.get("active");

    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (activeOnly === "true") {
      where.isActive = true;
      where.OR = [{ startDate: null }, { startDate: { lte: new Date() } }];
      where.AND = [
        {
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        },
      ];
    }

    const banners = await prisma.banner.findMany({
      where,
      orderBy: { position: "asc" },
    });

    return NextResponse.json(banners);
  } catch (error) {
    console.error("GET banners error:", error);
    return NextResponse.json(
      { error: "Failed to fetch banners" },
      { status: 500 },
    );
  }
}

/* =========================
   CREATE BANNER
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const banner = await prisma.banner.create({
      data: {
        title: body.title,
        subtitle: body.subtitle || null,
        description: body.description || null,

        image: body.image,
        mobileImage: body.mobileImage || null,

        buttonText: body.buttonText || null,
        buttonLink: body.buttonLink || null,

        position: body.position ?? 0,
        isActive: body.isActive ?? true,

        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,

        type: body.type || "HERO",
      },
    });

    return NextResponse.json(banner);
  } catch (error) {
    console.error("POST banner error:", error);
    return NextResponse.json(
      { error: "Failed to create banner" },
      { status: 500 },
    );
  }
}
