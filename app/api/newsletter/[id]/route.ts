import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/newsletter/[id] - Get specific newsletter
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const newsletter = await prisma.newsletter.findUnique({
      where: { id },
    });

    if (!newsletter) {
      return NextResponse.json(
        { error: "Newsletter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(newsletter);
  } catch (error) {
    console.error("Error fetching newsletter:", error);
    return NextResponse.json(
      { error: "Failed to fetch newsletter" },
      { status: 500 }
    );
  }
}

// PUT /api/newsletter/[id] - Update newsletter
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title, subject, content } = await request.json();

    if (!title || !subject || !content) {
      return NextResponse.json(
        { error: "Title, subject, and content are required" },
        { status: 400 }
      );
    }

    // Check if newsletter exists and is not sent
    const existingNewsletter = await prisma.newsletter.findUnique({
      where: { id },
    });

    if (!existingNewsletter) {
      return NextResponse.json(
        { error: "Newsletter not found" },
        { status: 404 }
      );
    }

    if (existingNewsletter.status === "sent") {
      return NextResponse.json(
        { error: "Cannot update a sent newsletter" },
        { status: 400 }
      );
    }

    const updatedNewsletter = await prisma.newsletter.update({
      where: { id },
      data: {
        title,
        subject,
        content,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedNewsletter);
  } catch (error) {
    console.error("Error updating newsletter:", error);
    return NextResponse.json(
      { error: "Failed to update newsletter" },
      { status: 500 }
    );
  }
}

// DELETE /api/newsletter/[id] - Delete newsletter
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Check if newsletter exists
    const existingNewsletter = await prisma.newsletter.findUnique({
      where: { id },
    });

    if (!existingNewsletter) {
      return NextResponse.json(
        { error: "Newsletter not found" },
        { status: 404 }
      );
    }

    if (existingNewsletter.status === "sent") {
      return NextResponse.json(
        { error: "Cannot delete a sent newsletter" },
        { status: 400 }
      );
    }

    await prisma.newsletter.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Newsletter deleted successfully" });
  } catch (error) {
    console.error("Error deleting newsletter:", error);
    return NextResponse.json(
      { error: "Failed to delete newsletter" },
      { status: 500 }
    );
  }
}
