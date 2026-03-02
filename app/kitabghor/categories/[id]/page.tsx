"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useCart } from "@/components/ecommarce/CartContext";
import { useWishlist } from "@/components/ecommarce/WishlistContext";
import { toast } from "sonner";
import CategoryPage from "./category";

interface PageProps {
  params: Promise<{ id: string }>;
}

type Category = { id: number; name: string; slug?: string };

type AvailabilityKey = "in_stock" | "pre_order" | "up_coming";

type Product = {
  id: number;
  name: string;
  image: string | null;

  // ✅ UI needs these
  price: number;
  original_price?: number | null;

  discount?: number; // %
  currencySymbol?: string; // ৳
  availability?: AvailabilityKey;
  stock?: number;

  specs?: string[];
  saveLabel?: string | null;
};

// ---------- helpers ----------
function toNumber(v: any, fallback = 0) {
  const n = typeof v === "string" ? Number(v.replace(/,/g, "")) : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function currencyToSymbol(currency?: string) {
  // আপনার দরকার হলে আরও add করবেন
  if (!currency) return "৳";
  if (currency.toUpperCase() === "BDT") return "৳";
  if (currency.toUpperCase() === "USD") return "$";
  if (currency.toUpperCase() === "EUR") return "€";
  return "৳";
}

function pickProductsArray(data: any): any[] {
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.products)) return data.data.products;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  return [];
}

function computeStockFromVariants(p: any): number | undefined {
  const variants = Array.isArray(p?.variants) ? p.variants : [];
  if (!variants.length) return typeof p?.stock === "number" ? p.stock : undefined;

  const total = variants.reduce((sum: number, v: any) => {
    const s = toNumber(v?.stock, 0);
    return sum + s;
  }, 0);

  return total;
}

function resolvePriceFromApi(p: any) {
  // ✅ priority: variants[0].price -> basePrice -> price(any)
  const variants = Array.isArray(p?.variants) ? p.variants : [];
  const variantPrice = variants.length ? toNumber(variants[0]?.price, NaN) : NaN;

  const basePrice = toNumber(p?.basePrice, NaN);
  const fallbackPrice = toNumber(p?.price, NaN);

  const finalPrice = Number.isFinite(variantPrice)
    ? variantPrice
    : Number.isFinite(basePrice)
    ? basePrice
    : Number.isFinite(fallbackPrice)
    ? fallbackPrice
    : 0;

  const original = toNumber(p?.originalPrice, NaN);
  const originalAlt = toNumber(p?.original_price, NaN);

  const finalOriginal = Number.isFinite(original)
    ? original
    : Number.isFinite(originalAlt)
    ? originalAlt
    : null;

  return { finalPrice, finalOriginal };
}

function computeDiscount(price: number, original: number | null, apiDiscount: any) {
  const d = toNumber(apiDiscount, NaN);
  if (Number.isFinite(d)) return d;

  if (original && original > 0 && original > price) {
    return Math.round(((original - price) / original) * 100);
  }
  return 0;
}

function buildSpecs(p: any): string[] {
  // API তে specs না থাকলে সুন্দর কিছু bullet দেখানোর জন্য
  const out: string[] = [];
  if (p?.sku) out.push(`SKU: ${p.sku}`);
  if (p?.type) out.push(`Type: ${p.type}`);
  if (p?.shortDesc) out.push(String(p.shortDesc));
  else if (p?.description) out.push(String(p.description));
  return out.slice(0, 4);
}

