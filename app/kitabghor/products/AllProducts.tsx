"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/ecommarce/CartContext";
import { useWishlist } from "@/components/ecommarce/WishlistContext";
import { useSession } from "@/lib/auth-client";

/* =========================
  Types
========================= */
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

  categoryId?: number | null;
  category?: { id: number; name: string } | null;
};

type ProductUI = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  type: string;
  shortDesc: string;
  available: boolean;
  image: string;

  price: number;
  originalPrice: number;
  discountPct: number;

  categoryId: number | null;
};

type ApiCategory = {
  id: number | string;
  name: string;
  slug?: string | null;
  parentId?: number | string | null;
};

type CategoryNode = {
  id: number;
  name: string;
  parentId: number | null;
  children: CategoryNode[];
};

/* =========================
  Helpers
========================= */
const toNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatBDT = (v: number) => {
  const rounded = Math.round(v);
  return `৳${rounded.toLocaleString("en-US")}`;
};

function buildCategoryTree(list: ApiCategory[]): CategoryNode[] {
  const map = new Map<number, CategoryNode>();

  for (const c of list) {
    const id = Number(c.id);
    if (!Number.isFinite(id)) continue;
    map.set(id, {
      id,
      name: String(c.name ?? ""),
      parentId:
        c.parentId === null || c.parentId === undefined
          ? null
          : Number(c.parentId),
      children: [],
    });
  }

  const roots: CategoryNode[] = [];

  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRec = (arr: CategoryNode[]) => {
    arr.sort((a, b) => a.name.localeCompare(b.name));
    arr.forEach((x) => sortRec(x.children));
  };
  sortRec(roots);

  return roots;
}

function collectDescendantIds(node: CategoryNode): number[] {
  const out: number[] = [];
  const stack = [...node.children];
  while (stack.length) {
    const cur = stack.pop()!;
    out.push(cur.id);
    if (cur.children?.length) stack.push(...cur.children);
  }
  return out;
}

