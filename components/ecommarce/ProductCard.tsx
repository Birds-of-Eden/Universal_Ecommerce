"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
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
};

type Props = {
  product: ProductCardData;
  wishlisted?: boolean;
  onWishlistClick?: () => void;
  onAddToCart?: () => void;
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
              isFull || isHalf ? "text-yellow-400" : "text-muted-foreground/40",
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
  const isOutOfStock = product.stock === 0;
  const ratingAvg = Number(product.ratingAvg ?? 0);
  const ratingCount = Number(product.ratingCount ?? 0);

  const showOriginal =
    (product.originalPrice ?? 0) > (product.price ?? 0) && !isOutOfStock;

  return (
    <SpotlightCard
      className="!p-0 !border-border !bg-card !rounded-2xl min-w-[220px] max-w-[220px] sm:min-w-[240px] sm:max-w-[240px] overflow-hidden shadow-sm transition-all duration-300 ease-out hover:shadow-lg hover:scale-105 hover:-translate-y-1 group"
      spotlightColor="rgba(0, 229, 255, 0.2)"
    >
      <Link href={product.href} className="block h-full">
        <div className={cn("", className)}>
          <div className="relative h-[160px] sm:h-[170px] bg-muted/40">
            {product.discountPct && product.discountPct > 0 ? (
              <span className="absolute left-3 top-3 z-10 rounded-md bg-orange-500 px-2 py-1 text-[11px] font-semibold text-white">
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
                className="absolute right-3 top-3 z-10 h-9 w-9 rounded-full border border-border bg-background/90 backdrop-blur flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors"
                aria-label={
                  wishlisted ? "Remove from wishlist" : "Add to wishlist"
                }
              >
                <Heart
                  className={cn(
                    "h-5 w-5",
                    wishlisted
                      ? "fill-primary text-primary"
                      : "text-muted-foreground",
                  )}
                />
              </button>
            ) : null}

            <div className="block h-full w-full">
              <Image
                src={product.image || "/placeholder.svg"}
                alt={product.name}
                fill
                className="object-contain p-5 transition-transform duration-300 ease-out group-hover:scale-110"
                sizes="(max-width: 640px) 220px, 240px"
              />
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center gap-2">
              <Stars value={ratingAvg} />
              <span className="text-[12px] text-muted-foreground">
                {ratingCount > 0 ? `${ratingAvg.toFixed(1)} (${ratingCount})` : "No reviews"}
              </span>
            </div>

            <p className="mt-2 text-[13px] text-foreground leading-snug line-clamp-2">
              {product.name}
            </p>

            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex flex-col leading-tight">
                <span className="font-semibold text-foreground">
                  {formatPrice(product.price)}
                </span>

                {showOriginal ? (
                  <span className="mt-1 text-[12px] text-muted-foreground line-through">
                    {formatPrice(Number(product.originalPrice))}
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                disabled={isOutOfStock}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddToCart?.();
                }}
                className={cn(
                  "rounded-lg border border-border px-3 py-1.5 text-[12px] transition-colors",
                  isOutOfStock
                    ? "bg-destructive text-destructive-foreground cursor-not-allowed opacity-50"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )}
              >
                {isOutOfStock ? "Out of Stock" : "Add To Cart"}
              </button>
            </div>
          </div>
        </div>
      </Link>
    </SpotlightCard>
  );
}
