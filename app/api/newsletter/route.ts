import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Get all newsletters
export async function GET() {
  try {
    const newsletters = await prisma.newsletter.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(newsletters);
  } catch (error) {
    console.error("GET newsletters error:", error);
    return NextResponse.json({ error: "Failed to fetch newsletters" }, { status: 500 });
  }
}

// Create newsletter
export async function POST(req: Request) {
  try {
    const { title, subject, content } = await req.json();

    if (!title || !subject || !content) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const newsletter = await prisma.newsletter.create({
      data: {
        title,
        subject,
        content,
      },
    });

    return NextResponse.json(newsletter, { status: 201 });
  } catch (error) {
    console.error("POST newsletter error:", error);
    return NextResponse.json({ error: "Failed to create newsletter" }, { status: 500 });
  }
}
