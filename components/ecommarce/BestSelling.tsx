"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useWishlist } from "@/components/ecommarce/WishlistContext";
import { useCart } from "@/components/ecommarce/CartContext";
import { cachedFetchJson } from "@/lib/client-cache-fetch";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import ProductCardCompact from "./ProductCard";
import GradientBorder from "@/components/ui/GradientBorder";
import { FaRobot } from "react-icons/fa";

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

  createdAt?: string;

  // from top-selling API
  totalSold?: number | null;
  rank?: number | null;

  variants?: ApiVariant[] | null;

  // computed
  stock: number;
};

type ReviewDTO = {
  id?: number | string;
  rating: number | string;
  comment?: string | null;
  productId: number | string;
  createdAt?: string;
};

function normalizeReviewsPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.reviews)) return data.reviews;
  if (Array.isArray(data?.data)) return data.data;
  return [];
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

function formatBDT(n: number) {
  return `${Math.round(n).toLocaleString("en-US")}৳`;
}

function calcDiscountPercent(base: number, original: number | null) {
  if (!original || original <= base) return null;
  const p = Math.round(((original - base) / original) * 100);
  return p > 0 ? p : null;
}

export default function BestSelling({
  title = "Best Selling",
  subtitle = "Top selling products right now",
  limit = 20,
  topSellingData,
  reviewsData,
  isAuthenticated = false,
}: {
  title?: string;
  subtitle?: string;
  limit?: number;
  topSellingData?: any[];
  reviewsData?: any[];
  isAuthenticated?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProductDTO[]>([]);
  const [reviews, setReviews] = useState<ReviewDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  /* ================= Wishlist toggle ================= */
  const toggleWishlist = useCallback(
    async (p: ProductDTO) => {
      try {
        if (!isAuthenticated) {
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
    [isAuthenticated, isInWishlist, addToWishlist, removeFromWishlist]
  );

  /* ================= Add to cart ================= */
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

  /* ================= FETCH (top-selling + reviews) ================= */
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const pData =
          topSellingData ??
          (await cachedFetchJson<any>("/api/products/top-selling", {
            ttlMs: 2 * 60 * 1000,
          }));
        const rData =
          reviewsData ??
          (await cachedFetchJson<any>("/api/reviews", { ttlMs: 60 * 1000 }));

        if (!mounted) return;

        const pList: any[] = Array.isArray(pData) ? pData : pData?.data ?? [];
        const rList = normalizeReviewsPayload(rData);

        const mappedProducts: ProductDTO[] = pList.map((p) => {
          const variants = Array.isArray(p?.variants) ? p.variants : [];
          const stock = computeStockFromVariants(variants);

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
            createdAt: p.createdAt ? String(p.createdAt) : undefined,
            totalSold: p.totalSold ?? p.soldCount ?? null,
            rank: p.rank ?? null,
            variants,
            stock,
          };
        });

        const mappedReviews: ReviewDTO[] = rList.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment ?? null,
          productId: r.productId,
          createdAt: r.createdAt,
        }));

        setItems(mappedProducts);
        setReviews(mappedReviews);
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
  }, [topSellingData, reviewsData]);

  /* ================= Review stats (productId wise) ================= */
  const reviewStats = useMemo(() => {
    const map: Record<string, { count: number; sum: number; avg: number }> = {};
    for (const r of reviews) {
      const pid = String(r.productId);
      const rating = toNumber(r.rating, 0);
      if (!map[pid]) map[pid] = { count: 0, sum: 0, avg: 0 };
      map[pid].count += 1;
      map[pid].sum += rating;
    }
    Object.keys(map).forEach((pid) => {
      map[pid].avg = map[pid].count ? map[pid].sum / map[pid].count : 0;
    });
    return map;
  }, [reviews]);

  /* ================= Visible list ================= */
  const visible = useMemo(() => items.slice(0, limit), [items, limit]);

  /* ================= Scroll arrows ================= */
  const scrollByCards = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;

    const card = el.querySelector<HTMLElement>("[data-card='1']");
    const cardW = card ? card.offsetWidth : 240;

    el.scrollBy({
      left: dir === "left" ? -cardW * 1.2 : cardW * 1.2,
      behavior: "smooth",
    });
  };

  return (
    <section className="w-full bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* ✅ Header (same as NewArrivals) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              {title}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              {subtitle}
            </p>
          </div>

          {/* Ask AI Button - Professional Minimal with Gradient Border */}
          <GradientBorder 
            borderRadius="rounded-full" 
            className="flex-shrink-0"
          >
            <button
              onClick={() => {
                // TODO: Implement AI chat functionality
                console.log("Ask AI clicked");
              }}
              className="group relative flex items-center gap-2 px-4 py-2 rounded-full 
                  bg-secondary hover:bg-secondary/90 
                  transition-all duration-200 
                  w-full"
            >
              {/* Status indicator */}
              <div className="relative">
                <FaRobot className="h-4 w-4 text-foreground group-hover:scale-110 transition-transform" />
                <div
                  className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full 
                    border border-background animate-pulse"
                />
              </div>

              <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">
                Ask AI
              </span>
            </button>
          </GradientBorder>
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-border bg-background p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {/* ✅ Carousel row (same as NewArrivals) */}
        <div className="relative mt-5 sm:mt-6">
          <button
            onClick={() => scrollByCards("left")}
            className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-muted"
            aria-label="Scroll left"
          >
            ←
          </button>

          <div
            ref={scrollerRef}
            className="flex gap-4 sm:gap-6 overflow-x-auto scroll-smooth pb-4 snap-x snap-mandatory"
            style={{ scrollbarWidth: "none" }}
          >
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="snap-start min-w-[220px] max-w-[220px] sm:min-w-[240px] sm:max-w-[240px] rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
                  >
                    <div className="h-[160px] sm:h-[170px] bg-muted animate-pulse" />
                    <div className="p-4">
                      <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                      <div className="mt-3 h-4 bg-muted animate-pulse rounded" />
                      <div className="mt-3 h-4 w-2/3 bg-muted animate-pulse rounded" />
                      <div className="mt-5 h-8 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                ))
              : visible.map((p) => {
                  const discountPct = calcDiscountPercent(
                    p.basePrice,
                    p.originalPrice
                  );

                  const stats = reviewStats[String(p.id)] ?? {
                    avg: 0,
                    count: 0,
                  };

                  const isWishlisted = isInWishlist(p.id);

                  return (
                    <div key={String(p.id)} className="snap-start" data-card="1">
                      <ProductCardCompact
                        product={{
                          id: p.id,
                          name: p.name,
                          href: `/ecommerce/products/${p.id}`,
                          image: p.image,
                          price: p.basePrice,
                          originalPrice: p.originalPrice,
                          stock: p.stock,
                          ratingAvg: stats.avg,
                          ratingCount: stats.count,
                          discountPct: discountPct ?? undefined,
                        }}
                        wishlisted={isWishlisted}
                        onWishlistClick={() => toggleWishlist(p)}
                        onAddToCart={() => handleAddToCart(p)}
                        formatPrice={formatBDT}
                      />
                    </div>
                  );
                })}
          </div>

          <button
            onClick={() => scrollByCards("right")}
            className="hidden md:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-muted"
            aria-label="Scroll right"
          >
            →
          </button>
        </div>

        <div className="mt-4 h-px w-full bg-border" />

        {!loading && visible.length === 0 ? (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            No best selling products found.
          </div>
        ) : null}
      </div>

      {/* Login modal (same as NewArrivals) */}
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
