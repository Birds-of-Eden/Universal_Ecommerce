"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";

type Product = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  basePrice: any; // Decimal string from API sometimes
  originalPrice: any | null;
  currency: string;
  ratingAvg?: number;
  ratingCount?: number;
  featured?: boolean;
  soldCount?: number;
  variants?: { price: any }[];
};

function toNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatBDT(n: number) {
  // you can improve locale later
  return `৳${n.toLocaleString("en-US")}`;
}

function getFinalPrice(p: Product) {
  // priority: basePrice -> first variant price -> 0
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

function ProductRow({
  p,
  showBadge = true,
}: {
  p: Product;
  showBadge?: boolean;
}) {
  const price = getFinalPrice(p);
  const original = getOriginalPrice(p);
  const discount = getDiscountPercent(p);
  const ratingAvg = toNumber(p.ratingAvg ?? 0);
  const ratingCount = Number(p.ratingCount ?? 0);

  return (
    <Link
      href={`/kitabghor/products/${p.id}`}
      className="
        group relative flex gap-3 items-start
        rounded-xl border border-border bg-background
        p-3 shadow-sm hover:shadow-md transition
      "
      title={p.name}
    >
      {/* discount badge */}
      {showBadge && discount > 0 && (
        <span className="absolute left-2 top-2 z-10 rounded-md bg-destructive px-2 py-0.5 text-[11px] font-semibold text-destructive-foreground">
          {discount}% OFF
        </span>
      )}

      {/* image */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
        <Image
          src={p.image || "/placeholder.svg"}
          alt={p.name}
          fill
          className="object-contain p-1 transition-transform duration-300 group-hover:scale-[1.03]"
          sizes="64px"
        />
      </div>

      {/* info */}
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-sm font-semibold text-foreground">
          {p.name}
        </div>

        {/* rating */}
        <div className="mt-1 flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => {
              const filled = ratingAvg >= i + 1;
              return (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    filled ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
                  }`}
                />
              );
            })}
          </div>
          <span className="text-[11px] text-muted-foreground">
            ({ratingCount} reviews)
          </span>
        </div>

        {/* price */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-base font-extrabold text-destructive">
            {formatBDT(price)}
          </span>

          {original > 0 && original > price && (
            <span className="text-xs text-muted-foreground line-through">
              {formatBDT(original)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function Column({
  title,
  icon,
  items,
  loading,
}: {
  title: string;
  icon: React.ReactNode;
  items: Product[];
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="text-primary">{icon}</span>
        <h3 className="font-bold text-foreground">{title}</h3>
      </div>

      <div className="p-3 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-muted/40 p-3 animate-pulse"
            >
              <div className="flex gap-3">
                <div className="h-16 w-16 rounded-lg bg-muted" />
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
          items.map((p) => <ProductRow key={p.id} p={p} />)
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

        // Latest = newest id desc (API already returns id desc কিন্তু safe)
        const latestSorted = [...list].sort((a, b) => Number(b.id) - Number(a.id));

        // Featured = featured true
        const featuredOnly = list.filter((p) => !!p.featured);

        setLatest(latestSorted.slice(0, latestLimit));
        setFeatured(featuredOnly.slice(0, featuredLimit));
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

  // ensure latest doesn't accidentally include deleted or unavailable (your API already filters deleted only)
  const latestSafe = useMemo(() => latest.filter(Boolean), [latest]);

  return (
    <section className="w-full">
      <div className="container mx-auto px-4">
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
            title="Best Sellers"
            icon={<span className="text-lg">🏆</span>}
            items={best}
            loading={loadingBest}
          />
        </div>
      </div>
    </section>
  );
}