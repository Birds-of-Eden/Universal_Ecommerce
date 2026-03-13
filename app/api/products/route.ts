import { prisma } from "@/lib/prisma";
import { syncVariantWarehouseStock } from "@/lib/inventory";
import { normalizeVariantOptions, sortOptionObject } from "@/lib/product-variants";
import { normalizeLowStockThreshold } from "@/lib/stock-status";
import { ensureVariantCodes } from "@/lib/product-codes";
import { NextResponse } from "next/server";
import slugify from "slugify";

const createVariantSku = (slug: string, index: number) =>
  `${slug.substring(0, 20)}-V${index + 1}-${Math.random()
    .toString(36)
    .slice(2, 5)}`.toUpperCase();

const productInclude = {
  category: true,
  brand: true,
  writer: true,
  publisher: true,
  VatClass: true,
  variantOptions: {
    orderBy: { position: "asc" },
    include: {
      values: {
        orderBy: { position: "asc" },
      },
    },
  },
  variants: {
    orderBy: { id: "asc" },
    include: {
      codes: {
        where: { isPrimary: true, status: "ACTIVE" },
        orderBy: { id: "asc" },
      },
    },
  },
  attributes: {
    include: {
      attribute: true,
    },
  },
} as const;

/* =========================
   GET PRODUCTS
========================= */
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        deleted: false,
      },
      orderBy: { id: "desc" },
      include: {
        ...productInclude,
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    // Calculate rating averages for each product
    const productsWithRatings = await Promise.all(
      products.map(async (product) => {
        const ratingAggregation = await prisma.review.aggregate({
          _avg: { rating: true },
          where: { productId: product.id },
        });

        return {
          ...product,
          ratingAvg: ratingAggregation._avg.rating || 0,
          ratingCount: product._count.reviews,
        };
      })
    );

    return NextResponse.json(productsWithRatings);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 }
    );
  }
}

