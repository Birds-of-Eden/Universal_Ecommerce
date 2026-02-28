import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

// Validation schema for user updates
const updateUserSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
  phone: z.string().optional(),
  address: z.any().optional(),
  banned: z.boolean().optional(),
  banReason: z.string().nullable().optional(),
  banExpires: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
});

// GET user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        addresses: true,
        banned: true,
        banReason: true,
        banExpires: true,
        note: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          select: {
            id: true,
            status: true,
            grand_total: true,
            order_date: true,
          },
          orderBy: {
            order_date: 'desc',
          },
          take: 5,
        },
        _count: {
          select: {
            orders: true,
            reviews: true,
            cart: true,
            wishlist: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validation = updateUserSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }

    const updateData = validation.data;
    const { id } = await params;

    const user = await db.user.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        addresses: true,
        banned: true,
        banReason: true,
        banExpires: true,
        note: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          select: {
            id: true,
            status: true,
            grand_total: true,
            order_date: true,
          },
          orderBy: {
            order_date: 'desc',
          },
          take: 5,
        },
        _count: {
          select: {
            orders: true,
            reviews: true,
            cart: true,
            wishlist: true,
          },
        },
      },
    });

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Error updating user:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Unique constraint violation' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if user exists and has orders before deleting
    const userWithOrders = await db.user.findUnique({
      where: { id },
      include: {
        orders: {
          take: 1,
        },
        _count: {
          select: {
            orders: true,
            reviews: true,
            cart: true,
            wishlist: true,
          },
        },
      },
    });

    if (!userWithOrders) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userWithOrders.orders.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete user with existing orders',
          details: {
            orderCount: userWithOrders._count.orders,
            reviewCount: userWithOrders._count.reviews,
            cartCount: userWithOrders._count.cart,
            wishlistCount: userWithOrders._count.wishlist,
          }
        },
        { status: 400 }
      );
    }

    await db.user.delete({
      where: { id },
    });

    return NextResponse.json({ 
      message: 'User deleted successfully',
      deletedUser: {
        id: userWithOrders.id,
        email: userWithOrders.email,
        name: userWithOrders.name,
      }
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete user due to foreign key constraints' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}