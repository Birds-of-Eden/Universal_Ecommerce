"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/ecommarce/CartContext";
import { useWishlist } from "@/components/ecommarce/WishlistContext";
import ProductCard from "@/components/ecommarce/ProductCard";
import { useSession } from "@/lib/auth-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AttributeFilter from "@/components/ecommarce/AttributeFilter";
import BrandFilter from "@/components/ecommarce/BrandFilter";

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
};

type ReviewDTO = {
  productId: number | string;
  rating: number | string;
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

type Attribute = {
  id: number;
  name: string;
  values: { id: number; value: string; attributeId: number }[];
};

type ProductAttribute = {
  id: number;
  productId: number;
  attributeId: number;
  value: string;
  attribute: {
    id: number;
    name: string;
  };
};

type Brand = {
  id: number;
  name: string;
  slug: string;
  logo?: string | null;
  productCount: number;
};

type UnifiedAttribute = {
  id: number;
  name: string;
  values: { id: number; value: string; attributeId: number }[];
};

/* =========================
  Helpers
========================= */
const toNumber = (v: any) => {
  const n =
    typeof v === "string" ? Number(v.replace(/,/g, "")) : Number(v);
  return Number.isFinite(n) ? n : 0;
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

function normalizeReviewsPayload(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.reviews)) return data.reviews;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

/* =========================
  Single-track Dual Range
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
  const [expanded, setExpanded] = useState<boolean>(true);
  const range = Math.max(1, max - min);
  const leftPct = ((valueMin - min) / range) * 100;
  const rightPct = 100 - ((valueMax - min) / range) * 100;

  const toggleExpand = () => {
    setExpanded((prev) => !prev);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Price Range</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={toggleExpand}
            className="w-5 h-5 flex items-center justify-center"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <>
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
        </>
      )}

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

/**
 * Category Tree Filter
 */
function CategoryTreeFilter({
  tree,
  loading,
  selectedIds,
  setSelectedIds,
}: {
  tree: CategoryNode[];
  loading: boolean;
  selectedIds: Set<number>;
  setSelectedIds: Dispatch<SetStateAction<Set<number>>>;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set<number>());
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set<number>(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllExpand = () => {
    if (isExpanded) {
      setExpanded(new Set<number>());
      setIsExpanded(false);
    } else {
      const allIds = new Set<number>();
      const collectIds = (nodes: CategoryNode[]) => {
        nodes.forEach((node) => {
          allIds.add(node.id);
          if (node.children?.length) collectIds(node.children);
        });
      };
      collectIds(tree);
      setExpanded(allIds);
      setIsExpanded(true);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set<number>(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reset = () => setSelectedIds(new Set<number>());

  const Row = ({ node, level }: { node: CategoryNode; level: number }) => {
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
        <h3 className="text-sm font-semibold text-foreground">
          Filter By Categories
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={toggleAllExpand}
            className="w-5 h-5 flex items-center justify-center"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
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
      )}

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

  const [loginModalOpen, setLoginModalOpen] = useState(false);

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

  const [selectedCategoryIds, _setSelectedCategoryIds] = useState<Set<number>>(
    new Set<number>()
  );

  // Attributes
  const [apiAttributes, setApiAttributes] = useState<Attribute[]>([]);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [productAttributes, setProductAttributes] = useState<ProductAttribute[]>(
    []
  );
  const [selectedAttributeValues, _setSelectedAttributeValues] = useState<
    Set<string>
  >(new Set<string>());

  // Brands
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(false);
  const [selectedBrandIds, _setSelectedBrandIds] = useState<Set<number>>(
    new Set<number>()
  );

  const setSelectedCategoryIds = useCallback(
    (nextOrFn: SetStateAction<Set<number>>) => {
      _setSelectedCategoryIds((prev) => {
        if (typeof nextOrFn === "function") return nextOrFn(prev);
        return nextOrFn;
      });
    },
    []
  );

  const setSelectedAttributeValues = useCallback(
    (nextOrFn: SetStateAction<Set<string>>) => {
      _setSelectedAttributeValues((prev) => {
        if (typeof nextOrFn === "function") return nextOrFn(prev);
        return nextOrFn;
      });
    },
    []
  );

  const setSelectedBrandIds = useCallback(
    (nextOrFn: SetStateAction<Set<number>>) => {
      _setSelectedBrandIds((prev) => {
        if (typeof nextOrFn === "function") return nextOrFn(prev);
        return nextOrFn;
      });
    },
    []
  );

  /* =========================
    Load products
  ========================= */
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const [productsRes, reviewsRes] = await Promise.all([
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/reviews", { cache: "no-store" }),
        ]);

        if (!productsRes.ok) throw new Error("Failed to load products");
        if (!reviewsRes.ok) throw new Error("Failed to load reviews");

        const data = (await productsRes.json()) as ApiProduct[];
        const reviewsData = await reviewsRes.json();
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
                : p.category?.id ?? null;

            const bId =
              typeof p.brandId === "number" ? p.brandId : p.brand?.id ?? null;

            const stock = computeStockFromVariants(p.variants);
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
    Load attributes and product attributes
  ========================= */
  useEffect(() => {
    const loadAttributes = async () => {
      try {
        setAttributesLoading(true);

        const [attrRes, prodAttrRes] = await Promise.all([
          fetch("/api/attributes", { cache: "no-store" }),
          fetch("/api/products/attributes", { cache: "no-store" }),
        ]);

        if (attrRes.ok) {
          const attrData = await attrRes.json();
          setApiAttributes(Array.isArray(attrData) ? attrData : []);
        } else {
          setApiAttributes([]);
        }

        if (prodAttrRes.ok) {
          const prodAttrData = await prodAttrRes.json();
          setProductAttributes(Array.isArray(prodAttrData) ? prodAttrData : []);
        } else {
          setProductAttributes([]);
        }
      } catch (e) {
        console.error(e);
        setApiAttributes([]);
        setProductAttributes([]);
      } finally {
        setAttributesLoading(false);
      }
    };

    loadAttributes();
  }, []);

  /* =========================
    Load brands
  ========================= */
  useEffect(() => {
    const loadBrands = async () => {
      try {
        setBrandsLoading(true);
        const res = await fetch("/api/brands", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setBrands(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setBrandsLoading(false);
      }
    };

    loadBrands();
  }, []);

  /* =========================
    Unified attributes
    - from /api/attributes
    - from variantOptions
  ========================= */
  const attributes = useMemo<UnifiedAttribute[]>(() => {
    const nameMap = new Map<
      string,
      {
        id: number;
        name: string;
        valuesMap: Map<string, { id: number; value: string; attributeId: number }>;
      }
    >();

    // 1) Add from /api/attributes
    for (const attr of apiAttributes) {
      const attrName = String(attr.name ?? "").trim();
      if (!attrName) continue;

      if (!nameMap.has(attrName)) {
        nameMap.set(attrName, {
          id: Number(attr.id),
          name: attrName,
          valuesMap: new Map(),
        });
      }

      const bucket = nameMap.get(attrName)!;

      for (const val of attr.values ?? []) {
        const cleanVal = String(val.value ?? "").trim();
        if (!cleanVal) continue;

        if (!bucket.valuesMap.has(cleanVal)) {
          bucket.valuesMap.set(cleanVal, {
            id: Number(val.id),
            value: cleanVal,
            attributeId: bucket.id,
          });
        }
      }
    }

    // 2) Add from product variantOptions
    for (const product of products) {
      for (const option of product.variantOptions ?? []) {
        const optionName = String(option.name ?? "").trim();
        if (!optionName) continue;

        if (!nameMap.has(optionName)) {
          nameMap.set(optionName, {
            id: Number(option.id),
            name: optionName,
            valuesMap: new Map(),
          });
        }

        const bucket = nameMap.get(optionName)!;

        for (const val of option.values ?? []) {
          const cleanVal = String(val.value ?? "").trim();
          if (!cleanVal) continue;

          if (!bucket.valuesMap.has(cleanVal)) {
            bucket.valuesMap.set(cleanVal, {
              id: Number(val.id),
              value: cleanVal,
              attributeId: bucket.id,
            });
          }
        }
      }
    }

    return Array.from(nameMap.values())
      .map((item) => ({
        id: item.id,
        name: item.name,
        values: Array.from(item.valuesMap.values()).sort((a, b) =>
          a.value.localeCompare(b.value)
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [apiAttributes, products]);

  const attributeIdToName = useMemo(() => {
    const map = new Map<number, string>();
    for (const attr of attributes) {
      map.set(attr.id, attr.name);
    }
    return map;
  }, [attributes]);

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
    Effective category ids
  ========================= */
  const effectiveCategoryIds = useMemo(() => {
    if (selectedCategoryIds.size === 0) return null;

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
      if (node) collectDescendantIds(node).forEach((d) => out.add(d));
    }

    return out;
  }, [selectedCategoryIds, catTree]);

  /* =========================
    Filter + sort
  ========================= */
  const filtered = useMemo(() => {
    let list = [...products];

    if (effectiveCategoryIds && effectiveCategoryIds.size > 0) {
      list = list.filter(
        (p) => p.categoryId !== null && effectiveCategoryIds.has(p.categoryId)
      );
    }

    if (selectedBrandIds.size > 0) {
      list = list.filter(
        (p) => p.brandId !== null && selectedBrandIds.has(p.brandId)
      );
    }

    if (inStockOnly) {
      list = list.filter((p) => p.stock > 0);
    }

    if (selectedAttributeValues.size > 0) {
      const selectedGroups = new Map<string, Set<string>>();

      for (const selectedValue of selectedAttributeValues) {
        const splitIndex = selectedValue.indexOf(":");
        if (splitIndex === -1) continue;

        const attributeId = Number(selectedValue.slice(0, splitIndex));
        const value = selectedValue.slice(splitIndex + 1).trim();
        const attributeName = attributeIdToName.get(attributeId);

        if (!attributeName || !value) continue;

        if (!selectedGroups.has(attributeName)) {
          selectedGroups.set(attributeName, new Set<string>());
        }

        selectedGroups.get(attributeName)!.add(value);
      }

      list = list.filter((product) => {
        // match against normal product attributes
        const normalAttrs = productAttributes.filter(
          (pa) => pa.productId === product.id
        );

        const normalAttrMatch = (() => {
          if (normalAttrs.length === 0) return false;

          for (const [attributeName, allowedValues] of selectedGroups.entries()) {
            const relevantAttrs = normalAttrs.filter(
              (pa) =>
                String(pa.attribute?.name ?? "").trim() === attributeName
            );

            if (relevantAttrs.length === 0) {
              return false;
            }

            const hasValueMatch = relevantAttrs.some((pa) =>
              allowedValues.has(String(pa.value ?? "").trim())
            );

            if (!hasValueMatch) {
              return false;
            }
          }

          return true;
        })();

        // match against variants
        const variantMatch = (() => {
          const activeVariants = (product.variants ?? []).filter(
            (variant) => variant.active !== false
          );

          if (activeVariants.length === 0) return false;

          return activeVariants.some((variant) => {
            const variantOptions = variant.options ?? {};

            for (const [attributeName, allowedValues] of selectedGroups.entries()) {
              const variantValue = String(
                variantOptions[attributeName] ?? ""
              ).trim();

              if (!allowedValues.has(variantValue)) {
                return false;
              }
            }

            return true;
          });
        })();

        // product will pass if either normal attribute OR variant attribute matches
        return normalAttrMatch || variantMatch;
      });
    }

    list = list.filter((p) => p.price >= priceMin && p.price <= priceMax);

    if (sortBy === "price_low") list.sort((a, b) => a.price - b.price);
    if (sortBy === "price_high") list.sort((a, b) => b.price - a.price);
    if (sortBy === "name_az") list.sort((a, b) => a.name.localeCompare(b.name));

    return list;
  }, [
    products,
    effectiveCategoryIds,
    selectedBrandIds,
    inStockOnly,
    priceMin,
    priceMax,
    sortBy,
    selectedAttributeValues,
    productAttributes,
    attributeIdToName,
  ]);

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
    [status, isInWishlist, addToWishlist, removeFromWishlist]
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

            <CategoryTreeFilter
              tree={catTree}
              loading={catLoading}
              selectedIds={selectedCategoryIds}
              setSelectedIds={setSelectedCategoryIds}
            />

            <BrandFilter
              brands={brands}
              loading={brandsLoading}
              selectedIds={selectedBrandIds}
              setSelectedIds={setSelectedBrandIds}
            />

            <AttributeFilter
              attributes={attributes}
              loading={attributesLoading}
              selectedValues={selectedAttributeValues}
              setSelectedValues={setSelectedAttributeValues}
            />

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
                <Button
                  className="mt-3"
                  onClick={() => window.location.reload()}
                >
                  Reload
                </Button>
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                No products found for your filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {visible.map((p) => (
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
                    }}
                    wishlisted={isInWishlist(p.id)}
                    onWishlistClick={() => toggleWishlist(p)}
                    onAddToCart={() => handleAddToCart(p)}
                    formatPrice={formatBDT}
                    showMeta
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      <Dialog open={loginModalOpen} onOpenChange={setLoginModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              Please login first
            </DialogTitle>
            <DialogDescription>
              You need to be logged in to use the wishlist.
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
  );
}