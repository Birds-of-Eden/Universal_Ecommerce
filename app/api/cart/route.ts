// app/api/cart/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET cart items - Logged in user only
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string } | undefined;
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const items = await prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            variants: {
              orderBy: { id: 'asc' },
            },
            VatClass: true,
          },
        },
        variant: true,
      },
      orderBy: { id: 'asc' },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ADD to cart - Logged in user only
// Body: { productId: number, variantId?: number, quantity?: number }
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string } | undefined;
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const productId = Number(body.productId);
    const variantId =
      body.variantId !== undefined && body.variantId !== null
        ? Number(body.variantId)
        : null;
    const quantity = Number(body.quantity ?? 1);

    if (!productId || Number.isNaN(productId) || quantity <= 0) {
      return NextResponse.json(
        { error: 'Invalid productId or quantity' },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: {
          orderBy: { isDefault: 'desc' },
        },
      },
    });

    if (!product || !product.available) {
      return NextResponse.json(
        { error: 'Product not available' },
        { status: 404 }
      );
    }

    const targetVariant =
      variantId !== null
        ? product.variants.find((variant) => variant.id === variantId) ?? null
        : product.variants.find((variant) => variant.isDefault) ??
          product.variants[0] ??
          null;

    if (!targetVariant) {
      return NextResponse.json(
        { error: 'Product inventory is not configured' },
        { status: 400 }
      );
    }

    if (!targetVariant.active) {
      return NextResponse.json(
        { error: 'Selected variant is inactive' },
        { status: 400 }
      );
    }

    if (targetVariant.productId !== productId) {
      return NextResponse.json(
        { error: 'Variant does not belong to the selected product' },
        { status: 400 }
      );
    }

    if (product.type === 'PHYSICAL' && Number(targetVariant.stock) < quantity) {
      return NextResponse.json(
        { error: 'Requested quantity exceeds available stock' },
        { status: 400 }
      );
    }

    const existing = await prisma.cartItem.findFirst({
      where: {
        userId,
        productId,
        variantId: targetVariant.id,
      },
    });

    let cartItem;

    if (existing) {
      const nextQuantity = existing.quantity + quantity;
      if (product.type === 'PHYSICAL' && Number(targetVariant.stock) < nextQuantity) {
        return NextResponse.json(
          { error: 'Requested quantity exceeds available stock' },
          { status: 400 }
        );
      }

      cartItem = await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: nextQuantity,
        },
      });
    } else {
      cartItem = await prisma.cartItem.create({
        data: {
          userId,
          productId,
          variantId: targetVariant.id,
          quantity,
        },
      });
    }

    return NextResponse.json(cartItem, { status: 201 });
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// CLEAR cart - Logged in user only
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { id?: string } | undefined;
    const userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.cartItem.deleteMany({
      where: { userId },
    });

    return NextResponse.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
