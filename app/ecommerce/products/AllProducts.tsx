"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/ecommarce/CartContext";
import { useWishlist } from "@/components/ecommarce/WishlistContext";
import { useSession } from "@/lib/auth-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ProductCard from "@/components/ecommarce/ProductCard";

/* =========================
  Types
========================= */
type ApiVariant = {
  id?: number;
  stock?: number | string | null;
  price?: number | string | null;
  active?: boolean | null;
  options?: Record<string, string> | null;
};

type ApiVariantOptionValue = {
  id: number;
  value: string;
  optionId?: number;
  position?: number;
};

type ApiVariantOption = {
  id: number;
  name: string;
  position?: number;
  values?: ApiVariantOptionValue[] | null;
};

type ApiProduct = {
  id: number;
  name: string;
  slug?: string | null;
  type?: string | null;
  sku?: string | null;
  shortDesc?: string | null;
  description?: string | null;
  basePrice?: number | string | null;
  originalPrice?: number | string | null;
  currency?: string | null;
  available?: boolean | null;
  image?: string | null;
  brandId?: number | null;
  brand?: { id: number; name: string; slug: string } | null;

  variants?: ApiVariant[] | null;
  variantOptions?: ApiVariantOption[] | null;

  categoryId?: number | null;
  category?: { id: number; name: string } | null;

  // Bundle fields
  bundleStockLimit?: number | string | null;
  bundleItems?: Array<{
    product: {
      id: number;
      name: string;
      image?: string;
    };
    quantity: number;
  }> | null;
  bundleItemCount?: number | null;
  bundleSavings?: string | null;
};

type ProductUI = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  type: string;
  shortDesc: string;

  available: boolean;
  stock: number;
  image: string;

  price: number;
  originalPrice: number;
  discountPct: number;
  ratingAvg: number;
  ratingCount: number;

  categoryId: number | null;
  brandId: number | null;

  variants: ApiVariant[];
  variantOptions: ApiVariantOption[];

  // Bundle fields
  bundleStockLimit?: number | string | null;
  bundleItems?: Array<{
    product: {
      id: number;
      name: string;
      image?: string;
    };
    quantity: number;
  }> | null;
  bundleItemCount?: number;
  bundleSavings?: string;
};

type ReviewDTO = {
  productId: number | string;
  rating: number | string;
};

/* =========================
  Helpers
========================= */
const toNumber = (v: any, fallback = 0) => {
  const n = typeof v === "string" ? Number(v.replace(/,/g, "")) : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const formatBDT = (v: number) => {
  const rounded = Math.round(v);
  return `৳${rounded.toLocaleString("en-US")}`;
};

function computeStockFromVariants(variants?: ApiVariant[] | null) {
  const list = Array.isArray(variants) ? variants : [];
  if (!list.length) return 0;
  return list.reduce((sum, v) => sum + toNumber(v?.stock), 0);
}

function normalizeReviewsPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.reviews)) return data.reviews;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

