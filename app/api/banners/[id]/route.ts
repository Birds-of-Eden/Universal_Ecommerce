// app/api/banners/[id]/route.ts

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/* =========================
   GET SINGLE BANNER
========================= */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    const banner = await prisma.banner.findUnique({
      where: { id },
    });

    if (!banner) {
      return NextResponse.json(
        { error: "Banner not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(banner);
  } catch (error) {
    console.error("GET banner error:", error);
    return NextResponse.json(
      { error: "Failed to fetch banner" },
      { status: 500 },
    );
  }
}

/* =========================
   UPDATE BANNER
========================= */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await req.json();

    const banner = await prisma.banner.update({
      where: { id },
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
    console.error("PUT banner error:", error);
    return NextResponse.json(
      { error: "Failed to update banner" },
      { status: 500 },
    );
  }
}

/* =========================
   DELETE BANNER
========================= */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    const banner = await prisma.banner.delete({
      where: { id },
    });

    return NextResponse.json(banner);
  } catch (error) {
    console.error("DELETE banner error:", error);
    return NextResponse.json(
      { error: "Failed to delete banner" },
      { status: 500 },
    );
  }
}
