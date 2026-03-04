"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useWishlist } from "@/components/ecommarce/WishlistContext";
import { useCart } from "@/components/ecommarce/CartContext";
import { useSession } from "@/lib/auth-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ProductCard from "./ProductCard";

type ApiVariant = {
  stock?: number | string | null;
  price?: number | string | null;
};

type ProductDTO = {
  id: number | string;
  name: string;
  slug: string;
  image: string | null;
  basePrice: number;
  originalPrice: number | null;
  currency: string;
  featured: boolean;
  shortDesc?: string | null;

  // ✅ from API
  available?: boolean;
  variants?: ApiVariant[] | null;

  // ✅ computed
  stock: number; // <-- ALWAYS number
};

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatBDT(n: number) {
  return `${Math.round(n).toLocaleString("en-US")}৳`;
}

function toNumber(v: any, fallback = 0) {
  const n = typeof v === "string" ? Number(v.replace(/,/g, "")) : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function computeStockFromVariants(variants?: ApiVariant[] | null) {
  const list = Array.isArray(variants) ? variants : [];
  if (!list.length) return 0;
  return list.reduce((sum, v) => sum + toNumber(v?.stock, 0), 0);
}

export default function FeaturedProducts({
  title = "Featured Products",
  subtitle = "Check & Get Your Desired Product!",
  limit = 10,
}: {
  title?: string;
  subtitle?: string;
  limit?: number;
}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProductDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { status } = useSession();

  const toggleWishlist = useCallback(
    async (p: ProductDTO) => {
      try {
        if (status !== "authenticated") {
          setLoginModalOpen(true);
          return;
        }

        const already = isInWishlist(p.id);

        if (already) {
          const res = await fetch(`/api/wishlist?productId=${p.id}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to remove from wishlist");
          removeFromWishlist(p.id);
        } else {
          const res = await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: p.id }),
          });
          if (!res.ok) throw new Error("Failed to add to wishlist");
          addToWishlist(p.id);
        }
      } catch (err) {
        console.error(err);
      }
    },
    [status, isInWishlist, addToWishlist, removeFromWishlist]
  );

  const handleAddToCart = useCallback(
    (p: ProductDTO) => {
      try {
        addToCart(p.id);
      } catch (err) {
        console.error(err);
      }
    },
    [addToCart]
  );

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/products", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load products");

        const data = (await res.json()) as any[];
        if (!mounted) return;

        const mapped: ProductDTO[] = Array.isArray(data)
          ? data.map((p) => {
              const variants = Array.isArray(p?.variants) ? p.variants : [];
              const stock = computeStockFromVariants(variants);

              // price in API is string => convert
              const basePrice = toNumber(p?.basePrice, 0);
              const originalPrice =
                p?.originalPrice !== null && p?.originalPrice !== undefined
                  ? toNumber(p.originalPrice, 0)
                  : null;

              return {
                id: p.id,
                name: String(p.name ?? ""),
                slug: String(p.slug ?? ""),
                image: p.image ?? null,
                basePrice,
                originalPrice,
                currency: String(p.currency ?? "BDT"),
                featured: Boolean(p.featured),
                shortDesc: p.shortDesc ?? null,
                available: Boolean(p.available),
                variants,
                stock, // ✅ computed from variants
              };
            })
          : [];

        setItems(mapped);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Something went wrong");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const featured = useMemo(() => {
    const list = items.filter((p) => p.featured);
    const shuffled = shuffleInPlace([...list]);
    return shuffled.slice(0, limit);
  }, [items, limit]);

  return (
    <section className="w-full">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {subtitle}
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-border bg-background p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div
          className="
            grid gap-3 sm:gap-4
            grid-cols-2
            sm:grid-cols-3
            md:grid-cols-4
            lg:grid-cols-5
          "
        >
          {loading
            ? Array.from({ length: Math.min(limit, 10) }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-background overflow-hidden"
                >
                  <div className="h-6 bg-muted animate-pulse" />
                  <div className="p-4">
                    <div className="h-36 bg-muted animate-pulse rounded-lg" />
                    <div className="mt-4 h-4 bg-muted animate-pulse rounded" />
                    <div className="mt-3 h-4 w-2/3 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))
            : featured.map((p) => {
                const hasDiscount =
                  p.originalPrice !== null && p.originalPrice > p.basePrice;

                const isWishlisted = isInWishlist(p.id);

                // ✅ ONLY stock rules
                const isOutOfStock = p.stock === 0;

                return (
                  <ProductCard
                    key={p.id}
                    product={{
                      id: p.id,
                      name: p.name,
                      href: `/ecommerce/products/${p.id}`,
                      image: p.image,
                      price: p.basePrice,
                      originalPrice: p.originalPrice,

                      // ✅ stock must be passed
                      stock: p.stock,

                      // ✅ do NOT rely on API "available"
                      available: !isOutOfStock,

                      discountPct: hasDiscount
                        ? Math.round(
                            ((p.originalPrice! - p.basePrice) / p.originalPrice!) *
                              100
                          )
                        : undefined,

                      shortDesc: p.shortDesc,
                      sku: undefined,
                      type: undefined,
                    }}
                    wishlisted={isWishlisted}
                    onWishlistClick={() => toggleWishlist(p)}
                    onAddToCart={() => handleAddToCart(p)}
                    formatPrice={formatBDT}
                    showMeta
                  />
                );
              })}
        </div>

        {!loading && featured.length === 0 ? (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            No featured products found.
          </div>
        ) : null}
      </div>

      <Dialog open={loginModalOpen} onOpenChange={setLoginModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Please login first
            </DialogTitle>
            <DialogDescription>
              You need to be logged in to use the wishlist.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setLoginModalOpen(false)}
              className="h-10 px-4 rounded-lg border border-border bg-background text-foreground font-semibold hover:bg-accent transition"
            >
              Cancel
            </button>
            <Link
              href="/signin"
              onClick={() => setLoginModalOpen(false)}
              className="h-10 px-4 rounded-lg btn-primary inline-flex items-center justify-center font-semibold transition"
            >
              Login
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}