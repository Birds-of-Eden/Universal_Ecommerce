// api/brands/[id]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import slugify from "slugify";

/* =========================
   UPDATE BRAND
========================= */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    const { name, logo } = await req.json();

    const existing = await prisma.brand.findFirst({
      where: { id, deleted: false },
    });

    if (!existing)
      return NextResponse.json(
        { error: "Brand not found" },
        { status: 404 }
      );

    let slug;
    if (name) {
      slug = slugify(name, { lower: true, strict: true });

      const duplicate = await prisma.brand.findFirst({
        where: {
          slug,
          NOT: { id },
        },
      });

      if (duplicate)
        return NextResponse.json(
          { error: "Brand already exists" },
          { status: 400 }
        );
    }

    const updated = await prisma.brand.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        slug: slug ?? existing.slug,
        logo: logo !== undefined ? logo : existing.logo,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Failed to update brand" },
      { status: 500 }
    );
  }
}

/* =========================
   SOFT DELETE
========================= */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);

    await prisma.brand.update({
      where: { id },
      data: { deleted: true },
    });

    return NextResponse.json({ message: "Brand deleted" });
  } catch {
    return NextResponse.json(
      { error: "Delete failed" },
      { status: 500 }
    );
  }
}