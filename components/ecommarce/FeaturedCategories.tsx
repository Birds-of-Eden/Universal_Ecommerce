"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, LayoutGrid } from "lucide-react";
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
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getInitials(name: string) {
  const parts = name.trim().split(" ").filter(Boolean);
  const a = parts[0]?.[0] ?? "C";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function getCardTheme(index: number) {
  const themes = [
    "from-sky-100/95 via-cyan-50/90 to-blue-100/95",
    "from-lime-100/95 via-green-50/90 to-emerald-100/95",
    "from-orange-100/95 via-amber-50/90 to-yellow-100/95",
    "from-pink-100/95 via-rose-50/90 to-fuchsia-100/95",
    "from-violet-100/95 via-purple-50/90 to-indigo-100/95",
    "from-teal-100/95 via-cyan-50/90 to-sky-100/95",
    "from-slate-100/95 via-zinc-50/90 to-stone-100/95",
    "from-red-100/95 via-orange-50/90 to-amber-100/95",
  ];

  return themes[index % themes.length];
}

function CategoryCardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div className="min-h-[320px] animate-pulse rounded-[32px] bg-muted/40 sm:col-span-2 xl:row-span-2 xl:min-h-[460px]" />

      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="min-h-[220px] animate-pulse rounded-[28px] bg-muted/40"
        />
      ))}
    </div>
  );
}

function CategoryBackgroundImage({
  src,
  alt,
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("absolute inset-0", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        className="scale-[1.02] object-cover object-center transition-transform duration-700 group-hover:scale-110"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
      />
    </div>
  );
}

export default function FeaturedCategories({
  title = "Shop by Category",
  categoriesData,
}: {
  title?: string;
  categoriesData?: CategoryDTO[];
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

        const data =
          categoriesData ??
          ((await cachedFetchJson<any>("/api/categories", {
            ttlMs: 5 * 60 * 1000,
          })) as any);

        if (!mounted) return;

        const list: CategoryDTO[] = Array.isArray(data)
          ? data
          : (data?.data ?? []);

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

  const firstParentCategories = useMemo(() => {
    return cats
      .filter((item) => item.parentId === null && !item.deleted)
      .slice(0, 5);
  }, [cats]);

  const featuredCategory = firstParentCategories[0];
  const regularCategories = firstParentCategories.slice(1, 5);

  return (
    <section className="w-full bg-background">
      <div className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="mb-2 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              Categories
            </span>
            <div className="flex justify-between">
              <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl lg:text-4xl">
                {title}
              </h2>

              <Link
                href="/ecommerce/categories"
                className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-bold text-primary transition-all duration-300 hover:bg-primary hover:text-primary-foreground"
              >
                See All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : loading ? (
          <CategoryCardSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featuredCategory && (
              <Link
                key={featuredCategory.id}
                href={`/ecommerce/categories?slug=${featuredCategory.slug}`}
                className={cn(
                  "group relative min-h-[200px] sm:min-h-[320px] overflow-hidden rounded-[20px] sm:rounded-[32px] border border-primary/15",
                  "bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.22),transparent_34%),linear-gradient(135deg,#f7fff7_0%,#ecfdf5_45%,#ffffff_100%)]",
                  "shadow-[0_18px_50px_rgba(22,163,74,0.12)] transition-all duration-500",
                  "hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(22,163,74,0.18)]",
                  "col-span-2 sm:col-span-2 xl:row-span-2 xl:min-h-[460px]",
                )}
              >
                {featuredCategory.image ? (
                  <>
                    <CategoryBackgroundImage
                      src={featuredCategory.image}
                      alt={featuredCategory.name}
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-black/5 to-black/35" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-white/20" />
                  </>
                ) : (
                  <div
                    className={cn(
                      "absolute inset-0 bg-gradient-to-br",
                      getCardTheme(0),
                    )}
                  />
                )}

                <div className="relative flex h-full flex-col justify-between p-3 sm:p-5 lg:p-8">
                  <div className="space-y-5">
                    <span className="inline-flex w-fit items-center gap-1.5 sm:gap-2 rounded-full border border-primary/15 bg-white/80 px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.18em] text-primary shadow-sm backdrop-blur">
                      <LayoutGrid className="h-3 w-3 sm:h-4 sm:w-4" />
                      Featured
                    </span>

                    <div className="max-w-xl">
                      <h3 className="text-xl sm:text-3xl font-black leading-[1.05] tracking-tight text-foreground lg:text-5xl">
                        {featuredCategory.name}
                      </h3>

                      <p className="mt-2 sm:mt-4 max-w-md text-[11px] sm:text-sm leading-5 sm:leading-6 text-muted-foreground">
                        {featuredCategory.productCount} products available
                      </p>
                    </div>
                  </div>

                  <div className="ml-auto inline-flex w-fit items-center gap-1.5 sm:gap-2 rounded-full bg-primary px-3 sm:px-5 py-2 sm:py-3 text-[11px] sm:text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all duration-300 group-hover:translate-x-1">
                    Browse Now
                    <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                </div>
              </Link>
            )}
            {regularCategories.map((category, index) => (
              <Link
                key={category.id}
                href={`/ecommerce/categories?slug=${category.slug}`}
                className={cn(
                  "group relative min-h-[160px] sm:min-h-[220px] overflow-hidden rounded-[20px] sm:rounded-[28px] border border-border/60",
                  "shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-lg",
                  "col-span-1 sm:col-span-1 lg:col-span-1",
                )}
              >
                {category.image ? (
                  <>
                    <CategoryBackgroundImage
                      src={category.image}
                      alt={category.name}
                      priority={index < 2}
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-black/10 via-black/5 to-black/35" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-white/20" />
                  </>
                ) : (
                  <div
                    className={cn(
                      "absolute inset-0 bg-gradient-to-br",
                      getCardTheme(index + 1),
                    )}
                  />
                )}

                <div className="relative flex h-full flex-col justify-between p-3 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="line-clamp-1 max-w-[80%] rounded-full bg-white/90 px-2 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-sm font-black text-foreground shadow-sm backdrop-blur">
                      {category.name}
                    </span>

                    <span className="rounded-full bg-white/80 p-1.5 sm:p-2 shadow-sm backdrop-blur">
                      <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </span>
                  </div>

                  {!category.image && (
                    <div className="ml-auto grid h-14 w-14 sm:h-20 sm:w-20 place-items-center rounded-2xl sm:rounded-3xl border border-white/60 bg-white/55 text-xl sm:text-2xl font-black text-foreground/80 shadow-sm backdrop-blur">
                      {getInitials(category.name)}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
