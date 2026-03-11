"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Trophy, ShoppingCart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import SpotlightCard from "../SpotlightCard";

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
};

type Props = {
  product: ProductCardData;
  wishlisted?: boolean;
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
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const isFull = i < full;
        const isHalf = i === full && half;

        return (
          <span
            key={i}
            className={cn(
              "text-[12px]",
              isFull || isHalf ? "text-yellow-400" : "text-muted-foreground/40"
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
  className,
}: Props) {
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const isOutOfStock = product.stock === 0;
  const ratingAvg = Number(product.ratingAvg ?? 0);
  const ratingCount = Number(product.ratingCount ?? 0);

  const showOriginal =
    (product.originalPrice ?? 0) > (product.price ?? 0) && !isOutOfStock;

  const handleAddToCart = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock || isAddingToCart) return;

    try {
      setIsAddingToCart(true);
      await Promise.resolve(onAddToCart?.());
    } finally {
      setTimeout(() => {
        setIsAddingToCart(false);
      }, 500);
    }
  };

  return (
    <div
      className="group !p-0 !border-border !bg-card !rounded-2xl min-w-[220px] max-w-[220px] sm:min-w-[240px] sm:max-w-[240px] overflow-hidden shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl"
    >
      <Link href={product.href} className="block h-full">
        <div className={cn("h-full", className)}>
          {/* Image Area */}
          <div className="relative h-[160px] sm:h-[170px] bg-muted/30 overflow-hidden">
            {product.discountPct && product.discountPct > 0 ? (
              <span className="absolute left-3 top-3 z-10 rounded-md bg-orange-500 px-2 py-1 text-[11px] font-semibold text-white shadow-sm">
                {product.discountPct}%
              </span>
            ) : null}

            {onWishlistClick ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onWishlistClick();
                }}
                className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 backdrop-blur transition-all duration-300 hover:scale-105 hover:bg-accent hover:text-accent-foreground"
                aria-label={
                  wishlisted ? "Remove from wishlist" : "Add to wishlist"
                }
              >
                <Heart
                  className={cn(
                    "h-5 w-5 transition-colors",
                    wishlisted
                      ? "fill-primary text-primary"
                      : "text-muted-foreground"
                  )}
                />
              </button>
            ) : null}

            <Image
              src={product.image || "/placeholder.svg"}
              alt={product.name}
              fill
              className="object-cover p-5 transition-transform duration-500 ease-out group-hover:scale-110"
              sizes="(max-width: 640px) 220px, 240px"
            />
          </div>

          {/* Content Area */}
          <div className="p-4 pb-4">
            <div className="mb-2 flex flex-wrap justify-between gap-2">
              {product.rank && product.rank <= 3 && (
                <div className="best-seller-badge flex animate-pulse items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold">
                  <Trophy className="h-3 w-3" />
                  Best Seller
                </div>
              )}

              {product.totalSold && product.totalSold > 0 && (
                <div className="sold-count-badge rounded-md px-2 py-1 text-[10px] font-semibold">
                  {product.totalSold.toLocaleString()} sold
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Stars value={ratingAvg} />
              <span className="text-[12px] text-muted-foreground">
                {ratingCount > 0
                  ? `${ratingAvg.toFixed(1)} (${ratingCount})`
                  : "No reviews"}
              </span>
            </div>

            <p className="mt-2 min-h-[36px] line-clamp-2 text-[13px] leading-snug text-foreground">
              {product.name}
            </p>

            {/* Bottom Section */}
            <div className="relative mt-4 h-[64px] overflow-hidden">
              {/* Default Price View */}
              <div className="absolute inset-0 flex items-center bg-card transition-all duration-300 ease-out group-hover:-translate-y-full group-hover:opacity-0">
                <div className="flex flex-col justify-center leading-tight">
                  <span className="font-semibold text-foreground">
                    {formatPrice(product.price)}
                  </span>

                  {showOriginal ? (
                    <span className="mt-1 text-[12px] text-muted-foreground line-through">
                      {formatPrice(Number(product.originalPrice))}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Hover Bottom Action */}
              <div className="absolute inset-0 translate-y-full opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                <button
                  type="button"
                  disabled={isOutOfStock || isAddingToCart}
                  onClick={handleAddToCart}
                  className={cn(
                    "group/cart relative mx-2 mt-1.5 flex h-[42px] w-[calc(100%-16px)] items-center justify-center overflow-hidden rounded-[6px] text-[13px] font-semibold shadow-sm transition-all duration-300",
                    isOutOfStock || isAddingToCart
                      ? "cursor-not-allowed bg-destructive text-destructive-foreground"
                      : "bg-primary text-primary-foreground hover:bg-primary/95"
                  )}
                >
                  {isOutOfStock ? (
                    <span>Out of Stock</span>
                  ) : isAddingToCart ? (
                    <Loader2 className="h-[18px] w-[18px] animate-spin" />
                  ) : (
                    <>
                      <span className="absolute transition-all duration-300 ease-out group-hover/cart:-translate-y-4 group-hover/cart:opacity-0">
                        Add To Cart
                      </span>

                      <ShoppingCart className="absolute h-[18px] w-[18px] translate-y-4 opacity-0 transition-all duration-300 ease-out group-hover/cart:translate-y-0 group-hover/cart:opacity-100" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}