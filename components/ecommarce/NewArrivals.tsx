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

import ProductCardCompact from "./ProductCard"

type Category = {
  id: number | string;
  name: string;
  slug?: string;
};

type ApiVariant = {
  stock?: number | string | null;
  price?: number | string | null;
};

type ProductDTO = {
  id: number | string;
  name: string;
  slug: string;
  image: string | null;
  categoryId: number;
  basePrice: number;
  originalPrice: number | null;
  currency: string;
  createdAt: string;
  variants?: ApiVariant[] | null;
  stock: number;
};

type ReviewDTO = {
  id?: number | string;
  productId: number | string;
  rating: number | string;
  comment?: string | null;
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

export default function NewArrivals({
  title = "New Arrivals",
  subtitle = "Check Our Latest Products",
  limit = 20,
  productsData,
  categoriesData,
  reviewsData,
  isAuthenticated = false,
}: {
  title?: string;
  subtitle?: string;
  limit?: number;
  productsData?: any[];
  categoriesData?: any[];
  reviewsData?: any[];
  isAuthenticated?: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProductDTO[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reviews, setReviews] = useState<ReviewDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [active, setActive] = useState<"ALL" | number>("ALL");
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

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

        const pData =
          productsData ??
          (await cachedFetchJson<any>("/api/products", { ttlMs: 2 * 60 * 1000 }));
        const cData =
          categoriesData ??
          (await cachedFetchJson<any>("/api/categories", { ttlMs: 5 * 60 * 1000 }));
        const rData =
          reviewsData ??
          (await cachedFetchJson<any>("/api/reviews", { ttlMs: 60 * 1000 }));

        if (!mounted) return;

        const pList: any[] = Array.isArray(pData) ? pData : pData?.data ?? [];
        const cList: any[] = Array.isArray(cData) ? cData : cData?.data ?? [];
        const rList = normalizeReviewsPayload(rData);

        const mappedCats: Category[] = cList.map((c) => ({
          id: c.id,
          name: String(c.name ?? ""),
          slug: c.slug ? String(c.slug) : undefined,
        }));

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
            categoryId: toNumber(p?.categoryId, 0),
            basePrice,
            originalPrice,
            currency: String(p.currency ?? "BDT"),
            createdAt: String(p.createdAt ?? ""),
            variants,
            stock,
          };
        });

        const mappedReviews: ReviewDTO[] = rList.map((r) => ({
          id: r.id,
          productId: r.productId,
          rating: r.rating,
          comment: r.comment ?? null,
          createdAt: r.createdAt,
        }));

        setCategories(mappedCats);
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
  }, [productsData, categoriesData, reviewsData]);

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

  const topTabs = useMemo(() => {
    const sorted = [...categories].sort((a, b) =>
      String(a.name).localeCompare(String(b.name), "en", { sensitivity: "base" })
    );
    return sorted.slice(0, 3);
  }, [categories]);

  const latestSorted = useMemo(() => {
    const list = [...items];
    list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return list;
  }, [items]);

  const filtered = useMemo(() => {
    if (active === "ALL") return latestSorted;
    return latestSorted.filter((p) => p.categoryId === active);
  }, [latestSorted, active]);

  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);

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

  useEffect(() => {
    scrollerRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [active]);

  return (
    <section className="w-full bg-background">
      {/* ✅ responsive padding */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* ✅ responsive header: wrap */}
       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">
              {title}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
              {subtitle}
            </p>
          </div>

          {/* ✅ Tabs (ALL + 4 categories) */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <button
              onClick={() => setActive("ALL")}
              className={`uppercase tracking-wide ${
                active === "ALL"
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              ALL
            </button>

            {topTabs.map((c) => (
              <button
                key={String(c.id)}
                onClick={() => setActive(Number(c.id))}
                className={`capitalize ${
                  active === Number(c.id)
                    ? "text-primary font-semibold"
                    : "text-muted-foreground"
                }`}
              >
                {String(c.name).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-border bg-background p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="relative mt-5 sm:mt-6">
          {/* arrows: tablet/desktop only */}
          <button
            onClick={() => scrollByCards("left")}
            className="hidden md:flex absolute -left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full border border-border bg-card shadow-sm hover:bg-muted"
            aria-label="Scroll left"
          >
            ←
          </button>

          {/* ✅ mobile snap scroll */}
          <div
            ref={scrollerRef}
            className="
              flex gap-4 sm:gap-6
              overflow-x-auto scroll-smooth pb-4
              snap-x snap-mandatory
            "
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
      </div>

      {/* login modal */}
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
