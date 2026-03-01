import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await req.json();
  const { id } = await params;

  const courier = await prisma.courier.update({
    where: { id: Number(id) },
    data: body,
  });

  return NextResponse.json(courier);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.courier.delete({
    where: { id: Number(id) },
  });

  return NextResponse.json({ success: true });
}