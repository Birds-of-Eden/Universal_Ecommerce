"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Heart, ShoppingCart, Check } from "lucide-react";

type AvailabilityKey = "in_stock" | "pre_order" | "up_coming";

interface CategoryPageProps {
  category: { id: number; name: string } | null;

  categoryProducts: Array<{
    id: number;
    name: string;
    image: string | null;
    price: number;
    original_price?: number | null;
    discount?: number;
    currencySymbol?: string;
    availability?: AvailabilityKey;
    stock?: number;
    specs?: string[];
    saveLabel?: string | null;
  }>;

  categoryCount: number | null;
  loading: boolean;
  error: string | null;

  toggleWishlist: (productId: number) => void;
  handleAddToCart: (product: any) => void;
  isInWishlist: (productId: number) => boolean;
}

function formatMoney(amount: number, currencySymbol = "৳") {
  const s = Math.round(amount).toString();
  let out = "";
  let c = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    out = s[i] + out;
    c++;
    if (c % 3 === 0 && i !== 0) out = "," + out;
  }
  return `${out}${currencySymbol}`; // 26,500৳
}

export default function CategoryPage({
  category,
  categoryProducts,
  categoryCount,
  loading,
  error,
  toggleWishlist,
  handleAddToCart,
  isInWishlist,
}: CategoryPageProps) {
  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-muted-foreground">ডাটা লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!category || error) {
    return (
      <div className="min-h-screen bg-background text-foreground py-16 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">ক্যাটাগরি পাওয়া যায়নি</h2>
          <p className="text-muted-foreground mb-6">
            আপনার অনুসন্ধানকৃত ক্যাটাগরি খুঁজে পাওয়া যায়নি
          </p>
          <Link href="/kitabghor/categories">
            <Button className="rounded-lg">সকল ক্যাটাগরি দেখুন</Button>
          </Link>
        </div>
      </div>
    );
  }

  // ✅ ALWAYS compute valid numeric prices
  const prices = useMemo(() => {
    return categoryProducts
      .map((p) => Number(p.price))
      .filter((n) => Number.isFinite(n) && n >= 0);
  }, [categoryProducts]);

  const computedMin = useMemo(() => (prices.length ? Math.min(...prices) : 0), [prices]);
  const computedMax = useMemo(() => (prices.length ? Math.max(...prices) : 0), [prices]);

  // ✅ IMPORTANT: keep filter state in sync when products change
  const [priceMin, setPriceMin] = useState<number>(computedMin);
  const [priceMax, setPriceMax] = useState<number>(computedMax);

  useEffect(() => {
    // when category/products changes, reset slider to full range (Starlink behavior)
    setPriceMin(computedMin);
    setPriceMax(computedMax);
  }, [computedMin, computedMax, category?.id]);

  // ✅ Only "In Stock"
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);

  const [pageSize, setPageSize] = useState<number>(20);
  const [sortBy, setSortBy] = useState<"default" | "price_asc" | "price_desc" | "name_asc">(
    "default"
  );

  // ✅ clamp helpers so min never crosses max
  const setMinSafe = (v: number) => setPriceMin(Math.min(v, priceMax));
  const setMaxSafe = (v: number) => setPriceMax(Math.max(v, priceMin));

  // ✅ Filter works correctly (price + availability)
  const filteredProducts = useMemo(() => {
    return categoryProducts.filter((p) => {
      const price = Number(p.price);
      const okPrice = Number.isFinite(price) && price >= priceMin && price <= priceMax;

      if (!inStockOnly) return okPrice;

      const av = (p.availability ?? (p.stock === 0 ? "up_coming" : "in_stock")) as AvailabilityKey;
      const okStock = av === "in_stock" && (typeof p.stock !== "number" || p.stock > 0);

      return okPrice && okStock;
    });
  }, [categoryProducts, priceMin, priceMax, inStockOnly]);

  const sortedProducts = useMemo(() => {
    const arr = [...filteredProducts];
    if (sortBy === "price_asc") arr.sort((a, b) => a.price - b.price);
    if (sortBy === "price_desc") arr.sort((a, b) => b.price - a.price);
    if (sortBy === "name_asc") arr.sort((a, b) => a.name.localeCompare(b.name));
    return arr;
  }, [filteredProducts, sortBy]);

  // ✅ Keep pageSize valid when filter reduces items
  const safePageSize = useMemo(() => {
    if (sortedProducts.length === 0) return pageSize;
    return Math.min(pageSize, sortedProducts.length);
  }, [pageSize, sortedProducts.length]);

  const visibleProducts = useMemo(
    () => sortedProducts.slice(0, safePageSize),
    [sortedProducts, safePageSize]
  );

  const currencySymbol = categoryProducts?.[0]?.currencySymbol ?? "৳";

  return (
    <div className="min-h-screen bg-background text-foreground py-6">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* LEFT SIDEBAR */}
          <aside className="space-y-4">
            {/* ✅ Price Range (fixed) */}
            <Card className="rounded-md border border-border bg-card text-card-foreground shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Price Range</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setPriceMin(computedMin);
                      setPriceMax(computedMax);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Reset
                  </button>
                </div>

                {/* ✅ dual range slider */}
                <div className="relative mt-3 h-10">
                  <input
                    type="range"
                    min={computedMin}
                    max={computedMax}
                    value={priceMin}
                    onChange={(e) => setMinSafe(Number(e.target.value))}
                    className="absolute inset-0 w-full accent-orange-500"
                  />
                  <input
                    type="range"
                    min={computedMin}
                    max={computedMax}
                    value={priceMax}
                    onChange={(e) => setMaxSafe(Number(e.target.value))}
                    className="absolute inset-0 w-full accent-orange-500"
                  />
                </div>

                {/* ✅ inputs editable (filter will work immediately) */}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded border border-border bg-background px-3 py-2">
                    <div className="text-[11px] text-muted-foreground mb-1">Min</div>
                    <input
                      type="number"
                      value={priceMin}
                      min={computedMin}
                      max={priceMax}
                      onChange={(e) => setMinSafe(Number(e.target.value || computedMin))}
                      className="w-full bg-transparent outline-none text-sm"
                    />
                  </div>

                  <div className="rounded border border-border bg-background px-3 py-2">
                    <div className="text-[11px] text-muted-foreground mb-1">Max</div>
                    <input
                      type="number"
                      value={priceMax}
                      min={priceMin}
                      max={computedMax}
                      onChange={(e) => setMaxSafe(Number(e.target.value || computedMax))}
                      className="w-full bg-transparent outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="mt-3 text-xs text-muted-foreground">
                  Range:{" "}
                  <span className="text-foreground font-medium">
                    {formatMoney(priceMin, currencySymbol)} - {formatMoney(priceMax, currencySymbol)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* ✅ Availability (works) */}
            <Card className="rounded-md border border-border bg-card text-card-foreground shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Availability</h3>
                </div>

                <label className="mt-3 flex items-center gap-3 cursor-pointer select-none">
                  <button
                    type="button"
                    className={`h-5 w-5 rounded border flex items-center justify-center ${
                      inStockOnly ? "border-foreground bg-foreground" : "border-border bg-background"
                    }`}
                    onClick={() => setInStockOnly((s) => !s)}
                    aria-label="Toggle In Stock"
                  >
                    {inStockOnly && <Check className="h-3.5 w-3.5 text-background" />}
                  </button>
                  <span className="text-sm">In Stock</span>
                </label>
              </CardContent>
            </Card>
          </aside>

          {/* RIGHT CONTENT */}
          <section>
            {/* Top Bar */}
            <div className="mb-4">
              <div className="w-full rounded-md border border-border bg-background text-foreground">
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <span className="font-semibold truncate block">{category.name}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Show:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="h-9 rounded border border-border bg-background px-2 text-sm text-foreground outline-none"
                      >
                        {[10, 20, 40, 80].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Sort By:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="h-9 rounded border border-border bg-background px-2 text-sm text-foreground outline-none"
                      >
                        <option value="default">Default</option>
                        <option value="name_asc">Name (A→Z)</option>
                        <option value="price_asc">Price (Low→High)</option>
                        <option value="price_desc">Price (High→Low)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* ✅ Small line to confirm filters working */}
              <div className="mt-2 text-xs text-muted-foreground">
                Showing{" "}
                <span className="text-foreground font-medium">{visibleProducts.length}</span> of{" "}
                <span className="text-foreground font-medium">{sortedProducts.length}</span> filtered
                products
                {categoryCount !== null ? (
                  <>
                    {" "}
                    · <span className="text-foreground font-medium">{categoryCount}</span> categories
                  </>
                ) : null}
              </div>
            </div>

            {sortedProducts.length === 0 ? (
              <Card className="rounded-md border border-border bg-card text-card-foreground shadow-sm">
                <CardContent className="p-10 text-center">
                  <p className="font-medium mb-2">কোন প্রোডাক্ট পাওয়া যায়নি</p>
                  <p className="text-muted-foreground text-sm">
                    ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {visibleProducts.map((product) => {
                  const wish = isInWishlist(product.id);
                  const availabilityKey =
                    product.availability ?? (product.stock === 0 ? "up_coming" : "in_stock");

                  const showOriginal = (product.discount ?? 0) > 0 && !!product.original_price;

                  return (
                    <Card
                      key={product.id}
                      className="rounded-md border border-border bg-card text-card-foreground shadow-sm overflow-hidden relative"
                    >
                      {product.saveLabel ? (
                        <div className="absolute top-3 left-3 z-10">
                          <span className="rounded bg-purple-600 text-white text-xs font-semibold px-2 py-1">
                            {product.saveLabel}
                          </span>
                        </div>
                      ) : null}

                      <button
                        onClick={() => toggleWishlist(product.id)}
                        className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-red-600"
                        aria-label={wish ? "Remove from wishlist" : "Add to wishlist"}
                      >
                        <Heart className={`h-5 w-5 ${wish ? "fill-current text-red-600" : ""}`} />
                      </button>

                      <Link href={`/kitabghor/products/${product.id}`}>
                        <div className="bg-background px-6 pt-8 pb-6">
                          <div className="relative aspect-[4/3] w-full">
                            <Image
                              src={product.image || "/placeholder.svg"}
                              alt={product.name}
                              fill
                              className="object-contain"
                              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                            />
                          </div>
                        </div>
                      </Link>

                      <CardContent className="px-4 pb-0">
                        <Link href={`/kitabghor/products/${product.id}`}>
                          <h3 className="font-semibold line-clamp-2">{product.name}</h3>
                        </Link>

                        {product.specs?.length ? (
                          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                            {product.specs.slice(0, 4).map((s, i) => (
                              <li key={i} className="flex gap-2">
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-muted-foreground/70 shrink-0" />
                                <span className="leading-5">{s}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="mt-3 text-sm text-muted-foreground">Specs not available</div>
                        )}

                        <div className="mt-6 border-t border-border pt-4">
                          <div className="flex items-baseline justify-center gap-3">
                            <div className="text-lg font-bold text-red-600">
                              {formatMoney(product.price, product.currencySymbol ?? currencySymbol)}
                            </div>
                            {showOriginal ? (
                              <div className="text-sm text-muted-foreground line-through">
                                {formatMoney(
                                  product.original_price as number,
                                  product.currencySymbol ?? currencySymbol
                                )}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </CardContent>

                      <CardFooter className="p-4 pt-3">
                        {availabilityKey === "up_coming" || product.stock === 0 ? (
                          <Button
                            disabled
                            className="w-full rounded-md bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed"
                          >
                            Up Coming
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleAddToCart(product)}
                            className="w-full rounded-md bg-[#4f6cff] hover:bg-[#3f5cf0] text-white"
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Add To Cart
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}