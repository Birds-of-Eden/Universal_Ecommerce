"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { cachedFetchJson } from "@/lib/client-cache-fetch";

type CategoryDTO = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  parentId: number | null;
  parentName: string | null;
  productCount: number;
  childrenCount: number;
};

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  const a = parts[0]?.[0] ?? "C";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function CardSkeletonRow({ count = 8 }: { count?: number }) {
  return (
    <div className="flex gap-3 sm:gap-4 min-w-max pb-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="snap-start
            w-[120px] h-[92px]
            sm:w-[140px] sm:h-[105px]
            lg:w-[150px] lg:h-[110px]
            rounded-2xl border border-border bg-muted/30 animate-pulse"
        />
      ))}
    </div>
  );
}

export default function FeaturedCategories({
  title = "Category",
  categoriesData,
}: {
  title?: string;
  categoriesData?: CategoryDTO[];
}) {
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<CategoryDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const data =
          categoriesData ??
          ((await cachedFetchJson<any>("/api/categories", {
            ttlMs: 5 * 60 * 1000,
          })) as any);
        if (!mounted) return;

        // supports both array and {data:[]}
        const list: CategoryDTO[] = Array.isArray(data) ? data : data?.data ?? [];
        setCats(Array.isArray(list) ? list : []);
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
  }, [categoriesData]);

  // ✅ top 7 parent categories
  const top7 = useMemo(() => {
    const filtered = cats.filter((c) => c.parentId === null);

    filtered.sort((a, b) => {
      // image first
      const ai = a.image ? 1 : 0;
      const bi = b.image ? 1 : 0;
      if (bi !== ai) return bi - ai;

      // more products first
      if ((b.productCount ?? 0) !== (a.productCount ?? 0)) {
        return (b.productCount ?? 0) - (a.productCount ?? 0);
      }
      return (b.id ?? 0) - (a.id ?? 0);
    });

    return filtered.slice(0, 7);
  }, [cats]);

  return (
    <section className="w-full bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Title (screenshot like) */}
        <div className="mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            {title}
          </h2>
        </div>

        {error ? (
          <div className="mb-3 rounded-xl border border-border bg-background p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {/* Horizontal scroll row */}
        <div className="w-full overflow-x-auto no-scrollbar">
          <div
            ref={scrollerRef}
            className="flex gap-3 sm:gap-4 pb-3 min-w-max scroll-smooth
              snap-x snap-mandatory"
            style={{ scrollbarWidth: "none" }}
          >
            {loading ? (
              <CardSkeletonRow count={8} />
            ) : (
              <>
                {/* ✅ All */}
                <Link
                  href="/ecommerce/categories"
                  className="
                    snap-start
                    w-[120px] h-[92px]
                    sm:w-[140px] sm:h-[105px]
                    lg:w-[150px] lg:h-[110px]
                    rounded-2xl border border-border bg-card
                    shadow-sm hover:shadow-md transition
                    flex flex-col items-center justify-center gap-2
                  "
                  title="All"
                >
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-muted/40 border border-border/60 grid place-items-center">
                    <LayoutGrid className="h-5 w-5 text-foreground/80" />
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-foreground">
                    All
                  </div>
                </Link>

                {/* ✅ top 7 */}
                {top7.map((c) => (
                  <Link
                    key={c.id}
                    href={`/ecommerce/categories/${c.slug}`}
                    className="
                      snap-start
                      w-[120px] h-[92px]
                      sm:w-[140px] sm:h-[105px]
                      lg:w-[150px] lg:h-[110px]
                      rounded-2xl border border-border bg-card
                      shadow-sm hover:shadow-md transition
                      flex flex-col items-center justify-center
                      gap-2
                    "
                    title={c.name}
                  >
                    <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-muted/30 border border-border/60 overflow-hidden grid place-items-center">
                      {c.image ? (
                        <Image
                          src={c.image}
                          alt={c.name}
                          fill
                          className="object-contain p-2"
                          sizes="48px"
                        />
                      ) : (
                        <span className="text-xs font-bold text-foreground/80">
                          {getInitials(c.name)}
                        </span>
                      )}
                    </div>

                    <div className="px-2 text-center text-[11px] sm:text-xs font-semibold text-foreground line-clamp-1">
                      {c.name}
                    </div>
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>

        {/* bottom line like screenshot */}
        <div className="h-px w-full bg-border" />
      </div>
    </section>
  );
}
