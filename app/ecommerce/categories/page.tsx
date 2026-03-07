"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  RefreshCcw,
  Menu,
  X,
} from "lucide-react";
import { toast } from "sonner";
import ProductCard from "@/components/ecommarce/ProductCard";
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

type ApiCategory = {
  id: number | string;
  name: string;
  parentId?: number | string | null;
  productCount?: number;
  childrenCount?: number;
};

type ApiVariant = {
  stock?: number | string | null;
};

type ApiProduct = {
  id: number | string;
  name: string;
  slug?: string | null;
  type?: string | null;
  sku?: string | null;
  shortDesc?: string | null;
  description?: string | null;
  basePrice?: number | string | null;
  originalPrice?: number | string | null;
  image?: string | null;
  available?: boolean | null;
  categoryId?: number | string | null;
  variants?: ApiVariant[] | null;
};

type CategoryNode = {
  id: number;
  name: string;
  parentId: number | null;
  productCount: number;
  childrenCount: number;
  children: CategoryNode[];
};

type ProductUI = {
  id: number;
  name: string;
  slug: string;
  price: number;
  originalPrice: number;
  discountPct: number;
  sku: string;
  type: string;
  shortDesc: string;
  image: string;
  stock: number;
  ratingAvg: number;
  ratingCount: number;
  categoryId: number | null;
};

type ReviewDTO = {
  productId: number | string;
  rating: number | string;
};

const toNumber = (value: unknown) => {
  const num =
    typeof value === "string" ? Number(value.replace(/,/g, "")) : Number(value);
  return Number.isFinite(num) ? num : 0;
};

const formatPrice = (value: number) =>
  `Tk ${Math.round(value).toLocaleString("en-US")}`;

function computeStock(variants?: ApiVariant[] | null) {
  const list = Array.isArray(variants) ? variants : [];
  if (!list.length) return 0;
  return list.reduce((sum, variant) => sum + toNumber(variant?.stock), 0);
}

function buildCategoryTree(categories: ApiCategory[]): CategoryNode[] {
  const map = new Map<number, CategoryNode>();

  categories.forEach((category) => {
    const id = Number(category.id);
    if (!Number.isFinite(id)) return;

    const rawParentId = category.parentId;
    const parentId =
      rawParentId === null || rawParentId === undefined || rawParentId === ""
        ? null
        : Number(rawParentId);

    map.set(id, {
      id,
      name: String(category.name || "Untitled"),
      parentId: Number.isFinite(parentId) ? parentId : null,
      productCount: toNumber(category.productCount),
      childrenCount: toNumber(category.childrenCount),
      children: [],
    });
  });

  const roots: CategoryNode[] = [];

  map.forEach((node) => {
    if (node.parentId !== null && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
      return;
    }
    roots.push(node);
  });

  const sortTree = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((node) => sortTree(node.children));
  };

  sortTree(roots);
  return roots;
}

function flattenTree(tree: CategoryNode[]) {
  const nodeMap = new Map<number, CategoryNode>();
  const walk = (nodes: CategoryNode[]) => {
    nodes.forEach((node) => {
      nodeMap.set(node.id, node);
      if (node.children.length) walk(node.children);
    });
  };
  walk(tree);
  return nodeMap;
}

function collectDescendantIds(node: CategoryNode): number[] {
  const ids: number[] = [];
  const stack = [...node.children];

  while (stack.length) {
    const current = stack.pop()!;
    ids.push(current.id);
    if (current.children.length) stack.push(...current.children);
  }

  return ids;
}

function collectExpandableIds(nodes: CategoryNode[]): number[] {
  const ids: number[] = [];
  const stack = [...nodes];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.children.length > 0) ids.push(node.id);
    if (node.children.length) stack.push(...node.children);
  }
  return ids;
}

function normalizeReviewsPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.reviews)) return data.reviews;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function CategoryTree({
  tree,
  selectedCategoryId,
  onSelect,
}: {
  tree: CategoryNode[];
  selectedCategoryId: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const nodeMap = useMemo(() => flattenTree(tree), [tree]);

  useEffect(() => {
    const firstLevelIds = new Set<number>();
    tree.forEach((node) => {
      if (node.children.length) firstLevelIds.add(node.id);
    });
    setExpandedIds(firstLevelIds);
  }, [tree]);

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedIds(new Set(collectExpandableIds(tree)));
  const collapseAll = () => setExpandedIds(new Set<number>());

  const selectedNode = selectedCategoryId
    ? (nodeMap.get(selectedCategoryId) ?? null)
    : null;
  const selectedParent =
    selectedNode && selectedNode.parentId !== null
      ? (nodeMap.get(selectedNode.parentId) ?? null)
      : null;

  const Row = ({ node, level }: { node: CategoryNode; level: number }) => {
    const hasChildren = node.children.length > 0;
    const isOpen = expandedIds.has(node.id);
    const isActive = selectedCategoryId === node.id;

    return (
      <div>
        <div
          className={`group flex items-center justify-between rounded-md px-3 py-2 text-sm transition ${
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-muted"
          }`}
          style={{ paddingLeft: `${12 + level * 14}px` }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {hasChildren ? (
              <button
                type="button"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-muted/60"
                onClick={() => toggleExpand(node.id)}
                aria-label={
                  isOpen ? `Collapse ${node.name}` : `Expand ${node.name}`
                }
              >
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="h-4 w-4 shrink-0" />
            )}

            <button
              type="button"
              className="truncate text-left font-medium"
              onClick={() => {
                onSelect(node.id);
                if (hasChildren) toggleExpand(node.id);
              }}
            >
              {node.name}
            </button>
          </div>

          <span
            className={`ml-2 shrink-0 text-xs ${
              isActive ? "text-primary-foreground/80" : "text-muted-foreground"
            }`}
          >
            {node.productCount}
          </span>
        </div>

        {hasChildren && isOpen ? (
          <div className="mt-1 space-y-1">
            {node.children.map((child) => (
              <Row key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Categories</h2>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
          <button
            type="button"
            onClick={expandAll}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-background hover:bg-accent transition-colors border border-border/50"
          >
            <ChevronsDownUp className="h-3.5 w-3.5" />
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-background hover:bg-accent transition-colors border border-border/50"
          >
            <ChevronsUpDown className="h-3.5 w-3.5" />
            Collapse All
          </button>
        </div>
      </div>

      <div className="max-h-[65vh] space-y-1 overflow-y-auto pr-1">
        {tree.map((node) => (
          <Row key={node.id} node={node} level={0} />
        ))}
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { status } = useSession();

  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [products, setProducts] = useState<ProductUI[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [sortBy, setSortBy] = useState<
    "default" | "price_low" | "price_high" | "name_az"
  >("default");

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [categoriesRes, productsRes, reviewsRes] = await Promise.all([
          fetch("/api/categories", { cache: "no-store" }),
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/reviews", { cache: "no-store" }),
        ]);

        if (!categoriesRes.ok || !productsRes.ok || !reviewsRes.ok) {
          throw new Error("Failed to fetch categories/products/reviews");
        }

        const categoriesJson = (await categoriesRes.json()) as ApiCategory[];
        const productsJson = (await productsRes.json()) as ApiProduct[];
        const reviewsJson = await reviewsRes.json();
        const reviewList = normalizeReviewsPayload(reviewsJson) as ReviewDTO[];
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

        const tree = buildCategoryTree(
          Array.isArray(categoriesJson) ? categoriesJson : [],
        );

        const mappedProducts: ProductUI[] = (
          Array.isArray(productsJson) ? productsJson : []
        ).map((product) => {
          const price = toNumber(product.basePrice);
          const originalPrice = toNumber(
            product.originalPrice || product.basePrice,
          );
          const stock = computeStock(product.variants);
          const discountPct =
            originalPrice > 0 && price < originalPrice
              ? Math.round(((originalPrice - price) / originalPrice) * 100)
              : 0;
          const rating = reviewStats[String(product.id)] ?? { sum: 0, count: 0 };

          return {
            id: Number(product.id),
            name: String(product.name ?? "Untitled Product"),
            slug: String(product.slug ?? product.id),
            price,
            originalPrice,
            discountPct,
            sku: String(product.sku ?? ""),
            type: String(product.type ?? ""),
            shortDesc: String(product.shortDesc ?? product.description ?? ""),
            image: product.image ?? "/placeholder.svg",
            stock,
            ratingAvg: rating.count ? rating.sum / rating.count : 0,
            ratingCount: rating.count,
            categoryId:
              product.categoryId === null || product.categoryId === undefined
                ? null
                : Number(product.categoryId),
          };
        });

        setCategories(tree);
        setProducts(mappedProducts);
      } catch (fetchError) {
        console.error(fetchError);
        setError("Failed to load categories and products.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const categoryMap = useMemo(() => flattenTree(categories), [categories]);

  const allowedCategoryIds = useMemo(() => {
    if (!selectedCategoryId) return null;

    const node = categoryMap.get(selectedCategoryId);
    if (!node) return new Set<number>([selectedCategoryId]);

    return new Set<number>([selectedCategoryId, ...collectDescendantIds(node)]);
  }, [selectedCategoryId, categoryMap]);

  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return "All Products";
    return categoryMap.get(selectedCategoryId)?.name ?? "Selected Category";
  }, [selectedCategoryId, categoryMap]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (allowedCategoryIds && allowedCategoryIds.size > 0) {
      list = list.filter(
        (product) =>
          product.categoryId !== null &&
          allowedCategoryIds.has(product.categoryId),
      );
    }

    if (sortBy === "price_low") list.sort((a, b) => a.price - b.price);
    if (sortBy === "price_high") list.sort((a, b) => b.price - a.price);
    if (sortBy === "name_az") list.sort((a, b) => a.name.localeCompare(b.name));

    return list;
  }, [products, allowedCategoryIds, sortBy]);

  const handleAddToCart = useCallback(
    (product: ProductUI) => {
      if (product.stock === 0) {
        toast.error("This product is out of stock.");
        return;
      }

      addToCart(product.id);
      toast.success(`\"${product.name}\" added to cart.`);
    },
    [addToCart],
  );

  const handleWishlist = useCallback(
    async (product: ProductUI) => {
      try {
        if (status !== "authenticated") {
          setLoginModalOpen(true);
          return;
        }

        const alreadyWishlisted = isInWishlist(product.id);

        if (alreadyWishlisted) {
          const res = await fetch(`/api/wishlist?productId=${product.id}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to remove from wishlist");

          removeFromWishlist(product.id);
          toast.success("Removed from wishlist.");
          return;
        }

        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id }),
        });
        if (!res.ok) throw new Error("Failed to add to wishlist");

        addToWishlist(product.id);
        toast.success("Added to wishlist.");
      } catch (wishlistError) {
        console.error(wishlistError);
        toast.error("Wishlist update failed.");
      }
    },
    [status, isInWishlist, removeFromWishlist, addToWishlist],
  );

  return (
    <div className="min-h-screen bg-background py-8 text-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Category</h1>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="h-9 rounded-md border border-border bg-background px-3"
            >
              <option value="default">Default</option>
              <option value="price_low">Price Low to High</option>
              <option value="price_high">Price High to Low</option>
              <option value="name_az">Name A-Z</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 w-full rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            >
              <Menu className="h-4 w-4" />
              <span className="font-medium">Browse Categories</span>
            </button>
          </div>

          {/* Desktop Sidebar */}
          <aside className="hidden lg:block">
            {loading ? (
              <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                Loading categories...
              </div>
            ) : (
              <CategoryTree
                tree={categories}
                selectedCategoryId={selectedCategoryId}
                onSelect={setSelectedCategoryId}
              />
            )}
          </aside>

          {/* Main Content */}
          <section>
            <div className="mb-4 rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-sm text-muted-foreground">
                {selectedCategoryName} • {filteredProducts.length} products
              </p>
            </div>

            {loading ? (
              <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
                Loading products...
              </div>
            ) : error ? (
              <div className="rounded-xl border border-border bg-card p-5 text-sm text-red-500">
                {error}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                No products found for this category.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={{
                      id: product.id,
                      name: product.name,
                      href: `/ecommerce/products/${product.id}`,
                      image: product.image,
                      price: product.price,
                      originalPrice: product.originalPrice,
                      discountPct: product.discountPct,
                      sku: product.sku,
                      type: product.type,
                      shortDesc: product.shortDesc,
                      stock: product.stock,
                      ratingAvg: product.ratingAvg,
                      ratingCount: product.ratingCount,
                      available: product.stock > 0,
                    }}
                    wishlisted={isInWishlist(product.id)}
                    onWishlistClick={() => handleWishlist(product)}
                    onAddToCart={() => handleAddToCart(product)}
                    formatPrice={formatPrice}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div className="fixed left-0 top-0 h-full w-80 max-w-full bg-background shadow-xl">
            <div className="flex h-full flex-col">
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="text-lg font-semibold">Categories</h2>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-md hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    Loading categories...
                  </div>
                ) : (
                  <CategoryTree
                    tree={categories}
                    selectedCategoryId={selectedCategoryId}
                    onSelect={(id) => {
                      setSelectedCategoryId(id);
                      setIsDrawerOpen(false);
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <Dialog open={loginModalOpen} onOpenChange={setLoginModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Please login first</DialogTitle>
            <DialogDescription>
              You need to be logged in to use the wishlist.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setLoginModalOpen(false)}
              className="h-10 rounded-lg border border-border bg-background px-4 font-semibold text-foreground transition hover:bg-accent"
            >
              Cancel
            </button>

            <Link
              href="/signin"
              onClick={() => setLoginModalOpen(false)}
              className="btn-primary inline-flex h-10 items-center justify-center rounded-lg px-4 font-semibold transition"
            >
              Login
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
