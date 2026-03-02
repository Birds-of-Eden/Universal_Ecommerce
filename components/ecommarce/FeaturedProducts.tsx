"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Heart } from "lucide-react";
import AddToCartButton from "@/components/ecommarce/AddToCartButton";
import { useWishlist } from "@/components/ecommarce/WishlistContext";

type ProductDTO = {
  id: number | string;
  name: string;
  slug: string;
  image: string | null;
  basePrice: number;
  originalPrice: number | null;
  currency: string;
  featured: boolean;
};

function formatBDT(n: number) {
  return `${Math.round(n).toLocaleString("en-US")}৳`;
}

function calcSave(original: number, price: number) {
  const diff = Math.max(0, original - price);
  const pct = original > 0 ? Math.round((diff / original) * 100) : 0;
  return { diff, pct };
}

function getSaveBadge(p: ProductDTO) {
  if (!p.originalPrice || p.originalPrice <= p.basePrice) return null;
  const { diff, pct } = calcSave(p.originalPrice, p.basePrice);
  return `Save: ${formatBDT(diff)} (-${pct}%)`;
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

  // Wishlist functionality
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

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
          ? data.map((p) => ({
              id: p.id,
              name: String(p.name ?? ""),
              slug: String(p.slug ?? ""),
              image: p.image ?? null,
              basePrice: Number(p.basePrice ?? 0),
              originalPrice:
                p.originalPrice !== null && p.originalPrice !== undefined
                  ? Number(p.originalPrice)
                  : null,
              currency: String(p.currency ?? "BDT"),
              featured: Boolean(p.featured),
            }))
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

  // ✅ only featured
  const featured = useMemo(() => {
    const list = items.filter((p) => p.featured);

    // prioritize: discounted first, then latest id
    list.sort((a, b) => {
      const ad = a.originalPrice && a.originalPrice > a.basePrice ? 1 : 0;
      const bd = b.originalPrice && b.originalPrice > b.basePrice ? 1 : 0;
      if (bd !== ad) return bd - ad;

      const ai = typeof a.id === "number" ? a.id : Number(a.id) || 0;
      const bi = typeof b.id === "number" ? b.id : Number(b.id) || 0;
      return bi - ai;
    });

    return list.slice(0, limit);
  }, [items, limit]);

  return (
    <section className="w-full">
      <div className="container mx-auto px-4">
        {/* Heading */}
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

        {/* Grid */}
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
                const badge = getSaveBadge(p);
                const hasDiscount =
                  p.originalPrice !== null && p.originalPrice > p.basePrice;
                const isWishlisted = isInWishlist(p.id);

                return (
                  <div
                    key={p.id}
                    className="
                      group relative rounded-xl border border-border bg-background
                      overflow-hidden shadow-sm hover:shadow-md
                      transition-all
                    "
                  >
                    {/* ✅ Badge only if discounted */}
                    {badge && (
                      <div className="absolute left-0 top-0 z-10">
                        <span
                          className="
                            inline-flex items-center
                            h-6 px-2 text-[11px] font-semibold
                            text-white bg-purple-700
                            rounded-br-xl
                          "
                        >
                          {badge}
                        </span>
                      </div>
                    )}

                    {/* Wishlist button */}
                    <button
                      onClick={() => {
                        if (isWishlisted) {
                          removeFromWishlist(p.id);
                        } else {
                          addToWishlist(p.id);
                        }
                      }}
                      className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center transition-all hover:scale-110"
                      title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <Heart 
                        className={`h-4 w-4 transition-colors ${
                          isWishlisted 
                            ? "fill-red-500 text-red-500" 
                            : "text-muted-foreground hover:text-red-500"
                        }`}
                      />
                    </button>

                    <Link
                      href={`/kitabghor/products/${p.id}`}
                      className="block"
                      title={p.name}
                    >
                      {/* Image */}
                      <div className="relative w-full h-[180px] sm:h-[200px] bg-white">
                        {p.image ? (
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            className="object-contain p-4"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-sm text-muted-foreground">
                            No Image
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="border-t border-border p-3 sm:p-4">
                        <div className="text-sm sm:text-[13px] font-medium text-foreground line-clamp-2 min-h-[40px]">
                          {p.name}
                        </div>

                        <div className="mt-3 flex items-end gap-2">
                          <div className="text-red-600 font-bold text-base">
                            {formatBDT(p.basePrice)}
                          </div>

                          {hasDiscount && (
                            <div className="text-xs text-muted-foreground line-through">
                              {formatBDT(p.originalPrice!)}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>

                    <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                      <div className="grid grid-cols-2 gap-2">
                        <AddToCartButton
                          productId={p.id}
                          className="h-10 w-full rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 transition disabled:opacity-50"
                        />
                        <Link
                          href={`/kitabghor/products/${p.id}`}
                          className="h-10 w-full inline-flex items-center justify-center rounded-lg border border-border bg-background text-foreground text-sm font-semibold hover:bg-muted transition"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
        </div>

        {!loading && featured.length === 0 ? (
          <div className="mt-6 text-center text-sm text-muted-foreground">
            No featured products found.
          </div>
        ) : null}
      </div>
    </section>
  );
}