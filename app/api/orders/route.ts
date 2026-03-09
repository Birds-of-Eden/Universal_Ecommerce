// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { deductVariantInventory } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { getAccessContext } from "@/lib/rbac";
import { calculateShippingQuote } from "@/lib/shipping";

// GET /api/orders
// - admin: all orders (with pagination & optional status filter)
// - normal user: only own orders
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const access = await getAccessContext(
      session.user as { id?: string; role?: string } | undefined,
    );
    const canReadAll = access.has("orders.read_all");
    const canReadOwn = canReadAll || access.has("orders.read_own");
    if (!canReadOwn) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const statusParam = searchParams.get("status"); // e.g. "PENDING"
    const hasShipmentParam = searchParams.get("hasShipment");

    const skip = (page - 1) * limit;

    const where: any = {};

    // normal user -> only his/her orders
    if (!canReadAll) {
      where.userId = userId;
    }

    if (statusParam) {
      // status must match enum values
      const validOrderStatuses = [
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
      ] as const;

      if (!validOrderStatuses.includes(statusParam as (typeof validOrderStatuses)[number])) {
        return NextResponse.json(
          { error: "Invalid status filter" },
          { status: 400 }
        );
      }
      where.status = statusParam;
    }

    // Admin helper filter for shipment flow
    if (hasShipmentParam === "true") {
      where.shipments = { some: {} };
    } else if (hasShipmentParam === "false") {
      where.shipments = { none: {} };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          user: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/orders
// Body:
// {
//   name, email, phone_number, alt_phone_number,
//   country, district, area, address_details,
//   payment_method,
//   items: [{ productId: number, variantId?: number, quantity: number }],
//   transactionId?: string,
//   image?: string  // payment screenshot url
// }
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id as string | undefined;

    const body = await request.json();

    const {
      name,
      email,
      phone_number,
      alt_phone_number,
      country,
      district,
      area,
      address_details,
      payment_method,
      items,
      transactionId, // body থেকে নিচ্ছি
      image,         // 🔥 payment screenshot URL (e.g. /upload/xxx.png)
    } = body;

    const paymentMethod = String(payment_method || "");
    const isCOD = paymentMethod === "CashOnDelivery";
    const isSSLCOMMERZ = paymentMethod === "SSLCOMMERZ";
    const isManualPayment = !isCOD && !isSSLCOMMERZ;

    if (
      !name ||
      !phone_number ||
      !country ||
      !district ||
      !area ||
      !address_details ||
      !payment_method
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Order items required" },
        { status: 400 }
      );
    }

    // Only MANUAL payment requires screenshot proof
    if (isManualPayment && !image) {
      return NextResponse.json(
        { error: "Payment screenshot is required for online payments" },
        { status: 400 }
      );
    }

    // validate items quickly
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { error: "Invalid order item(s)" },
          { status: 400 }
        );
      }
    }

    const normalizedItems = items.map((item: any) => ({
      productId: Number(item.productId),
      variantId:
        item.variantId !== undefined && item.variantId !== null
          ? Number(item.variantId)
          : null,
      quantity: Number(item.quantity),
    }));

    const productIds = normalizedItems.map((i) => i.productId);

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      include: {
        variants: {
          include: {
            stockLevels: {
              include: {
                warehouse: {
                  select: { id: true, code: true, isDefault: true },
                },
              },
            },
          },
          orderBy: [{ isDefault: "desc" }, { id: "asc" }],
        },
      },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Some products not found" },
        { status: 400 }
      );
    }

    // calculate subtotal and check availability
    let subtotal = 0;

    const orderItemsData = normalizedItems.map((item) => {
      const product = products.find((p: any) => p.id === item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (!product.available) {
        throw new Error(`Product not available: ${product.name}`);
      }

      const targetVariant =
        item.variantId !== null
          ? product.variants.find((variant) => variant.id === item.variantId) ?? null
          : product.variants.find((variant) => variant.isDefault) ??
            product.variants[0] ??
            null;

      if (!targetVariant) {
        throw new Error(`Inventory not configured for: ${product.name}`);
      }

      if (!targetVariant.active) {
        throw new Error(`Variant inactive for: ${product.name}`);
      }

      if (item.variantId !== null && targetVariant.productId !== product.id) {
        throw new Error(`Variant mismatch for: ${product.name}`);
      }

      if (product.type === "PHYSICAL" && Number(targetVariant.stock) < item.quantity) {
        throw new Error(`Insufficient stock for: ${product.name}`);
      }

      const priceNumber = Number(targetVariant.price ?? product.basePrice);
      const lineTotal = priceNumber * item.quantity;

      subtotal += lineTotal;

      return {
        productId: product.id,
        variantId: targetVariant.id,
        quantity: item.quantity,
        price: priceNumber,
        currency: String(targetVariant.currency || product.currency || "BDT"),
        product,
        variant: targetVariant,
      };
    });

    const shippingQuote = await calculateShippingQuote({
      country: String(country),
      district: String(district),
      area: String(area),
      subtotal,
    });

    const shipping_cost = shippingQuote.shippingCost;
    const grand_total = subtotal + shipping_cost;

    // payment_method থেকে paymentStatus ঠিক করা
    const paymentStatus = (isCOD || isSSLCOMMERZ) ? "UNPAID" : "PAID";

    // Use a transaction for order + orderItems consistency
    const created = await prisma.$transaction(async (tx: any) => {
      // Create the order (orderItems will reference productId values)
      const o = await tx.order.create({
        data: {
          userId: userId ?? null,
          name,
          email: email ?? null,
          phone_number,
          alt_phone_number: alt_phone_number ?? null,
          country,
          district,
          area,
          address_details,
          payment_method,
          total: subtotal,
          shipping_cost,
          grand_total,
          status: "PENDING",
          paymentStatus,
          transactionId: transactionId ?? null,
          image: isManualPayment ? (image ?? null) : null,
          orderItems: {
            create: orderItemsData.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              price: item.price,
              currency: item.currency,
            })),
          },
        },
        include: {
          orderItems: { include: { product: true, variant: true } },
        },
      });

      for (const item of orderItemsData) {
        if (item.product.type === "PHYSICAL") {
          await deductVariantInventory({
            tx,
            productId: item.product.id,
            productVariantId: item.variant.id,
            quantity: item.quantity,
            reason: `Order #${o.id} checkout deduction`,
          });
        }
      }

      return o;
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("Error creating order:", error);

    if (
      typeof error?.message === "string" &&
      (error.message.startsWith("Product") ||
        error.message.startsWith("Insufficient stock") ||
        error.message.startsWith("Inventory") ||
        error.message.startsWith("Variant") ||
        error.message.startsWith("Variant inactive") ||
        error.message.startsWith("Stock changed") ||
        error.message.startsWith("Unable to allocate"))
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
