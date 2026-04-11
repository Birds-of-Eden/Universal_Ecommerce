"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  Heart,
  Search,
  Sparkles,
} from "lucide-react";
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

type ApiCategory = {
  id: number | string;
  name: string;
  slug?: string | null;
  image?: string | null;
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

type ReviewDTO = {
  productId: number | string;
  rating: number | string;
};

type CategoryNode = {
  id: number;
  name: string;
  slug: string;
  image: string | null;
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
  image: string;
  stock: number;
  ratingAvg: number;
  ratingCount: number;
  categoryId: number | null;
};

const toNumber = (value: unknown) => {
  const num =
    typeof value === "string" ? Number(value.replace(/,/g, "")) : Number(value);
  return Number.isFinite(num) ? num : 0;
};

const formatPrice = (value: number) =>
  `৳${Math.round(value).toLocaleString("en-US")}`;

function computeStock(variants?: ApiVariant[] | null) {
  const list = Array.isArray(variants) ? variants : [];
  if (!list.length) return 0;
  return list.reduce((sum, variant) => sum + toNumber(variant?.stock), 0);
}

function normalizeReviewsPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.reviews)) return data.reviews;
  if (Array.isArray(data?.data)) return data.data;
  return [];
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
      slug: String(category.slug || category.id),
      image: category.image ?? null,
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

function CategorySectionSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="space-y-3">
          <div className="h-10 rounded-md border border-border bg-card" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((__, cardIndex) => (
              <div
                key={cardIndex}
                className="overflow-hidden rounded-md border border-border bg-card"
              >
                <div className="h-36 animate-pulse bg-muted" />
                <div className="space-y-2 p-3">
                  <div className="h-3 rounded bg-muted" />
                  <div className="h-3 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                  <div className="h-7 w-24 rounded border border-border bg-background" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CatalogCard({
  product,
  wishlisted,
  onWishlistClick,
  onAddToCart,
}: {
  product: ProductUI;
  wishlisted: boolean;
  onWishlistClick: () => void;
  onAddToCart: () => void;
}) {
  return (
    <div className="group overflow-hidden rounded-[4px] border border-[#dfe4dc] bg-white shadow-[0_1px_3px_rgba(13,20,20,0.04)] transition hover:-translate-y-0.5 hover:shadow-md dark:border-border dark:bg-card">
      <Link href={`/ecommerce/products/${product.id}`} className="block">
        <div className="relative border-b border-[#eef1ea] bg-white p-3 dark:border-border dark:bg-card">
          {product.discountPct > 0 ? (
            <div className="absolute left-2 top-2 z-10 rounded-sm border border-[#f4c9c9] bg-[#fff8f8] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#c33]">
              -{product.discountPct}%
            </div>
          ) : null}

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onWishlistClick();
            }}
            className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[#e4e8df] bg-white text-muted-foreground transition hover:text-primary dark:border-border dark:bg-card"
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart
              className={`h-3.5 w-3.5 ${
                wishlisted ? "fill-primary text-primary" : ""
              }`}
            />
          </button>

          <div className="relative mx-auto h-28 w-full max-w-[150px]">
            <Image
              src={product.image || "/placeholder.svg"}
              alt={product.name}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 140px, 180px"
            />
          </div>
        </div>

        <div className="space-y-2 p-3">
          <h3 className="line-clamp-2 min-h-[34px] text-[11px] leading-[1.45] text-foreground">
            {product.name}
          </h3>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-foreground">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice > product.price ? (
                <span className="text-[10px] text-muted-foreground line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              ) : null}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {product.ratingCount > 0
                ? `${product.ratingAvg.toFixed(1)} / 5 • ${product.ratingCount} reviews`
                : product.stock > 0
                ? "In stock"
                : "Out of stock"}
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCart();
            }}
            disabled={product.stock === 0}
            className={`inline-flex h-7 items-center rounded-sm border px-2.5 text-[10px] font-semibold uppercase tracking-wide transition ${
              product.stock === 0
                ? "cursor-not-allowed border-border bg-muted text-muted-foreground"
                : "border-[#edb5b5] bg-[#fff8f8] text-[#c33] hover:border-[#de8d8d] hover:bg-[#fff1f1]"
            }`}
          >
            Add to cart
          </button>
        </div>
      </Link>
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

  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [products, setProducts] = useState<ProductUI[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeDepartmentId, setActiveDepartmentId] = useState<number | null>(
    null,
  );
  const [activeChildId, setActiveChildId] = useState<number | null>(null);
  const [activeGrandChildId, setActiveGrandChildId] = useState<number | null>(null);

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
          if (!acc[productId]) acc[productId] = { sum: 0, count: 0 };
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
        // Auto-select first department, first child, and first grandchild
        const firstDepartment = tree[0];
        if (firstDepartment) {
          setActiveDepartmentId(firstDepartment.id);
          const firstChild = firstDepartment.children[0];
          if (firstChild) {
            setActiveChildId(firstChild.id);
            const firstGrandChild = firstChild.children[0];
            if (firstGrandChild) {
              setActiveGrandChildId(firstGrandChild.id);
            }
          }
        }
      } catch (fetchError) {
        console.error(fetchError);
        setError("Failed to load categories and products.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const departmentTabs = useMemo(
    () => categories.filter((category) => category.children.length > 0),
    [categories],
  );

  const activeDepartment = useMemo(() => {
    if (activeDepartmentId) {
      return (
        departmentTabs.find((category) => category.id === activeDepartmentId) ??
        departmentTabs[0] ??
        null
      );
    }
    return departmentTabs[0] ?? null;
  }, [activeDepartmentId, departmentTabs]);

  const activeChild = useMemo(() => {
    if (!activeDepartment || !activeChildId) return null;
    return (
      activeDepartment.children.find((child) => child.id === activeChildId) ??
      null
    );
  }, [activeChildId, activeDepartment]);

  const activeGrandChild = useMemo(() => {
    if (!activeChild || !activeGrandChildId) return null;
    return (
      activeChild.children.find((grandChild) => grandChild.id === activeGrandChildId) ??
      null
    );
  }, [activeGrandChildId, activeChild]);

  useEffect(() => {
    // Reset child and grandchild selection when department changes
    setActiveChildId(null);
    setActiveGrandChildId(null);
    // Auto-select first child of new department
    if (activeDepartment) {
      const firstChild = activeDepartment.children[0];
      if (firstChild) {
        setActiveChildId(firstChild.id);
        // Auto-select first grandchild of new child
        const firstGrandChild = firstChild.children[0];
        if (firstGrandChild) {
          setActiveGrandChildId(firstGrandChild.id);
        }
      }
    }
  }, [activeDepartmentId]);

  useEffect(() => {
    // Reset grandchild selection when child changes
    setActiveGrandChildId(null);
    // Auto-select first grandchild of new child
    if (activeChild && activeDepartment) {
      const firstGrandChild = activeChild.children[0];
      if (firstGrandChild) {
        setActiveGrandChildId(firstGrandChild.id);
      }
    }
  }, [activeChildId]);

  const filteredDepartmentTabs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return departmentTabs;
    return departmentTabs.filter((department) =>
      department.name.toLowerCase().includes(term),
    );
  }, [departmentTabs, searchTerm]);

  const sections = useMemo(() => {
    const sourceDepartments =
      filteredDepartmentTabs.length > 0 ? filteredDepartmentTabs : departmentTabs;

    const visibleDepartments = activeDepartment
      ? sourceDepartments.filter((department) => department.id === activeDepartment.id)
      : sourceDepartments;

    return visibleDepartments
      .map((department) => {
        const categoryIds = new Set<number>([
          department.id,
          ...collectDescendantIds(department),
        ]);

        const childTabs = department.children;
        const grandChildTabs = activeChild ? activeChild.children : [];
        const sectionProducts = products.filter((product) => {
          if (product.categoryId === null) return false;
          if (!categoryIds.has(product.categoryId)) return false;

          if (activeGrandChild && department.id === activeDepartment?.id) {
            const activeIds = new Set<number>([
              activeGrandChild.id,
              ...collectDescendantIds(activeGrandChild),
            ]);
            return activeIds.has(product.categoryId);
          }
          if (activeChild && department.id === activeDepartment?.id && !activeGrandChild) {
            const activeIds = new Set<number>([
              activeChild.id,
              ...collectDescendantIds(activeChild),
            ]);
            return activeIds.has(product.categoryId);
          }

          return true;
        });

        return {
          department,
          childTabs,
          grandChildTabs,
          products: sectionProducts.slice(0, 18),
        };
      })
      .filter((section) => section.products.length > 0);
  }, [activeChild, activeDepartment, departmentTabs, filteredDepartmentTabs, products]);

  const handleAddToCart = useCallback(
    (product: ProductUI) => {
      if (product.stock === 0) {
        toast.error("This product is out of stock.");
        return;
      }

      addToCart(product.id);
      toast.success(`"${product.name}" added to cart.`);
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
    <div className="min-h-screen bg-background pb-12 text-foreground">
      <div className="container p-6">
        <div className="overflow-hidden rounded-md border border-[#ece7df] bg-[#fff5f3] dark:border-border dark:bg-card">
          <div className="grid gap-4 p-4 md:grid-cols-[1.2fr_1fr] md:items-center md:p-5">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c53333] shadow-sm dark:bg-background dark:text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                All Departments
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-[#231815] dark:text-foreground sm:text-3xl">
                  Browse daily essentials by department
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-[#6d625d] dark:text-muted-foreground">
                  Category wise product listing with quick add to cart, wishlist,
                  and fast browsing across your full catalog.
                </p>
              </div>
            </div>

            <div className="relative min-h-[120px] overflow-hidden rounded-md bg-[linear-gradient(135deg,#ffd7d1,#fff4f1_55%,#f7f0f0)] dark:bg-muted">
              <div className="absolute -right-5 top-0 h-24 w-24 rounded-[24px] bg-[#fdb7ad]/70" />
              <div className="absolute right-14 top-7 h-20 w-20 rounded-[18px] bg-[#7fa7e8]/75" />
              <div className="absolute bottom-2 right-28 h-16 w-16 rounded-[16px] bg-[#b8ebde]/80" />
              <div className="absolute bottom-0 right-0 h-full w-[42%] opacity-70">
                <Image
                  src="/logo_img.png"
                  alt="Department showcase"
                  fill
                  className="object-contain p-4"
                  sizes="400px"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {departmentTabs.map((department) => (
              <button
                key={department.id}
                type="button"
                onClick={() => setActiveDepartmentId(department.id)}
                className={`rounded-full border px-3 py-1.5 text-lg font-medium transition ${
                  activeDepartment?.id === department.id
                    ? "border-[#c53333] bg-[#d83d3d] text-white"
                    : "border-[#e7dfd7] bg-white text-[#4b413d] hover:border-[#d3c4bb] hover:bg-[#fff7f2] dark:border-border dark:bg-card dark:text-foreground"
                }`}
              >
                {department.name}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-md border border-[#ebe6de] bg-white p-3 shadow-sm dark:border-border dark:bg-card md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {activeDepartment?.children.map((child, index) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setActiveChildId(child.id)}
                  className={`rounded-full border px-3 py-1 text-[11px] transition ${
                    activeChild?.id === child.id
                      ? "border-[#d94f4f] bg-[#d94f4f] text-white"
                      : "border-[#ebe3db] bg-[#fffdfb] text-[#665a54] hover:border-[#d3c4bb] hover:bg-[#fff7f2] dark:border-border dark:bg-background dark:text-muted-foreground"
                  }`}
                >
                  {child.name}
                </button>
              ))}
            </div>

            <div className="relative w-full md:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search departments..."
                className="h-10 w-full rounded-md border border-[#e5ddd5] bg-[#fffdfc] pl-10 pr-3 text-sm outline-none transition focus:border-primary dark:border-border dark:bg-background"
              />
            </div>
          </div>

          {/* Grandchild Categories Navigation */}
          {activeChild && activeChild.children.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeChild.children.map((grandChild, index) => (
                <button
                  key={grandChild.id}
                  type="button"
                  onClick={() => setActiveGrandChildId(grandChild.id)}
                  className={`rounded-full border px-3 py-1 text-[11px] transition ${
                    activeGrandChild?.id === grandChild.id
                      ? "border-[#c53333] bg-[#d83d3d] text-white"
                      : "border-[#e7dfd7] bg-white text-[#4b413d] hover:border-[#d3c4bb] hover:bg-[#fff7f2] dark:border-border dark:bg-card dark:text-foreground"
                  }`}
                >
                  {grandChild.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          {loading ? (
            <CategorySectionSkeleton />
          ) : error ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : sections.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No department products found.
            </div>
          ) : (
            <div className="space-y-7">
              {sections.map((section) => (
                <section key={section.department.id} className="space-y-3">
                  <div className="overflow-hidden rounded-[4px] border border-[#dadfd6] bg-white dark:border-border dark:bg-card">
                    {section.childTabs.length > 0 ? (
                      <div className="flex flex-wrap gap-2 border-b border-[#edf1ea] px-3 py-2 dark:border-border">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveChildId(null);
                            setActiveGrandChildId(null);
                          }}
                          className={`rounded-full px-3 py-1 text-[11px] ${
                            !activeChild ||
                            section.department.id !== activeDepartment?.id
                              ? "bg-[#fff4f1] text-[#c53333]"
                              : "bg-[#f6f7f3] text-[#625751] dark:bg-background dark:text-muted-foreground"
                          }`}
                        >
                          All
                        </button>
                        {section.childTabs.map((child) => (
                          <button
                            key={child.id}
                            type="button"
                            onClick={() => {
                              setActiveDepartmentId(section.department.id);
                              setActiveChildId(child.id);
                              setActiveGrandChildId(null);
                            }}
                            className={`rounded-full px-3 py-1 text-[11px] transition ${
                              activeChild?.id === child.id &&
                              section.department.id === activeDepartment?.id
                                ? "bg-[#fff4f1] text-[#c53333]"
                                : "bg-[#f6f7f3] text-[#625751] hover:bg-[#fff7f4] dark:bg-background dark:text-muted-foreground"
                            }`}
                          >
                            {child.name}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                      {section.products.map((product) => (
                        <CatalogCard
                          key={product.id}
                          product={product}
                          wishlisted={isInWishlist(product.id)}
                          onWishlistClick={() => handleWishlist(product)}
                          onAddToCart={() => handleAddToCart(product)}
                        />
                      ))}
                    </div>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

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
