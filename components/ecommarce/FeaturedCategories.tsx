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
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 auto-rows-[220px]">
      <div className="rounded-[28px] bg-muted/40 animate-pulse xl:col-span-2 xl:row-span-2 min-h-[280px] xl:min-h-full" />
      <div className="rounded-[28px] bg-muted/40 animate-pulse sm:col-span-2 xl:col-span-2" />
      <div className="rounded-[28px] bg-muted/40 animate-pulse sm:col-span-2 xl:col-span-2" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[28px] bg-muted/40 animate-pulse min-h-[220px]"
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
        className="object-cover object-center scale-[1.02] transition-transform duration-500 group-hover:scale-105"
        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
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

  const first8ParentCategories = useMemo(() => {
    return cats
      .filter((item) => item.parentId === null && !item.deleted)
      .slice(0, 6);
  }, [cats]);

  const featuredCategories = first8ParentCategories.slice(0, 2);
  const regularCategories = first8ParentCategories.slice(2, 6);

  return (
    <section className="w-full bg-background">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            {title}
          </h2>

          <Link
            href="/ecommerce/categories"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline underline-offset-4"
          >
            See All
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : loading ? (
          <CategoryCardSkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 auto-rows-[220px]">
            {/* All Products */}
            <Link
              href="/ecommerce/categories"
              className={cn(
                "group relative overflow-hidden rounded-[28px] border border-border/60",
                "bg-gradient-to-br from-sky-100 via-cyan-50 to-blue-100",
                "shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                "xl:col-span-2 xl:row-span-2 min-h-[280px] xl:min-h-full",
              )}
            >
              <div className="absolute inset-0">
                <div className="absolute -top-10 -left-8 h-40 w-40 rounded-full bg-white/40 blur-3xl" />
                <div className="absolute -bottom-10 right-0 h-52 w-52 rounded-full bg-cyan-200/40 blur-3xl" />
              </div>

              <div className="relative flex h-full flex-col justify-between p-6 md:p-8">
                <div className="space-y-4">
                  <span className="inline-flex w-fit rounded-full bg-white/85 px-3 py-1 text-sm font-semibold text-foreground shadow-sm backdrop-blur">
                    All Products
                  </span>

                  <div className="max-w-lg">
                    <h3 className="text-2xl md:text-4xl font-black leading-tight text-foreground">
                      Explore all categories in one place
                    </h3>
                    <p className="mt-2 text-sm md:text-base text-foreground/70">
                      Find grocery, electronics, healthy food, home care, and
                      more.
                    </p>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur">
                    <LayoutGrid className="h-7 w-7 text-foreground" />
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-transform duration-300 group-hover:translate-x-1">
                    Browse Now
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </Link>

            {/* 2 big cards */}
            {featuredCategories.map((category, index) => (
              <Link
                key={category.id}
                href={`/ecommerce/categories/${category.slug}`}
                className={cn(
                  "group relative overflow-hidden rounded-[28px] border border-border/60",
                  "shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
                  "sm:col-span-2 xl:col-span-2",
                )}
              >
                {category.image ? (
                  <>
                    <CategoryBackgroundImage
                      src={category.image}
                      alt={category.name}
                      priority={index < 2}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-white/72 via-white/38 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/8 via-transparent to-black/5" />
                  </>
                ) : (
                  <div
                    className={cn(
                      "absolute inset-0 bg-gradient-to-br",
                      getCardTheme(index + 1),
                    )}
                  />
                )}

                <div className="relative flex h-full flex-col justify-between p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex rounded-md bg-primary/90 px-3 py-1.5 text-base md:text-lg font-bold text-primary-foreground shadow-sm backdrop-blur">
                      {category.name}
                    </span>

                    <span className="rounded-full bg-white/65 p-2 backdrop-blur shadow-sm">
                      <ArrowUpRight className="h-4 w-4 text-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </span>
                  </div>

                  {!category.image && (
                    <div className="absolute right-5 bottom-5 grid h-24 w-24 place-items-center rounded-3xl border border-white/60 bg-white/55 text-2xl font-black text-foreground/80 shadow-sm backdrop-blur">
                      {getInitials(category.name)}
                    </div>
                  )}
                </div>
              </Link>
            ))}

            {/* Remaining 6 cards */}
            {regularCategories.map((category, index) => (
              <Link
                key={category.id}
                href={`/ecommerce/categories/${category.slug}`}
                className={cn(
                  "group relative overflow-hidden rounded-[28px] border border-border/60",
                  "shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
                )}
              >
                {category.image ? (
                  <>
                    <CategoryBackgroundImage
                      src={category.image}
                      alt={category.name}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-white/58 via-white/20 to-white/12" />
                  </>
                ) : (
                  <div
                    className={cn(
                      "absolute inset-0 bg-gradient-to-br",
                      getCardTheme(index + 3),
                    )}
                  />
                )}

                <div className="relative flex h-full flex-col justify-between p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex max-w-[82%] rounded-md bg-primary/90 px-3 py-1.5 text-base font-bold text-primary-foreground shadow-sm backdrop-blur line-clamp-1">
                      {category.name}
                    </span>

                    <span className="rounded-full bg-white/65 p-2 backdrop-blur shadow-sm">
                      <ArrowUpRight className="h-4 w-4 text-foreground/80 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </span>
                  </div>

                  {!category.image && (
                    <div className="ml-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/60 bg-white/55 text-sm font-bold text-foreground/80 shadow-sm backdrop-blur">
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
