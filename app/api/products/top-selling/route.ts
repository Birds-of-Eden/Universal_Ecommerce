import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get top 2 selling books based on soldCount
    const topSellingBooks = await prisma.product.findMany({
      where: {
        deleted: false,
        available: true,
        soldCount: {
          gt: 0 // Only include books that have been sold at least once
        }
      },
      orderBy: {
        soldCount: 'desc'
      },
      take: 2, // Get top 2 selling books
      include: {
        writer: true,
        publisher: true,
        category: true,
      },
    });

    // If no books have been sold yet, get 2 random available books
    if (topSellingBooks.length === 0) {
      const randomBooks = await prisma.product.findMany({
        where: {
          deleted: false,
          available: true,
        },
        take: 2,
        include: {
          writer: true,
          publisher: true,
          category: true,
        },
      });
      return NextResponse.json(randomBooks);
    }

    return NextResponse.json(topSellingBooks);
  } catch (error) {
    console.error('Error fetching top selling books:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top selling books' },
      { status: 500 }
    );
  }
}
