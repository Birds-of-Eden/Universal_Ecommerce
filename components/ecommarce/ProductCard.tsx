"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ProductCardData = {
  id: number | string;
  name: string;
  href: string;
  image?: string | null;
  price: number;
  originalPrice?: number | null;

  // stock ALWAYS number from parent (we are passing computed stock)
  stock?: number | null;

  available?: boolean;
  discountPct?: number;
  badgeText?: string | null;
  sku?: string | null;
  type?: string | null;
  shortDesc?: string | null;
  specs?: string[];
};

type ProductCardProps = {
  product: ProductCardData;
  wishlisted?: boolean;
  wishlistMode?: "toggle" | "remove";
  onWishlistClick?: () => void;
  onAddToCart?: () => void;
  formatPrice?: (value: number) => string;
  showMeta?: boolean;
  showSpecs?: boolean;
  specsFallback?: string;
  addToCartLabel?: string;
  unavailableLabel?: string;
  className?: string;
};

const defaultFormatPrice = (value: number) =>
  `Tk ${Math.round(value).toLocaleString("en-US")}`;

export default function ProductCard({
  product,
  wishlisted = false,
  wishlistMode = "toggle",
  onWishlistClick,
  onAddToCart,
  formatPrice = defaultFormatPrice,
  showMeta = true,
  showSpecs = false,
  specsFallback,
  addToCartLabel = "Add To Cart",
  unavailableLabel = "Up Coming",
  className,
}: ProductCardProps) {
  const isOutOfStock = product.stock === 0;

  // ✅ only stock controls availability
  const available = !isOutOfStock;

  const hasDiscount = Number(product.discountPct ?? 0) > 0;
  const showOriginal = Number(product.originalPrice ?? 0) > product.price;
  const badge =
    product.badgeText ?? (hasDiscount ? `Save ${product.discountPct}%` : null);

  return (
    <Card
      className={cn(
        "group overflow-hidden border border-border bg-card shadow-sm hover:shadow-lg transition-shadow",
        className
      )}
    >
      <div className="relative bg-white dark:bg-card">
        {onWishlistClick ? (
          <button
            type="button"
            onClick={onWishlistClick}
            className="absolute right-2 top-2 z-10 h-9 w-9 rounded-full border border-border bg-background/90 backdrop-blur flex items-center justify-center hover:bg-accent transition"
            aria-label={
              wishlistMode === "remove"
                ? "Remove from wishlist"
                : wishlisted
                ? "Remove from wishlist"
                : "Add to wishlist"
            }
          >
            {wishlistMode === "remove" ? (
              <Trash2 className="h-4 w-4 text-destructive" />
            ) : (
              <Heart className={cn("h-5 w-5", wishlisted && "fill-current")} />
            )}
          </button>
        ) : null}

        {isOutOfStock ? (
          <div className="absolute left-2 top-2 z-10 rounded-full bg-destructive px-2 py-1 text-[11px] font-semibold text-destructive-foreground">
            Out of Stock
          </div>
        ) : badge ? (
          <div className="absolute left-2 top-2 z-10 rounded-full bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground">
            {badge}
          </div>
        ) : null}

        <Link href={product.href}>
          <div className="relative aspect-[4/3] w-full p-6">
            <Image
              src={product.image || "/placeholder.svg"}
              alt={product.name}
              fill
              className="object-contain transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 25vw"
            />
          </div>
        </Link>
      </div>

      <CardContent className="p-4">
        <Link href={product.href}>
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 hover:underline">
            {product.name}
          </h3>
        </Link>

        {showMeta ? (
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {product.sku ? (
              <li className="flex gap-2">
                <span className="mt-[6px] h-1 w-1 rounded-full bg-muted-foreground/60" />
                <span>
                  <b className="text-foreground/80">SKU:</b> {product.sku}
                </span>
              </li>
            ) : null}

            {product.type ? (
              <li className="flex gap-2">
                <span className="mt-[6px] h-1 w-1 rounded-full bg-muted-foreground/60" />
                <span>
                  <b className="text-foreground/80">Type:</b> {product.type}
                </span>
              </li>
            ) : null}

            {product.shortDesc ? (
              <li className="flex gap-2">
                <span className="mt-[6px] h-1 w-1 rounded-full bg-muted-foreground/60" />
                <span className="line-clamp-2">{product.shortDesc}</span>
              </li>
            ) : null}
          </ul>
        ) : null}

        {showSpecs ? (
          product.specs?.length ? (
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {product.specs.slice(0, 4).map((spec, i) => (
                <li key={`${product.id}-spec-${i}`} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-muted-foreground/70 shrink-0" />
                  <span className="leading-5">{spec}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3 text-sm text-muted-foreground">
              {specsFallback ?? "Specs not available"}
            </div>
          )
        ) : null}

        <div className="mt-4 border-t border-border pt-3">
          {available ? (
            <div className={cn("flex items-center justify-between", showSpecs && "justify-center gap-3")}>
              <div className="font-semibold text-destructive">
                {formatPrice(product.price)}
              </div>
              {showOriginal ? (
                <div className="text-xs text-muted-foreground line-through">
                  {formatPrice(Number(product.originalPrice))}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="text-center font-semibold text-muted-foreground">
              Out of Stock
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button
          className="w-full btn-primary"
          disabled={!available}
          onClick={onAddToCart}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {available ? addToCartLabel : "Out of Stock"}
        </Button>
      </CardFooter>
    </Card>
  );
}