/* =========================
  ✅ Single-track Dual Range
========================= */
function PriceRange({
  min,
  max,
  valueMin,
  valueMax,
  onChangeMin,
  onChangeMax,
  onReset,
}: {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  onChangeMin: (v: number) => void;
  onChangeMax: (v: number) => void;
  onReset: () => void;
}) {
  const range = Math.max(1, max - min);
  const leftPct = ((valueMin - min) / range) * 100;
  const rightPct = 100 - ((valueMax - min) / range) * 100;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Price Range</h3>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          Reset
        </button>
      </div>

      <div className="relative mt-4 h-6">
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-border" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-primary"
          style={{ left: `${leftPct}%`, right: `${rightPct}%` }}
        />

        <input
          type="range"
          min={min}
          max={max}
          value={valueMin}
          onChange={(e) => onChangeMin(Number(e.target.value))}
          className="range-input"
          style={{ zIndex: 6 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={valueMax}
          onChange={(e) => onChangeMax(Number(e.target.value))}
          className="range-input"
          style={{ zIndex: 7 }}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <div className="text-[11px] text-muted-foreground">Min</div>
          <div className="text-sm font-semibold text-foreground">
            {formatBDT(valueMin)}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background px-3 py-2">
          <div className="text-[11px] text-muted-foreground">Max</div>
          <div className="text-sm font-semibold text-foreground">
            {formatBDT(valueMax)}
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Range: {formatBDT(valueMin)} - {formatBDT(valueMax)}
      </div>

      <style jsx global>{`
        .range-input {
          -webkit-appearance: none;
          appearance: none;
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 100%;
          height: 24px;
          background: transparent;
          outline: none;
        }

        .range-input::-webkit-slider-runnable-track {
          height: 6px;
          background: transparent;
        }

        .range-input::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 14px;
          width: 14px;
          border-radius: 9999px;
          background: #000;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          cursor: pointer;
          pointer-events: auto;
        }

        .range-input::-moz-range-track {
          height: 6px;
          background: transparent;
        }

        .range-input::-moz-range-thumb {
          height: 14px;
          width: 14px;
          border-radius: 9999px;
          background: #000;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
          cursor: pointer;
          pointer-events: auto;
        }
      `}</style>
    </div>
  );
}

/* =========================
  ✅ Category Tree Filter
  - Click row => expand/collapse
  - Checkbox => select for filtering
========================= */
function CategoryTreeFilter({
  tree,
  loading,
  selectedIds,
  setSelectedIds,
}: {
  tree: CategoryNode[];
  loading: boolean;
  selectedIds: Set<number>;
  setSelectedIds: (next: Set<number>) => void;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reset = () => setSelectedIds(new Set());

  const Row = ({
    node,
    level,
  }: {
    node: CategoryNode;
    level: number;
  }) => {
    const hasChildren = node.children?.length > 0;
    const isOpen = expanded.has(node.id);
    const isChecked = selectedIds.has(node.id);

    return (
      <div>
        <div
          className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-accent transition cursor-pointer"
          style={{ paddingLeft: 8 + level * 14 }}
          onClick={() => {
            if (hasChildren) toggleExpand(node.id);
          }}
        >
          {/* Expand Icon */}
          <span className="w-5 flex items-center justify-center">
            {hasChildren ? (
              isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )
            ) : (
              <span className="h-4 w-4" />
            )}
          </span>

          {/* Checkbox (stop click from expanding) */}
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => toggleSelect(node.id)}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 accent-foreground"
          />

          <span className="text-sm text-foreground leading-snug line-clamp-1">
            {node.name}
          </span>
        </div>

        {/* Children */}
        {hasChildren && isOpen && (
          <div className="mt-1 space-y-1">
            {node.children.map((ch) => (
              <Row key={ch.id} node={ch} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Filter By Categories</h3>
        <button
          type="button"
          onClick={reset}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          Reset
        </button>
      </div>

      <div className="mt-3 max-h-[320px] overflow-auto pr-1">
        {loading ? (
          <div className="text-sm text-muted-foreground py-2">Loading...</div>
        ) : tree.length === 0 ? (
          <div className="text-sm text-muted-foreground py-2">
            No categories found.
          </div>
        ) : (
          <div className="space-y-1">
            {tree.map((node) => (
              <Row key={node.id} node={node} level={0} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        {selectedIds.size === 0
          ? "All categories selected."
          : `${selectedIds.size} category selected.`}
      </div>
    </div>
  );
}

/* =========================
  Page
========================= */
export default function ProductsPage() {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { status } = useSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [products, setProducts] = useState<ProductUI[]>([]);

  // Filters
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showCount, setShowCount] = useState(20);
  const [sortBy, setSortBy] = useState<
    "default" | "price_low" | "price_high" | "name_az"
  >("default");

  // Price range
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [priceMinBound, setPriceMinBound] = useState(0);
  const [priceMaxBound, setPriceMaxBound] = useState(0);

  // Categories
  const [catTree, setCatTree] = useState<CategoryNode[]>([]);
  const [catLoading, setCatLoading] = useState(false);

  // ✅ checkbox selection
  const [selectedCategoryIds, _setSelectedCategoryIds] = useState<Set<number>>(
    new Set()
  );

  const setSelectedCategoryIds = useCallback(
    (nextOrFn: any) => {
      _setSelectedCategoryIds((prev) => {
        if (typeof nextOrFn === "function") return nextOrFn(prev);
        return nextOrFn;
      });
    },
    [_setSelectedCategoryIds]
  );

  /* =========================
    Load products
  ========================= */
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/products", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load products");

        const data = (await res.json()) as ApiProduct[];

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
                : p.category?.id ?? null;

            return {
              id: Number(p.id),
              name: String(p.name ?? "Untitled Product"),
              slug: String(p.slug ?? p.id),
              sku: String(p.sku ?? ""),
              type: String(p.type ?? ""),
              shortDesc: String(p.shortDesc ?? p.description ?? ""),
              available: Boolean(p.available ?? true),
              image: p.image ?? "/placeholder.svg",
              price,
              originalPrice: original,
              discountPct,
              categoryId: cId,
            };
          }
        );

        const prices = mapped
          .map((x) => x.price)
          .filter((n) => Number.isFinite(n) && n > 0);
        const minB = prices.length ? Math.floor(Math.min(...prices)) : 0;
        const maxB = prices.length ? Math.ceil(Math.max(...prices)) : 0;

        setProducts(mapped);
        setPriceMinBound(minB);
        setPriceMaxBound(maxB);
        setPriceMin(minB);
        setPriceMax(maxB);
      } catch (e) {
        console.error(e);
        setError("Failed to load products.");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  /* =========================
    Load categories
  ========================= */
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCatLoading(true);
        const res = await fetch("/api/categories", { cache: "no-store" });
        if (!res.ok) {
          setCatTree([]);
          return;
        }

        const data = (await res.json()) as ApiCategory[];
        const tree = buildCategoryTree(Array.isArray(data) ? data : []);
        setCatTree(tree);
      } catch (e) {
        console.error(e);
        setCatTree([]);
      } finally {
        setCatLoading(false);
      }
    };

    loadCategories();
  }, []);

  /* =========================
    Price range handlers
  ========================= */
  const handleMin = useCallback(
    (v: number) => {
      setPriceMin(() => {
        const next = Math.min(v, priceMax - 1);
        return Math.max(priceMinBound, Math.min(next, priceMaxBound));
      });
    },
    [priceMax, priceMinBound, priceMaxBound]
  );

  const handleMax = useCallback(
    (v: number) => {
      setPriceMax(() => {
        const next = Math.max(v, priceMin + 1);
        return Math.max(priceMinBound, Math.min(next, priceMaxBound));
      });
    },
    [priceMin, priceMinBound, priceMaxBound]
  );

  const resetPrice = useCallback(() => {
    setPriceMin(priceMinBound);
    setPriceMax(priceMaxBound);
  }, [priceMinBound, priceMaxBound]);

  /* =========================
    ✅ Build effective category filter IDs
    - if parent checked => include all descendants
========================= */
  const effectiveCategoryIds = useMemo(() => {
    if (selectedCategoryIds.size === 0) return null; // no filter

    // map nodes by id for descendant lookup
    const map = new Map<number, CategoryNode>();
    const walk = (nodes: CategoryNode[]) => {
      for (const n of nodes) {
        map.set(n.id, n);
        if (n.children?.length) walk(n.children);
      }
    };
    walk(catTree);

    const out = new Set<number>();

    for (const id of selectedCategoryIds) {
      out.add(id);
      const node = map.get(id);
      if (node) {
        collectDescendantIds(node).forEach((d) => out.add(d));
      }
    }

    return out;
  }, [selectedCategoryIds, catTree]);

  /* =========================
    Filter + sort
  ========================= */
  const filtered = useMemo(() => {
    let list = [...products];

    // category filter (tree, checkbox)
    if (effectiveCategoryIds && effectiveCategoryIds.size > 0) {
      list = list.filter(
        (p) => p.categoryId !== null && effectiveCategoryIds.has(p.categoryId)
      );
    }

    // availability
    if (inStockOnly) list = list.filter((p) => p.available);

    // price
    list = list.filter((p) => p.price >= priceMin && p.price <= priceMax);

    // sorting
    if (sortBy === "price_low") list.sort((a, b) => a.price - b.price);
    if (sortBy === "price_high") list.sort((a, b) => b.price - a.price);
    if (sortBy === "name_az") list.sort((a, b) => a.name.localeCompare(b.name));

    return list;
  }, [products, effectiveCategoryIds, inStockOnly, priceMin, priceMax, sortBy]);

  const visible = useMemo(
    () => filtered.slice(0, showCount),
    [filtered, showCount]
  );

  /* =========================
    Actions
  ========================= */
  const toggleWishlist = useCallback(
    async (p: ProductUI) => {
      try {
        if (status !== "authenticated") {
          toast.error("Please login to use wishlist.");
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
    [status, isInWishlist, addToWishlist, removeFromWishlist]
  );

  const handleAddToCart = useCallback(
    (p: ProductUI) => {
      try {
        addToCart(p.id);
        toast.success(`"${p.name}" added to cart.`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to add to cart.");
      }
    },
    [addToCart]
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Top bar */}
        <div className="mb-4 rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="font-semibold">Products</div>

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
                <span className="text-muted-foreground">Sort By:</span>
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

          <div className="mt-2 text-xs text-muted-foreground">
            Showing {Math.min(visible.length, filtered.length)} of{" "}
            {filtered.length} filtered products
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left filters */}
          <aside className="lg:col-span-3 space-y-4">
            <PriceRange
              min={priceMinBound}
              max={priceMaxBound}
              valueMin={priceMin}
              valueMax={priceMax}
              onChangeMin={handleMin}
              onChangeMax={handleMax}
              onReset={resetPrice}
            />

            {/* ✅ Category Tree Filter */}
            <CategoryTreeFilter
              tree={catTree}
              loading={catLoading}
              selectedIds={selectedCategoryIds}
              setSelectedIds={setSelectedCategoryIds}
            />

            {/* Availability */}
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-sm font-semibold text-foreground">
                Availability
              </h3>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="h-4 w-4 accent-foreground"
                />
                <span>In Stock</span>
              </label>
            </div>
          </aside>

          {/* Right grid */}
          <main className="lg:col-span-9">
            {loading ? (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                Loading products...
              </div>
            ) : error ? (
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="text-sm text-red-500">{error}</div>
                <Button className="mt-3" onClick={() => window.location.reload()}>
                  Reload
                </Button>
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                No products found for your filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {visible.map((p) => {
                  const wishlisted = isInWishlist(p.id);

                  return (
                    <Card
                      key={p.id}
                      className="group overflow-hidden border border-border bg-card shadow-sm hover:shadow-lg transition-shadow"
                    >
                      <div className="relative bg-white dark:bg-card">
                        <button
                          type="button"
                          onClick={() => toggleWishlist(p)}
                          className="absolute right-2 top-2 z-10 h-9 w-9 rounded-full border border-border bg-background/90 backdrop-blur flex items-center justify-center hover:bg-accent transition"
                          aria-label={
                            wishlisted
                              ? "Remove from wishlist"
                              : "Add to wishlist"
                          }
                        >
                          <Heart
                            className={`h-5 w-5 ${wishlisted ? "fill-current" : ""}`}
                          />
                        </button>

                        {p.discountPct > 0 && (
                          <div className="absolute left-2 top-2 z-10 rounded-full bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground">
                            Save {p.discountPct}%
                          </div>
                        )}

                        <Link href={`/kitabghor/products/${p.id}`}>
                          <div className="relative aspect-[4/3] w-full p-6">
                            <Image
                              src={p.image || "/placeholder.svg"}
                              alt={p.name}
                              fill
                              className="object-contain transition-transform duration-500 group-hover:scale-105"
                              sizes="(max-width: 768px) 100vw, 25vw"
                            />
                          </div>
                        </Link>
                      </div>

                      <CardContent className="p-4">
                        <Link href={`/kitabghor/products/${p.id}`}>
                          <h3 className="font-semibold text-sm leading-snug line-clamp-2 hover:underline">
                            {p.name}
                          </h3>
                        </Link>

                        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                          {p.sku ? (
                            <li className="flex gap-2">
                              <span className="mt-[6px] h-1 w-1 rounded-full bg-muted-foreground/60" />
                              <span>
                                <b className="text-foreground/80">SKU:</b> {p.sku}
                              </span>
                            </li>
                          ) : null}

                          {p.type ? (
                            <li className="flex gap-2">
                              <span className="mt-[6px] h-1 w-1 rounded-full bg-muted-foreground/60" />
                              <span>
                                <b className="text-foreground/80">Type:</b> {p.type}
                              </span>
                            </li>
                          ) : null}

                          {p.shortDesc ? (
                            <li className="flex gap-2">
                              <span className="mt-[6px] h-1 w-1 rounded-full bg-muted-foreground/60" />
                              <span className="line-clamp-2">{p.shortDesc}</span>
                            </li>
                          ) : null}
                        </ul>

                        <div className="mt-4 border-t border-border pt-3">
                          {p.available ? (
                            <div className="text-center">
                              <div className="font-semibold text-destructive">
                                {formatBDT(p.price)}
                              </div>
                              {p.originalPrice > p.price && (
                                <div className="text-xs text-muted-foreground line-through">
                                  {formatBDT(p.originalPrice)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center font-semibold text-muted-foreground">
                              Up Coming
                            </div>
                          )}
                        </div>
                      </CardContent>

                      <CardFooter className="p-4 pt-0">
                        <Button
                          className="w-full btn-primary"
                          disabled={!p.available}
                          onClick={() => handleAddToCart(p)}
                        >
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          {p.available ? "Add To Cart" : "Up Coming"}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}