/* =========================
   CREATE PRODUCT
========================= */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!body.name || !body.categoryId || !body.basePrice) {
      return NextResponse.json(
        { error: "Name, category and base price required" },
        { status: 400 }
      );
    }

    const slug = slugify(body.name, { lower: true, strict: true });
    
    // Ensure slug doesn't exceed database limits (typically 255 chars)
    const truncatedSlug = slug.substring(0, 250);
    
    const existing = await prisma.product.findUnique({
      where: { slug: truncatedSlug },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Slug already exists" },
        { status: 400 }
      );
    }

    const initialStock =
      body.stock !== undefined && body.stock !== null ? Number(body.stock) : 0;
    if (!Number.isFinite(initialStock) || initialStock < 0) {
      return NextResponse.json(
        { error: "Stock must be a number (0 or more)" },
        { status: 400 }
      );
    }

    const currency = String(body.currency || "USD")
      .trim()
      .toUpperCase()
      .slice(0, 3);
    if (currency.length !== 3) {
      return NextResponse.json(
        { error: "Currency must be a 3-letter code (e.g., USD, BDT)" },
        { status: 400 },
      );
    }
    const basePrice = Number(body.basePrice);
    if (!Number.isFinite(basePrice) || basePrice < 0) {
      return NextResponse.json(
        { error: "Base price must be a number (0 or more)" },
        { status: 400 }
      );
    }

    const type = body.type || "PHYSICAL";
    const lowStockThreshold = normalizeLowStockThreshold(body.lowStockThreshold);
    const variantOptions = normalizeVariantOptions(body.variantOptions);
    const productAttributesInput = Array.isArray(body.productAttributes)
      ? body.productAttributes
      : [];
    const productAttributes = productAttributesInput
      .map((item: any) => ({
        attributeId: Number(item?.attributeId),
        value: String(item?.value || "").trim(),
      }))
      .filter(
        (item: { attributeId: number; value: string }) =>
          item.attributeId && !Number.isNaN(item.attributeId) && item.value
      );

    const variantsInput = Array.isArray(body.variants) ? body.variants : [];
    const orderedOptionNames = variantOptions.map((option) => option.name);
    const parsedVariants = variantsInput
      .map((item: any, index: number) => {
        const price =
          item?.price !== undefined && item?.price !== null
            ? Number(item.price)
            : basePrice;
        const stock =
          type === "PHYSICAL"
            ? item?.stock !== undefined && item?.stock !== null
              ? Number(item.stock)
              : 0
            : 0;
        const skuRaw =
          typeof item?.sku === "string" && item.sku.trim()
            ? item.sku.trim().toUpperCase()
            : createVariantSku(truncatedSlug, index);
        const sku = skuRaw.slice(0, 64);
        const variantCurrency =
          typeof item?.currency === "string" && item.currency.trim()
            ? item.currency.trim().toUpperCase().slice(0, 3)
            : currency;
        const variantLowStockThreshold = normalizeLowStockThreshold(
          item?.lowStockThreshold,
          lowStockThreshold,
        );
        if (variantCurrency.length !== 3) {
          return null;
        }
        return {
          sku,
          price,
          stock,
          currency: variantCurrency,
          lowStockThreshold: variantLowStockThreshold,
          isDefault: false,
          active: item?.active !== undefined ? Boolean(item.active) : true,
          options:
            item?.options && typeof item.options === "object"
              ? sortOptionObject(item.options, orderedOptionNames)
              : {},
          digitalAssetId: item?.digitalAssetId ? Number(item.digitalAssetId) : null,
        };
      })
      .filter((item: { sku: string } | null) => !!item && !!item.sku);

    const invalidVariant = parsedVariants.find(
      (item: { price: number; stock: number }) =>
        !Number.isFinite(item.price) ||
        item.price < 0 ||
        !Number.isFinite(item.stock) ||
        item.stock < 0
    );
    if (invalidVariant) {
      return NextResponse.json(
        { error: "Variant price/stock must be valid numbers" },
        { status: 400 }
      );
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name: body.name,
          slug: truncatedSlug,
          type,
          sku:
            typeof body.sku === "string" && body.sku.trim()
              ? body.sku.trim().toUpperCase().slice(0, 64)
              : null,

          categoryId: Number(body.categoryId),
          brandId: body.brandId ? Number(body.brandId) : null,

          writerId: body.writerId ? Number(body.writerId) : null,
          publisherId: body.publisherId ? Number(body.publisherId) : null,

          description: body.description || "",
          shortDesc: body.shortDesc || null,

          basePrice,
          originalPrice: body.originalPrice
            ? Number(body.originalPrice)
            : null,
          currency,

          weight: body.weight ? Number(body.weight) : null,
          dimensions: body.dimensions || null,
          VatClassId: body.VatClassId ? Number(body.VatClassId) : null,
          lowStockThreshold,

          digitalAssetId: body.digitalAssetId
            ? Number(body.digitalAssetId)
            : null,
          serviceDurationMinutes: body.serviceDurationMinutes
            ? Number(body.serviceDurationMinutes)
            : null,
          serviceLocation: body.serviceLocation || null,
          serviceOnlineLink: body.serviceOnlineLink || null,

          available: body.available ?? true,
          featured: body.featured ?? false,

          image: body.image || null,
          gallery: body.gallery || [],
          videoUrl: body.videoUrl || null,
        },
      });

      if (productAttributes.length > 0) {
        await tx.productAttribute.createMany({
          data: productAttributes.map(
            (item: { attributeId: number; value: string }) => ({
              productId: created.id,
              attributeId: item.attributeId,
              value: item.value,
            })
          ),
        });
      }

      if (variantOptions.length > 0) {
        for (let optionIndex = 0; optionIndex < variantOptions.length; optionIndex += 1) {
          const option = variantOptions[optionIndex];
          await tx.productVariantOption.create({
            data: {
              productId: created.id,
              name: option.name,
              position: optionIndex,
              values: {
                create: option.values.map((value, valueIndex) => ({
                  value,
                  position: valueIndex,
                })),
              },
            },
          });
        }
      }

      if (parsedVariants.length > 0) {
        for (const variant of parsedVariants) {
          const createdVariant = await tx.productVariant.create({
            data: {
              productId: created.id,
              sku: variant.sku,
              price: variant.price,
              currency: variant.currency,
              stock: 0,
              lowStockThreshold: variant.lowStockThreshold,
              isDefault: false,
              active: variant.active,
              digitalAssetId: variant.digitalAssetId,
              options: variant.options,
            },
          });

          await syncVariantWarehouseStock({
            tx,
            productId: created.id,
            productVariantId: createdVariant.id,
            quantity: variant.stock,
            reason: "Admin variant initial stock",
          });

          await ensureVariantCodes(tx, {
            productId: created.id,
            variantId: createdVariant.id,
          });
        }
      } else {
        const fallbackVariant = await tx.productVariant.create({
          data: {
            productId: created.id,
            sku: createVariantSku(truncatedSlug, 0).slice(0, 64),
            price: basePrice,
            currency,
            stock: 0,
            lowStockThreshold,
            isDefault: true,
            active: true,
            options: {},
          },
        });

        await ensureVariantCodes(tx, {
          productId: created.id,
          variantId: fallbackVariant.id,
        });

        if (type === "PHYSICAL") {
          await syncVariantWarehouseStock({
            tx,
            productId: created.id,
            productVariantId: fallbackVariant.id,
            quantity: initialStock,
            reason: "Admin variant initial stock",
          });
        }
      }

      return tx.product.findUnique({
        where: { id: created.id },
        include: productInclude,
      });
    });

    if (!product) {
      return NextResponse.json(
        { error: "Failed to create product" },
        { status: 500 }
      );
    }

    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
