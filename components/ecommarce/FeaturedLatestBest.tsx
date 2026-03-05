"use client";

import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

type Product = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  basePrice: any;
  originalPrice: any | null;
  currency: string;
  ratingAvg?: number;
  ratingCount?: number;
  featured?: boolean;
  soldCount?: number;
  totalSold?: number;
  rank?: number;
  variants?: { price: any }[];
  writer?: { name: string } | null;
  publisher?: { name: string } | null;
  category?: { name: string } | null;
  brand?: { name: string } | null;
};

function toNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatBDT(n: number) {
  return `৳${Math.round(n).toLocaleString("en-US")}`;
}

function getFinalPrice(p: Product) {
  return toNumber(p.basePrice ?? p.variants?.[0]?.price ?? 0);
}

function getOriginalPrice(p: Product) {
  return toNumber(p.originalPrice ?? 0);
}

function getDiscountPercent(p: Product) {
  const now = getFinalPrice(p);
  const old = getOriginalPrice(p);
  if (!old || old <= now) return 0;
  return Math.round(((old - now) / old) * 100);
}

/* ===================== Row (new arrivals style list) ===================== */
function ProductRow({
  p,
  showBadge = true,
  showSalesBadge = false,
}: {
  p: Product;
  showBadge?: boolean;
  showSalesBadge?: boolean;
}) {
  const price = getFinalPrice(p);
  const original = getOriginalPrice(p);
  const discount = getDiscountPercent(p);
  const ratingAvg = toNumber(p.ratingAvg ?? 0);
  const ratingCount = Number(p.ratingCount ?? 0);

  return (
    <Link
      href={`/ecommerce/products/${p.id}`}
      className={cn(
        "group relative flex gap-3 items-start",
        "rounded-2xl border border-border bg-card",
        "p-3 shadow-sm hover:shadow-md transition"
      )}
      title={p.name}
    >
      {/* discount badge */}
      {showBadge && discount > 0 ? (
        <span className="absolute left-2 top-2 z-10 rounded-md bg-orange-500 px-2 py-0.5 text-[11px] font-semibold text-white">
          {discount}%
        </span>
      ) : null}

      {/* sales rank badge */}
      {showSalesBadge && p.rank ? (
        <span className="absolute right-2 top-2 z-10 rounded-md bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white">
          #{p.rank}
        </span>
      ) : null}

      {/* image */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted/30">
        <Image
          src={p.image || "/placeholder.svg"}
          alt={p.name}
          fill
          className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
          sizes="64px"
        />
      </div>

      {/* info */}
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm font-semibold text-foreground">
          {p.name}
        </div>

        {/* best selling info */}
        {showSalesBadge && p.totalSold ? (
          <div className="mt-1 text-xs text-amber-600 font-medium">
            {p.totalSold} sold
          </div>
        ) : null}

        {/* rating */}
        <div className="mt-1 flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => {
              const filled = ratingAvg >= i + 1;
              return (
                <Star
                  key={i}
                  className={cn(
                    "h-3.5 w-3.5",
                    filled
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/50"
                  )}
                />
              );
            })}
          </div>
          <span className="text-[11px] text-muted-foreground">
            ({ratingCount})
          </span>
        </div>

        {/* price (vertical like your update request) */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex flex-col leading-tight">
            <span className="text-base font-extrabold text-foreground">
              {formatBDT(price)}
            </span>
            {original > 0 && original > price ? (
              <span className="mt-0.5 text-xs text-muted-foreground line-through">
                {formatBDT(original)}
              </span>
            ) : null}
          </div>

          <span className="text-xs text-muted-foreground group-hover:text-foreground transition">
            View
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ===================== Column ===================== */
function Column({
  title,
  icon,
  items,
  loading,
  showSalesBadge = false,
}: {
  title: string;
  icon: React.ReactNode;
  items: Product[];
  loading: boolean;
  showSalesBadge?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-9 w-9 rounded-xl border border-border bg-muted/30 grid place-items-center text-foreground">
            {icon}
          </span>
          <h3 className="font-bold text-foreground">{title}</h3>
        </div>

        <span className="text-xs text-muted-foreground">See all</span>
      </div>

      {/* body */}
      <div className="p-3 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-muted/30 p-3 animate-pulse"
            >
              <div className="flex gap-3">
                <div className="h-16 w-16 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-4/5 rounded bg-muted" />
                  <div className="h-3 w-2/5 rounded bg-muted" />
                  <div className="h-4 w-1/3 rounded bg-muted" />
                </div>
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground px-2 py-6 text-center">
            No products found
          </div>
        ) : (
          items.map((p) => (
            <ProductRow
              key={p.id}
              p={p}
              showSalesBadge={showSalesBadge}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function FeaturedLatestBest({
  featuredLimit = 4,
  latestLimit = 4,
  bestLimit = 4,
}: {
  featuredLimit?: number;
  latestLimit?: number;
  bestLimit?: number;
}) {
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingLatest, setLoadingLatest] = useState(true);
  const [loadingBest, setLoadingBest] = useState(true);

  const [featured, setFeatured] = useState<Product[]>([]);
  const [latest, setLatest] = useState<Product[]>([]);
  const [best, setBest] = useState<Product[]>([]);

  // 1) Featured + Latest from /api/products
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoadingFeatured(true);
        setLoadingLatest(true);

        const res = await fetch("/api/products", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load products");

        const data = (await res.json()) as Product[];
        if (!mounted) return;

        const list = Array.isArray(data) ? data : [];

        const latestSorted = [...list].sort((a, b) => Number(b.id) - Number(a.id));

        const featuredOnly = list.filter((p) => !!p.featured);
        const featuredRandom = shuffleInPlace([...featuredOnly]);

        setLatest(latestSorted.slice(0, latestLimit));
        setFeatured(featuredRandom.slice(0, featuredLimit));
      } catch (e) {
        if (!mounted) return;
        setFeatured([]);
        setLatest([]);
      } finally {
        if (!mounted) return;
        setLoadingFeatured(false);
        setLoadingLatest(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [featuredLimit, latestLimit]);

  // 2) Best sellers from /api/products/top-selling
  useEffect(() => {
    let mounted = true;

    const loadBest = async () => {
      try {
        setLoadingBest(true);
        const res = await fetch("/api/products/top-selling", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load best sellers");
        const data = (await res.json()) as Product[];
        if (!mounted) return;

        const list = Array.isArray(data) ? data : [];
        setBest(list.slice(0, bestLimit));
      } catch {
        if (!mounted) return;
        setBest([]);
      } finally {
        if (!mounted) return;
        setLoadingBest(false);
      }
    };

    loadBest();
    return () => {
      mounted = false;
    };
  }, [bestLimit]);

  const latestSafe = useMemo(() => latest.filter(Boolean), [latest]);

  return (
    <section className="w-full bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Column
            title="Featured Products"
            icon={<span className="text-lg">✦</span>}
            items={featured}
            loading={loadingFeatured}
          />
          <Column
            title="Latest Products"
            icon={<span className="text-lg">↗</span>}
            items={latestSafe}
            loading={loadingLatest}
          />
          <Column
            title="Best Selling"
            icon={<span className="text-lg">🏆</span>}
            items={best}
            loading={loadingBest}
            showSalesBadge={true}
          />
        </div>
      </div>
    </section>
  );
}