// ---------- component ----------
export default function Page({ params }: PageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);

  const [category, setCategory] = useState<Category | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [categoryCount, setCategoryCount] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  // resolve params
  useEffect(() => {
    (async () => {
      const p = await params;
      setResolvedParams(p);
    })();
  }, [params]);

  // fetch category + products
  useEffect(() => {
    if (!resolvedParams?.id) return;

    const abortController = new AbortController();
    const signal = abortController.signal;
    isMounted.current = true;

    const timeoutId = setTimeout(() => {
      if (isMounted.current) {
        setError("লোড হতে অনেক সময় লাগছে। দয়া করে পুনরায় চেষ্টা করুন।");
        setLoading(false);
      }
    }, 10000);

    const fetchCategoryData = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/categories/${resolvedParams.id}/products`, {
          cache: "no-store",
          signal,
        });

        if (!res.ok) {
          if (res.status === 404) {
            setCategory(null);
            setCategoryProducts([]);
            setError("ক্যাটাগরি পাওয়া যায়নি");
            return;
          }
          const text = await res.text().catch(() => "");
          console.error("API error:", res.status, text);
          throw new Error("Failed to fetch category products");
        }

        const data: any = await res.json();

        // ✅ category matches your response
        const cat: Category | null =
          data?.category ?? data?.data?.category ?? data?.cat ?? null;

        const rawList = pickProductsArray(data);

        const normalized: Product[] = rawList.map((p: any) => {
          const { finalPrice, finalOriginal } = resolvePriceFromApi(p);

          const currencySymbol = p?.currencySymbol
            ? p.currencySymbol
            : currencyToSymbol(p?.currency);

          const discount = computeDiscount(finalPrice, finalOriginal, p?.discount);

          const stock = computeStockFromVariants(p);

          const availability: AvailabilityKey =
            p?.available === false
              ? "up_coming"
              : typeof stock === "number" && stock === 0
              ? "up_coming"
              : "in_stock";

          const saveLabel =
            discount > 0 && finalOriginal
              ? `Save: ${Math.max(0, finalOriginal - finalPrice)}${currencySymbol}`
              : null;

          return {
            id: toNumber(p?.id),
            name: String(p?.name ?? ""),
            image: p?.image ?? null,
            price: finalPrice, // ✅ FIXED
            original_price: finalOriginal, // ✅ FIXED
            discount,
            currencySymbol,
            availability,
            stock,
            specs: Array.isArray(p?.specs) ? p.specs : buildSpecs(p),
            saveLabel,
          };
        });

        setCategory(cat);
        setCategoryProducts(normalized);

        // category count (optional)
        const resAll = await fetch("/api/categories", {
          cache: "force-cache",
          next: { revalidate: 300 },
          signal,
        });

        if (resAll.ok) {
          const allCats: Category[] = await resAll.json();
          setCategoryCount(allCats.length);
        }
      } catch (err: any) {
        if (!isMounted.current || err?.name === "AbortError") return;
        console.error(err);
        setError("ডাটা লোড করতে সমস্যা হচ্ছে");
      } finally {
        clearTimeout(timeoutId);
        if (isMounted.current) setLoading(false);
      }
    };

    fetchCategoryData();

    return () => {
      isMounted.current = false;
      abortController.abort();
      clearTimeout(timeoutId);
    };
  }, [resolvedParams?.id]);

  // wishlist
  const toggleWishlist = useCallback(
    (productId: number) => {
      if (isInWishlist(productId)) {
        removeFromWishlist(productId);
        toast.success("উইশলিস্ট থেকে সরানো হয়েছে");
      } else {
        addToWishlist(productId);
        toast.success("উইশলিস্টে যোগ করা হয়েছে");
      }
    },
    [isInWishlist, removeFromWishlist, addToWishlist]
  );

  // add to cart
  const handleAddToCart = useCallback(
    async (product: Product) => {
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id, quantity: 1 }),
        });

        if (!res.ok && res.status !== 401) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "কার্টে যোগ করতে সমস্যা হয়েছে");
        }

        addToCart(product.id, 1);
        toast.success(`"${product.name}" কার্টে যোগ করা হয়েছে`);
      } catch (err) {
        console.error("Error adding to cart:", err);
        toast.error(err instanceof Error ? err.message : "কার্টে যোগ করতে সমস্যা হয়েছে");
      }
    },
    [addToCart]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7fb] flex items-center justify-center">
        <p className="text-gray-600">ডাটা লোড হচ্ছে...</p>
      </div>
    );
  }

  return (
    <CategoryPage
      category={category}
      categoryProducts={categoryProducts}
      categoryCount={categoryCount}
      loading={loading}
      error={error}
      toggleWishlist={toggleWishlist}
      handleAddToCart={handleAddToCart}
      isInWishlist={isInWishlist}
    />
  );
}