/* =========================
  Page
========================= */
export default function ProductsPage() {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { status } = useSession();

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [products, setProducts] = useState<ProductUI[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Additional filters
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showCount, setShowCount] = useState(20);
  const [visibleCount, setVisibleCount] = useState(20);
  const [sortBy, setSortBy] = useState<
    "default" | "price_low" | "price_high" | "name_az"
  >("default");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Price range
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [priceMinBound, setPriceMinBound] = useState(0);
  const [priceMaxBound, setPriceMaxBound] = useState(0);

  // Brands
  const [brands, setBrands] = useState<any[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [selectedBrandIds, setSelectedBrandIds] = useState<Set<number>>(
    new Set(),
  );

  // Attributes
  const [apiAttributes, setApiAttributes] = useState<any[]>([]);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [productAttributes, setProductAttributes] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Temporarily only load products to isolate the issue
        console.log("Loading products...");
        const productsRes = await fetch("/api/products", { cache: "no-store" });

        if (!productsRes.ok) {
          console.error(
            "Products API failed:",
            productsRes.status,
            productsRes.statusText,
          );
          throw new Error(
            `Failed to load products: ${productsRes.status} ${productsRes.statusText}`,
          );
        }

        const data = (await productsRes.json()) as ApiProduct[];
        console.log("Products loaded successfully:", data.length, "products");

        // Set empty data for other endpoints temporarily
        const reviewsData: ReviewDTO[] = [];
        const brandsData = [];
        const attrData = [];
        const prodAttrData = [];

        const reviewList = normalizeReviewsPayload(reviewsData) as ReviewDTO[];

        const reviewStats = reviewList.reduce<
          Record<string, { sum: number; count: number }>
        >((acc, review) => {
          const productId = String(review.productId);
          const rating = toNumber(review.rating);
          if (!acc[productId]) {
            acc[productId] = { sum: 0, count: 0 };
          }
          acc[productId].sum += rating;
          acc[productId].count += 1;
          return acc;
        }, {});

        const mapped: ProductUI[] = (Array.isArray(data) ? data : []).map(
          (p) => {
            const price = toNumber(p.basePrice);
            const original = toNumber(p.originalPrice || p.basePrice);

            const discountPct =
              original > 0 && price < original
                ? Math.round(((original - price) / original) * 100)
                : 0;

            const cId =
              typeof p.categoryId === "number"
                ? p.categoryId
                : (p.category?.id ?? null);

            const bId =
              typeof p.brandId === "number" ? p.brandId : (p.brand?.id ?? null);

            const stock =
              p.type === "BUNDLE"
                ? toNumber(p.bundleStockLimit, 0)
                : computeStockFromVariants(p.variants);
            const rating = reviewStats[String(p.id)] ?? { sum: 0, count: 0 };

            return {
              id: Number(p.id),
              name: String(p.name ?? "Untitled Product"),
              slug: String(p.slug ?? p.id),
              sku: String(p.sku ?? ""),
              type: String(p.type ?? ""),
              shortDesc: String(p.shortDesc ?? p.description ?? ""),
              available: Boolean(p.available ?? true),
              stock,
              image: p.image ?? "/placeholder.svg",
              price,
              originalPrice: original,
              discountPct,
              ratingAvg: rating.count ? rating.sum / rating.count : 0,
              ratingCount: rating.count,
              categoryId: cId,
              brandId: bId,
              variants: Array.isArray(p.variants) ? p.variants : [],
              variantOptions: Array.isArray(p.variantOptions)
                ? p.variantOptions
                : [],
              // Bundle fields
              bundleStockLimit: p.bundleStockLimit,
              bundleItems: p.bundleItems,
              bundleItemCount: p.bundleItemCount ?? undefined,
              bundleSavings: p.bundleSavings ?? undefined,
            };
          },
        );

        const prices = mapped
          .map((x) => x.price)
          .filter((n) => Number.isFinite(n) && n > 0);

        const minB = prices.length ? Math.floor(Math.min(...prices)) : 0;
        const maxB = prices.length ? Math.ceil(Math.max(...prices)) : 0;

        setProducts(mapped);
        setBrands([]);
        setApiAttributes([]);
        setProductAttributes([]);
        setPriceMinBound(minB);
        setPriceMaxBound(maxB);
        setPriceMin(minB);
        setPriceMax(maxB);
      } catch (fetchError) {
        console.error(fetchError);
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter products based on search and filters
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Search filtering
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.shortDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Additional filters
    if (inStockOnly) {
      filtered = filtered.filter((p) => p.stock > 0);
    }

    filtered = filtered.filter(
      (p) => p.price >= priceMin && p.price <= priceMax,
    );

    // Sorting
    if (sortBy === "price_low") filtered.sort((a, b) => a.price - b.price);
    if (sortBy === "price_high") filtered.sort((a, b) => b.price - a.price);
    if (sortBy === "name_az")
      filtered.sort((a, b) => a.name.localeCompare(b.name));

    return filtered;
  }, [products, searchTerm, inStockOnly, priceMin, priceMax, sortBy]);

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount],
  );
  const hasMoreProducts = visibleCount < filteredProducts.length;

  useEffect(() => {
    setVisibleCount(showCount);
  }, [showCount]);

  useEffect(() => {
    setVisibleCount((current) => {
      if (filteredProducts.length === 0) return showCount;
      return Math.min(showCount, filteredProducts.length);
    });
  }, [
    searchTerm,
    inStockOnly,
    priceMin,
    priceMax,
    sortBy,
    products,
    showCount,
    filteredProducts.length,
  ]);

  useEffect(() => {
    const node = loadMoreRef.current;

    if (!node || loading || error || !hasMoreProducts) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;

        setVisibleCount((current) =>
          Math.min(current + showCount, filteredProducts.length),
        );
      },
      {
        rootMargin: "200px 0px",
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [filteredProducts.length, hasMoreProducts, loading, error, showCount]);

  // Actions
  const toggleWishlist = useCallback(
    async (p: ProductUI) => {
      try {
        if (status !== "authenticated") {
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
          toast.success("Removed from wishlist.");
        } else {
          const res = await fetch("/api/wishlist", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: p.id }),
          });
          if (!res.ok) throw new Error("Failed to add to wishlist");

          addToWishlist(p.id);
          toast.success("Added to wishlist.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Wishlist update failed.");
      }
    },
    [status, isInWishlist, addToWishlist, removeFromWishlist],
  );

  const handleAddToCart = useCallback(
    (p: ProductUI) => {
      try {
        if (p.stock === 0) {
          toast.error("This product is out of stock.");
          return;
        }

        addToCart(p.id);
        toast.success(`"${p.name}" added to cart.`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to add to cart.");
      }
    },
    [addToCart],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container px-6 py-6">
        {/* Header */}
        <div className="overflow-hidden rounded-md border border-border bg-gradient-to-br from-background to-muted/50 dark:from-card dark:to-muted/20">
          <div className="grid gap-4 p-4 md:grid-cols-[1.2fr_1fr] md:items-center md:p-5">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary shadow-sm dark:bg-primary/20">
                <Sparkles className="h-3.5 w-3.5" />
                All Products
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
                  Browse all products
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  Explore our complete product catalog with advanced filtering,
                  sorting, and quick add to cart functionality.
                </p>
              </div>
            </div>

            <div className="relative min-h-[120px] overflow-hidden rounded-md gradient-soft">
              <div className="absolute -right-5 top-0 h-24 w-24 rounded-[24px] bg-primary/30" />
              <div className="absolute right-14 top-7 h-20 w-20 rounded-[18px] bg-accent/40" />
              <div className="absolute bottom-2 right-28 h-16 w-16 rounded-[16px] bg-secondary/30" />
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 md:gap-5">
              {[...Array(12)].map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-gray-200 rounded-lg h-48 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="text-sm text-red-500">{error}</div>
              <Button className="mt-3" onClick={() => window.location.reload()}>
                Reload
              </Button>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
              No products found for your filters.
            </div>
          ) : (
            <>
              {/* Top bar with filters and sorting */}
              <div className="mb-4 rounded-lg border border-border bg-card px-4 py-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="font-semibold">
                    Showing{" "}
                    {Math.min(visibleProducts.length, filteredProducts.length)}{" "}
                    of {filteredProducts.length} products
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Show:</span>
                      <select
                        value={showCount}
                        onChange={(e) => setShowCount(Number(e.target.value))}
                        className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                      >
                        <option value={20}>20</option>
                        <option value={40}>40</option>
                        <option value={60}>60</option>
                        <option value={100}>100</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Sort:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                      >
                        <option value="default">Default</option>
                        <option value="price_low">Price: Low to High</option>
                        <option value="price_high">Price: High to Low</option>
                        <option value="name_az">Name: A-Z</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 md:gap-5">
                {visibleProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={{
                      id: p.id,
                      name: p.name,
                      href: `/ecommerce/products/${p.id}`,
                      image: p.image,
                      price: p.price,
                      originalPrice: p.originalPrice,
                      discountPct: p.discountPct,
                      sku: p.sku,
                      type: p.type,
                      shortDesc: p.shortDesc,
                      stock: p.stock,
                      ratingAvg: p.ratingAvg,
                      ratingCount: p.ratingCount,
                      available: p.stock > 0,
                      bundleStockLimit: p.bundleStockLimit ?? undefined,
                      bundleItems: p.bundleItems ?? undefined,
                      bundleItemCount: p.bundleItemCount,
                      bundleSavings: p.bundleSavings,
                    }}
                    wishlisted={isInWishlist(p.id)}
                    onWishlistClick={() => toggleWishlist(p)}
                    onAddToCart={() => handleAddToCart(p)}
                    formatPrice={formatBDT}
                    showMeta
                  />
                ))}
              </div>

              {hasMoreProducts ? (
                <div
                  ref={loadMoreRef}
                  className="flex justify-center py-6 text-sm text-muted-foreground"
                >
                  Loading more products...
                </div>
              ) : filteredProducts.length > showCount ? (
                <div className="py-8 text-center">
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
                    ✨ Thank You
                  </div>
                  <p className="mt-3 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-primary rounded-lg">
                    Happy Shopping!
                  </p>
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Login Modal */}
        <Dialog open={loginModalOpen} onOpenChange={setLoginModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Please login first
              </DialogTitle>
              <DialogDescription>
                You need to be logged in to use wishlist.
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
      </div>
    </div>
  );
}
