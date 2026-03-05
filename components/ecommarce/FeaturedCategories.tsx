"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { LayoutGrid } from "lucide-react";

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

// ✅ gradient palette
const CARD_STYLES = [
  "from-emerald-500/25 to-emerald-500/5 border-emerald-500/20",
  "from-orange-500/25 to-orange-500/5 border-orange-500/20",
  "from-rose-500/25 to-rose-500/5 border-rose-500/20",
  "from-lime-500/25 to-lime-500/5 border-lime-500/20",
  "from-fuchsia-500/25 to-fuchsia-500/5 border-fuchsia-500/20",
  "from-sky-500/25 to-sky-500/5 border-sky-500/20",
  "from-violet-500/25 to-violet-500/5 border-violet-500/20",
  "from-amber-500/25 to-amber-500/5 border-amber-500/20",
];

// ✅ All Category card style (neutral)
const ALL_CARD_STYLE =
  "from-slate-500/15 to-slate-500/5 border-slate-500/20";

function CardSkeletonRow({ count = 8 }: { count?: number }) {
  return (
    <div className="flex gap-4 min-w-max pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-[170px] sm:w-[190px] h-[140px] rounded-2xl border border-border bg-muted/30 animate-pulse"
        />
      ))}
    </div>
  );
}

export default function FeaturedCategories({
  title = "Shop Our Top Categories",
}: {
  title?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<CategoryDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/categories", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load categories");

        const data = (await res.json()) as CategoryDTO[];
        if (!mounted) return;

        setCats(Array.isArray(data) ? data : []);
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

  // ✅ only show 7 category cards (parent only)
  const top7 = useMemo(() => {
    const filtered = cats.filter((c) => c.parentId === null);

    filtered.sort((a, b) => {
      const ai = a.image ? 1 : 0;
      const bi = b.image ? 1 : 0;
      if (bi !== ai) return bi - ai;

      if ((b.productCount ?? 0) !== (a.productCount ?? 0)) {
        return (b.productCount ?? 0) - (a.productCount ?? 0);
      }

      return (b.id ?? 0) - (a.id ?? 0);
    });

    return filtered.slice(0, 7);
  }, [cats]);

  return (
    <section className="w-full">
      <div className="w-full px-4 sm:px-6">
        {/* Title */}
        <div className="mb-3 sm:mb-4">
          <h2 className="text-sm sm:text-base font-semibold text-foreground">
            {title}
          </h2>
        </div>

        {error ? (
          <div className="mb-3 rounded-xl border border-border bg-background p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {/* Horizontal cards */}
        <div className="w-full overflow-x-auto no-scrollbar">
          <div className="min-w-max">
            {loading ? (
              <CardSkeletonRow count={8} />
            ) : (
              <div className="flex gap-4 pb-2">
                {/* ✅ 7 categories */}
                {top7.map((c, idx) => {
                  const name = c.name;
                  const style = CARD_STYLES[idx % CARD_STYLES.length];

                  return (
                    <Link
                      key={c.id}
                      href={`/ecommerce/categories/${c.slug}`}
                      className={[
                        "group relative w-[170px] sm:w-[190px] h-[140px]",
                        "rounded-2xl border bg-gradient-to-br",
                        style,
                        "shadow-sm hover:shadow-md transition",
                        "hover:-translate-y-[1px]",
                        "overflow-hidden",
                      ].join(" ")}
                      title={name}
                    >
                      {/* Label */}
                      <div className="absolute left-4 top-4 right-4">
                        <div className="text-sm font-bold text-foreground/90 line-clamp-1">
                          {name}
                        </div>
                      </div>

                      {/* Image bottom */}
                      <div className="absolute inset-x-0 bottom-0 h-[86px]">
                        {c.image ? (
                          <div className="absolute right-2 bottom-2 h-[78px] w-[110px]">
                            <Image
                              src={c.image}
                              alt={name}
                              fill
                              className="object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-[1.03]"
                              sizes="120px"
                            />
                          </div>
                        ) : (
                          <div className="absolute right-3 bottom-3 h-14 w-14 rounded-2xl bg-background/60 border border-border flex items-center justify-center text-xs font-bold text-foreground/80">
                            {getInitials(name)}
                          </div>
                        )}

                        <div className="absolute -left-10 -bottom-10 h-28 w-28 rounded-full bg-white/25 blur-2xl pointer-events-none" />
                      </div>

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.02] transition pointer-events-none" />
                    </Link>
                  );
                })}

                {/* ✅ All Category card (shows rest on /ecommerce/categories) */}
                <Link
                  href="/ecommerce/categories"
                  className={[
                    "group relative w-[170px] sm:w-[190px] h-[140px]",
                    "rounded-2xl border bg-gradient-to-br",
                    ALL_CARD_STYLE,
                    "shadow-sm hover:shadow-md transition",
                    "hover:-translate-y-[1px]",
                    "overflow-hidden",
                    "flex flex-col items-center justify-center gap-2",
                  ].join(" ")}
                  title="All Category"
                >
                  <div className="h-12 w-12 rounded-2xl bg-background/70 border border-border grid place-items-center">
                    <LayoutGrid className="h-6 w-6 text-foreground/80" />
                  </div>
                  <div className="text-sm font-bold text-foreground/90">
                    All Category
                  </div>
                  <div className="text-xs text-muted-foreground">
                    View all categories
                  </div>

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/[0.02] transition pointer-events-none" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}