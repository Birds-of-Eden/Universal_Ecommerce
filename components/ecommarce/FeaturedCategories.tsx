"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

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

function getDisplayName(c: CategoryDTO) {
  // ✅ parent category name priority (user requirement)
  return (c.parentName?.trim() ? c.parentName : c.name) ?? "Category";
}

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  const a = parts[0]?.[0] ?? "C";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

export default function FeaturedCategories({
  title = "Featured Category",
  subtitle = "Get Your Desired Product from Featured Category!",
  limit = 16,
  onlyTopLevel = false, // true দিলে শুধু parent categories দেখাবে
}: {
  title?: string;
  subtitle?: string;
  limit?: number;
  onlyTopLevel?: boolean;
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

  const featured = useMemo(() => {
    const list = [...cats];

    // optional filter: only top-level (parentId null)
    const filtered = onlyTopLevel ? list.filter((c) => c.parentId === null) : list;

    // prioritize: have image first, then productCount, then latest id
    filtered.sort((a, b) => {
      const ai = a.image ? 1 : 0;
      const bi = b.image ? 1 : 0;
      if (bi !== ai) return bi - ai;
      if ((b.productCount ?? 0) !== (a.productCount ?? 0))
        return (b.productCount ?? 0) - (a.productCount ?? 0);
      return (b.id ?? 0) - (a.id ?? 0);
    });

    return filtered.slice(0, limit);
  }, [cats, limit, onlyTopLevel]);

  return (
    <section className="w-full">
      <div className="container mx-auto px-4">
        {/* Heading */}
        <div className="text-center mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{title}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>

        {/* States */}
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
            lg:grid-cols-6
            xl:grid-cols-8
          "
        >
          {loading
            ? Array.from({ length: Math.min(limit, 16) }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-background p-4 sm:p-5"
                >
                  <div className="mx-auto h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-muted animate-pulse" />
                  <div className="mt-3 h-3 w-3/4 mx-auto rounded bg-muted animate-pulse" />
                </div>
              ))
            : featured.map((c) => {
                const name = getDisplayName(c);
                return (
                  <Link
                    key={c.id}
                    href={`/kitabghor/categories/${c.slug}`}
                    className="
                      group rounded-2xl border border-border bg-background
                      p-4 sm:p-5 text-center shadow-sm
                      hover:shadow-md hover:-translate-y-[1px]
                      transition-all
                    "
                    title={name}
                  >
                    <div className="mx-auto relative h-10 w-10 sm:h-12 sm:w-12">
                      {c.image ? (
                        <Image
                          src={c.image}
                          alt={name}
                          fill
                          className="object-contain"
                          sizes="48px"
                        />
                      ) : (
                        <div className="h-full w-full rounded-xl bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                          {getInitials(name)}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 text-[11px] sm:text-xs font-medium text-foreground line-clamp-1">
                      {name}
                    </div>

                    {/* optional badge */}
                    <div className="mt-2 text-[10px] text-muted-foreground">
                      {c.productCount ?? 0} items
                    </div>
                  </Link>
                );
              })}
        </div>
      </div>
    </section>
  );
}