"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Loader2, ShoppingCart, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/components/ecommarce/CartContext";

export type ProductCardData = {
  id: number | string;
  name: string;
  href: string;
  image?: string | null;
  price: number;
  originalPrice?: number | null;
  stock?: number | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  discountPct?: number;
  sku?: string;
  type?: string;
  shortDesc?: string;
  available?: boolean;
  totalSold?: number | null;
  rank?: number | null;
  bundleItems?: Array<{
    product: {
      id: number;
      name: string;
      image?: string;
    };
    quantity: number;
  }>;
  bundleItemCount?: number;
  bundleSavings?: string;
  bundleStockLimit?: number | string;
};

type Props = {
  product: ProductCardData;
  wishlisted?: boolean;
  wishlistMode?: string;
  showMeta?: boolean;
  addToCartLabel?: string;
  onWishlistClick?: () => void | Promise<void>;
  onAddToCart?: () => void | Promise<void>;
  formatPrice?: (value: number) => string;
  className?: string;
};

const defaultFormatPrice = (value: number) =>
  `৳${Math.round(value).toLocaleString("en-US")}`;

function Stars({ value }: { value: number }) {
  const v = Math.max(0, Math.min(5, value || 0));
  const full = Math.floor(v);
  const half = v - full >= 0.5;

  return (
    <div className="flex items-center gap-0.5 leading-none">
      {Array.from({ length: 5 }).map((_, i) => {
        const isFull = i < full;
        const isHalf = i === full && half;

        return (
          <span
            key={i}
            className={cn(
              "text-[18px] leading-none",
              isFull || isHalf ? "text-yellow-400" : "text-muted-foreground/30",
            )}
          >
            ★
          </span>
        );
      })}
    </div>
  );
}

export default function ProductCardCompact({
  product,
  wishlisted = false,
  onWishlistClick,
  onAddToCart,
  formatPrice = defaultFormatPrice,
  addToCartLabel = "Add To Cart",
  className,
}: Props) {
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [buttonAnimate, setButtonAnimate] = useState(false);
  const { addToCart } = useCart();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const imageFrameRef = useRef<HTMLDivElement>(null);

  const effectiveStock =
    product.type === "BUNDLE"
      ? Number(product.bundleStockLimit ?? product.stock ?? 0)
      : Number(product.stock ?? 0);

  const isOutOfStock = effectiveStock === 0;
  const ratingAvg = Number(product.ratingAvg ?? 0);
  const ratingCount = Number(product.ratingCount ?? 0);
  const isBestSeller = Boolean(product.rank && product.rank <= 3);

  const showOriginal =
    (product.originalPrice ?? 0) > (product.price ?? 0) && !isOutOfStock;

  const savingsPercent =
    product.discountPct && product.discountPct > 0
      ? product.discountPct
      : showOriginal
        ? Math.round(
            ((Number(product.originalPrice) - product.price) /
              Number(product.originalPrice)) *
              100,
          )
        : 0;

  const showSavingsSticker =
    savingsPercent > 0 && !isOutOfStock && !isBestSeller;

  const handleAddToCart = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock || isAddingToCart) return;

    try {
      setIsAddingToCart(true);
      setButtonAnimate(true);

      const buttonRect = buttonRef.current?.getBoundingClientRect();
      const imageRect = imageFrameRef.current?.getBoundingClientRect();
      const startX = buttonRect ? buttonRect.left + buttonRect.width / 2 : 0;
      const startY = buttonRect ? buttonRect.top + buttonRect.height / 2 : 0;

      // If custom onAddToCart is provided, use it
      if (onAddToCart) {
        await Promise.resolve(onAddToCart());
        // Dispatch event for animation even when using custom callback
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("cart-item-added", {
            detail: {
              startX,
              startY,
              image: product.image || undefined,
              imageRect: imageRect
                ? {
                    left: imageRect.left,
                    top: imageRect.top,
                    width: imageRect.width,
                    height: imageRect.height,
                  }
                : undefined,
            },
          }));
        }
      } else {
        // Use context's addToCart with animation data
        addToCart(product.id, 1, undefined, {
          startX,
          startY,
          image: product.image || undefined,
          imageRect: imageRect
            ? {
                left: imageRect.left,
                top: imageRect.top,
                width: imageRect.width,
                height: imageRect.height,
              }
            : undefined,
        });
      }
    } finally {
      setTimeout(() => {
        setIsAddingToCart(false);
      }, 500);
      setTimeout(() => {
        setButtonAnimate(false);
      }, 1000);
    }
  };

  return (
    <div
      className={cn(
        "group w-full min-w-[220px] max-w-[220px] overflow-hidden rounded-md border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl sm:min-w-[240px] sm:max-w-[240px]",
        className,
      )}
    >
      <Link href={product.href} className="block h-full">
        <div className="flex h-full flex-col">
          <div
            ref={imageFrameRef}
            className="relative flex h-[190px] items-center justify-center overflow-hidden rounded-t-md bg-muted/20 px-4 pt-3"
          >
            {onWishlistClick ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onWishlistClick();
                }}
                className="absolute left-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/95 shadow-sm backdrop-blur transition-all duration-300 hover:scale-105 hover:bg-accent"
                aria-label={
                  wishlisted ? "Remove from wishlist" : "Add to wishlist"
                }
              >
                <Heart
                  className={cn(
                    "h-4 w-4 transition-colors",
                    wishlisted
                      ? "fill-primary text-primary"
                      : "text-muted-foreground",
                  )}
                />
              </button>
            ) : null}

            {isBestSeller ? (
              <div className="absolute right-3 top-3 z-20">
                <div className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[13px] font-bold text-primary-foreground shadow-lg animate-pulse">
                  <Flame className="h-4 w-4" />
                  <span>Best Selling</span>
                </div>
              </div>
            ) : null}

            {showSavingsSticker ? (
              <div className="absolute right-3 top-3 z-10">
                <div className="relative flex h-[56px] w-[56px] items-center justify-center">
                  <div className="absolute inset-0 bg-green-500 shadow-md ring-2 ring-white/80 [clip-path:polygon(50%_0%,61%_10%,75%_5%,82%_18%,95%_25%,90%_40%,100%_50%,90%_60%,95%_75%,82%_82%,75%_95%,61%_90%,50%_100%,39%_90%,25%_95%,18%_82%,5%_75%,10%_60%,0%_50%,10%_40%,5%_25%,18%_18%,25%_5%,39%_10%)]" />
                  <span className="relative text-[14px] font-bold leading-none text-white">
                    {savingsPercent}%
                  </span>
                </div>
              </div>
            ) : null}

            {isOutOfStock ? (
              <span className="absolute bottom-3 right-3 z-10 rounded-sm bg-red-500 px-2 py-1 text-[10px] font-semibold text-white shadow-sm">
                Out of Stock
              </span>
            ) : null}

            <Image
              src={product.image || "/placeholder.svg"}
              alt={product.name}
              fill
              className="object-contain p-4 transition-transform duration-500 ease-out group-hover:scale-105"
              sizes="(max-width: 640px) 220px, 240px"
            />
          </div>

          <div className="flex flex-1 flex-col px-4 pb-3 pt-3">
            <div className="min-h-[44px]">
              <h3 className="line-clamp-2 text-[16px] font-medium leading-5 text-foreground">
                {product.name}
              </h3>
            </div>

            <div className="mt-1 flex items-center gap-2">
              <Stars value={ratingAvg} />
              <span className="text-[14px] font-medium text-muted-foreground">
                {ratingCount > 0
                  ? `${ratingAvg.toFixed(1)} (${ratingCount})`
                  : "No reviews"}
              </span>
            </div>

            {product.totalSold && product.totalSold > 0 ? (
              <div className="mt-2">
                <div className="inline-flex items-center rounded-md border border-border bg-background/95 px-2.5 py-1 text-[12px] font-semibold text-foreground shadow-sm">
                  {product.totalSold.toLocaleString()} sold
                </div>
              </div>
            ) : null}

            {product.type === "BUNDLE" && (
              <div className="mt-1 space-y-1">
                {product.bundleSavings && (
                  <div className="text-[13px] font-medium text-green-600">
                    Save {product.bundleSavings}
                  </div>
                )}

                {product.bundleItems && product.bundleItems.length > 0 && (
                  <div className="line-clamp-1 text-[12px] text-muted-foreground">
                    Includes:{" "}
                    {product.bundleItems
                      .slice(0, 2)
                      .map((item) => item.product.name)
                      .join(", ")}
                    {product.bundleItems.length > 2 &&
                      ` +${product.bundleItems.length - 2} more`}
                  </div>
                )}
              </div>
            )}

            <div className="mt-2 flex items-end gap-2">
              <span className="text-[24px] font-semibold tracking-tight text-primary">
                {formatPrice(product.price)}
              </span>

              {showOriginal ? (
                <span className="mb-[2px] text-[15px] text-muted-foreground line-through">
                  {formatPrice(Number(product.originalPrice))}
                </span>
              ) : null}
            </div>

            <div className="mt-3">
              <button
                ref={buttonRef}
                type="button"
                disabled={isOutOfStock || isAddingToCart}
                onClick={handleAddToCart}
                className={cn(
                  "flex h-[40px] w-full items-center justify-center gap-2 rounded-[4px] border text-[15px] font-medium transition-all duration-200",
                  isOutOfStock || isAddingToCart
                    ? "cursor-not-allowed border-destructive bg-destructive/10 text-destructive"
                    : "border-primary bg-transparent text-primary hover:bg-primary/5",
                  buttonAnimate ? "animate-bounce-in" : ""
                )}
              >
                {isAddingToCart ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4" />
                    <span>{addToCartLabel}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
