"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Heart,
  Minus,
  Plus,
  Truck,
  ShieldCheck,
  RefreshCcw,
  CreditCard,
  Share2,
  Facebook,
  Instagram,
  MessageCircle,
  Copy,
  Star,
} from "lucide-react";
import ProductReviews from "@/components/ecommarce/ProductReviews";
import AddToCartButton from "@/components/ecommarce/AddToCartButton";
import RelatedProducts from "@/components/ecommarce/RelatedProducts";
import VariantSelector from "@/components/ecommarce/VariantSelector";
import { useCart } from "@/components/ecommarce/CartContext";
import { useWishlist } from "@/components/ecommarce/WishlistContext";
import { Product, Variant } from "@/types/product";

function moneyBDT(n: number) {
  return `৳${Math.round(n).toLocaleString("en-US")}`;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";

  return html
    .replace(/<img[^>]+alt="([^"]+)"[^>]*>/g, "$1")
    .replace(/<span[^>]*class="html-span[^"]*"[^>]*>(.*?)<\/span>/g, "$1")
    .replace(/class="[^"]*xexx8yu[^"]*"/g, "")
    .replace(/class="[^"]*xyri2b[^"]*"/g, "")
    .replace(/class="[^"]*x18d9i69[^"]*"/g, "")
    .replace(/class="[^"]*x1c1uobl[^"]*"/g, "")
    .replace(/class="[^"]*x1hl2dhg[^"]*"/g, "")
    .replace(/class="[^"]*x16tdsg8[^"]*"/g, "")
    .replace(/class="[^"]*x1vvkbs[^"]*"/g, "")
    .replace(/class="[^"]*x3nfvp2[^"]*"/g, "")
    .replace(/class="[^"]*x1j61x8r[^"]*"/g, "")
    .replace(/class="[^"]*x1fcty0u[^"]*"/g, "")
    .replace(/class="[^"]*xdj266r[^"]*"/g, "")
    .replace(/class="[^"]*xat24cr[^"]*"/g, "")
    .replace(/class="[^"]*xm2jcoa[^"]*"/g, "")
    .replace(/class="[^"]*x1mpyi22[^"]*"/g, "")
    .replace(/class="[^"]*xxymvpz[^"]*"/g, "")
    .replace(/class="[^"]*xlup9mm[^"]*"/g, "")
    .replace(/class="[^"]*x1kky2od[^"]*"/g, "")
    .replace(/class="\s*"/g, "")
    .replace(/<img[^>]+src="https:\/\/static\.xx\.fbcdn\.net[^>]*>/g, "")
    .replace(/<script[^>]*>.*?<\/script>/gis, "")
    .replace(/<style[^>]*>.*?<\/style>/gis, "")
    .replace(/on\w+="[^"]*"/g, "")
    .replace(/on\w+='[^']*'/g, "");
}

function saveText(price: number, originalPrice: number | null | undefined) {
  if (!originalPrice || originalPrice <= price) return null;
  const diff = originalPrice - price;
  const pct = Math.round((diff / originalPrice) * 100);
  return `Save ${moneyBDT(diff)} (${pct}% Off)`;
}

function getVariantOptionGroups(variant: Variant) {
  const options =
    variant && typeof variant.options === "object" && variant.options
      ? (variant.options as Record<string, string>)
      : {};
  return Object.entries(options);
}

function getDefaultVariant(product: Product | null): Variant | null {
  if (!product || !Array.isArray(product.variants) || product.variants.length === 0) {
    return null;
  }

  const variants = product.variants as Variant[];

  const activeInStock =
    variants.find(
      (variant: any) =>
        variant?.active !== false && toNumber(variant?.stock) > 0
    ) ?? null;

  if (activeInStock) return activeInStock;

  const activeVariant =
    variants.find((variant: any) => variant?.active !== false) ?? null;

  if (activeVariant) return activeVariant;

  return variants[0] ?? null;
}

export default function BookDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { addToCart, getQuantityByProductId, incProductQty, decProductQty } =
    useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [all, setAll] = useState<Product[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [activeImg, setActiveImg] = useState<string | null>(null);
  const [tab, setTab] = useState<"desc" | "spec" | "reviews">("desc");
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/products", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load products");

        const data = (await res.json()) as unknown[];
        if (!mounted) return;

        const list: Product[] = Array.isArray(data) ? (data as Product[]) : [];
        setAll(list);

        const found = list.find((item) => String(item.id) === String(id)) ?? null;
        if (!found) {
          setProduct(null);
          setErr("Product not found");
          return;
        }

        setProduct(found);

        const initialVariant = getDefaultVariant(found);
        setSelectedVariant(initialVariant);

        const firstImage =
          initialVariant?.image ||
          found.image ||
          (Array.isArray(found.gallery) ? found.gallery[0] : null) ||
          null;

        setActiveImg(firstImage);
      } catch (error: any) {
        if (!mounted) return;
        setErr(error?.message || "Something went wrong");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (!product) return;

    if (
      selectedVariant &&
      Array.isArray(product.variants) &&
      product.variants.some((v) => String(v.id) === String(selectedVariant.id))
    ) {
      return;
    }

    const fallbackVariant = getDefaultVariant(product);
    setSelectedVariant(fallbackVariant);
  }, [product, selectedVariant]);

  useEffect(() => {
    if (selectedVariant?.image) {
      setActiveImg(selectedVariant.image);
      return;
    }

    const fallback =
      product?.image ||
      (Array.isArray(product?.gallery) ? product.gallery[0] : null) ||
      null;

    setActiveImg(fallback);
  }, [product, selectedVariant]);

  const related = useMemo(() => {
    if (!product) return [];
    const categoryId = product.categoryId ?? product.category?.id ?? null;
    if (!categoryId) return [];

    return all
      .filter((item) => {
        const itemCategoryId = item.categoryId ?? item.category?.id ?? null;
        return (
          itemCategoryId === categoryId &&
          Boolean(item.featured) &&
          String(item.id) !== String(product.id)
        );
      })
      .slice(0, 10);
  }, [all, product]);

  const stock = useMemo(() => {
    if (selectedVariant) {
      return toNumber(selectedVariant.stock);
    }

    const variants = Array.isArray(product?.variants) ? product.variants : [];
    if (variants.length) {
      return variants.reduce((sum, variant) => {
        return sum + toNumber(variant.stock);
      }, 0);
    }

    return product?.available ? 10 : 0;
  }, [product, selectedVariant]);

  const images = useMemo(() => {
    const list: string[] = [];

    if (selectedVariant?.image) list.push(selectedVariant.image);
    else if (product?.image) list.push(product.image);

    if (Array.isArray(product?.gallery)) {
      product.gallery.forEach((image) => {
        if (image && !list.includes(image)) list.push(image);
      });
    }

    if (product?.image && !list.includes(product.image)) {
      list.unshift(product.image);
    }

    return list;
  }, [product, selectedVariant]);

  const groupedVariantOptions = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const variants = Array.isArray(product?.variants) ? product!.variants : [];

    variants.forEach((variant) => {
      const entries = getVariantOptionGroups(variant as Variant);
      entries.forEach(([key, value]) => {
        if (!map.has(key)) map.set(key, new Set());
        if (value) map.get(key)!.add(String(value));
      });
    });

    return Array.from(map.entries()).map(([name, values]) => ({
      name,
      values: Array.from(values),
    }));
  }, [product]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card-theme rounded-2xl border p-4 sm:p-6">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)_320px]">
            <div>
              <div className="h-[420px] rounded-2xl bg-muted animate-pulse" />
              <div className="mt-4 flex gap-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-20 w-20 rounded-xl bg-muted animate-pulse"
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="h-8 w-3/4 rounded bg-muted animate-pulse" />
              <div className="h-5 w-40 rounded bg-muted animate-pulse" />
              <div className="h-28 rounded bg-muted animate-pulse" />
              <div className="h-24 rounded bg-muted animate-pulse" />
              <div className="h-16 rounded bg-muted animate-pulse" />
            </div>

            <div className="rounded-2xl bg-muted animate-pulse min-h-[320px]" />
          </div>
        </div>
      </div>
    );
  }

  if (err || !product) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="font-semibold text-destructive">
            {err || "Product not found"}
          </div>
          <button
            onClick={() => router.back()}
            className="btn-primary mt-4 rounded-lg px-4 py-2 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const displayPrice = selectedVariant
    ? toNumber(selectedVariant.price)
    : toNumber(product.basePrice);

  const displayOriginalPrice = selectedVariant
    ? (selectedVariant as any).originalPrice != null
      ? toNumber((selectedVariant as any).originalPrice)
      : null
    : product.originalPrice != null
      ? toNumber(product.originalPrice)
      : null;

  const badge = saveText(displayPrice, displayOriginalPrice);
  const basePrice = toNumber(product.basePrice);
  const hasMultipleVariants = (product.variants?.length ?? 0) > 1;
  const selectionRequired = hasMultipleVariants && !selectedVariant;
  const purchaseDisabled = selectionRequired || stock <= 0;
  const stockLabel = selectionRequired
    ? "Select variant"
    : stock > 0
      ? "In Stock"
      : "Out of Stock";
  const stockClassName = selectionRequired
    ? "text-amber-600 dark:text-amber-400"
    : stock > 0
      ? "text-green-600 dark:text-green-400"
      : "text-destructive";

  const cartQty = getQuantityByProductId(product.id, selectedVariant?.id ?? null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <section className="card-theme rounded-[20px] border shadow-sm">
          <div className="grid gap-6 p-4 md:p-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)_320px]">
            <div>
              <div
                className="relative h-[360px] w-full overflow-hidden rounded-[18px] border border-border bg-card sm:h-[460px]"
                onMouseMove={(event) => {
                  const { left, top, width, height } =
                    event.currentTarget.getBoundingClientRect();
                  const x = ((event.clientX - left) / width) * 100;
                  const y = ((event.clientY - top) / height) * 100;
                  setZoomPos({ x, y });
                }}
                onMouseEnter={() => setIsZooming(true)}
                onMouseLeave={() => setIsZooming(false)}
                style={{ cursor: "zoom-in" }}
              >
                {badge && (
                  <div className="absolute left-3 top-3 z-10">
                    <span className="inline-flex rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
                      {badge}
                    </span>
                  </div>
                )}

                {activeImg ? (
                  <div
                    className="h-full w-full bg-no-repeat transition-[background-size,background-position] duration-75"
                    style={{
                      backgroundImage: `url(${activeImg})`,
                      backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                      backgroundSize: isZooming ? "220%" : "contain",
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    No Image
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  {images.map((src) => {
                    const isActive = src === activeImg;

                    return (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setActiveImg(src)}
                        className={[
                          "relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border bg-card transition",
                          isActive
                            ? "border-primary ring-2 ring-primary/20"
                            : "border-border hover:border-primary/50",
                        ].join(" ")}
                      >
                        <Image
                          src={src}
                          alt="thumb"
                          fill
                          className="object-contain p-1"
                          sizes="80px"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold leading-tight text-foreground sm:text-2xl">
                    {product.name}
                  </h1>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const rating = Number(product.ratingAvg ?? 0);
                        const isFull = i < Math.floor(rating);
                        const isHalf = i === Math.floor(rating) && rating % 1 >= 0.5;
                        return (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              isFull || isHalf
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        );
                      })}
                    </div>

                    <span className="text-sm text-muted-foreground">
                      {Number(product.ratingAvg ?? 0).toFixed(1)}
                    </span>

                    <span className="text-sm text-muted-foreground">
                      ({Number(product.ratingCount ?? 0)}+)
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (isInWishlist(product.id)) {
                      await removeFromWishlist(product.id);
                    } else {
                      await addToWishlist(product.id);
                    }
                  }}
                  className={[
                    "inline-flex h-10 w-10 items-center justify-center rounded-full border transition",
                    isInWishlist(product.id)
                      ? "border-red-500 bg-red-50 text-red-500 hover:bg-red-100"
                      : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                  ].join(" ")}
                >
                  <Heart className={`h-5 w-5 ${isInWishlist(product.id) ? 'fill-current' : ''}`} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-sm">
                {product.category?.name ? (
                  <>
                    <div className="text-muted-foreground">Category</div>
                    <div className="font-medium text-foreground">
                      {product.category.name}
                    </div>
                  </>
                ) : null}

                {(product as any).fabric ? (
                  <>
                    <div className="text-muted-foreground">Fabric</div>
                    <div className="font-medium text-foreground">
                      {(product as any).fabric}
                    </div>
                  </>
                ) : null}

                {product.brand?.name ? (
                  <>
                    <div className="text-muted-foreground">Brand</div>
                    <div className="font-medium text-foreground">
                      {product.brand.name}
                    </div>
                  </>
                ) : null}

                {(selectedVariant as any)?.sku || product.sku ? (
                  <>
                    <div className="text-muted-foreground">SKU/Style</div>
                    <div className="font-medium text-foreground">
                      {(selectedVariant as any)?.sku ?? product.sku}
                    </div>
                  </>
                ) : null}
              </div>

              {product.shortDesc ? (
                <div
                  className="
                    mt-5 overflow-hidden text-sm leading-7 text-muted-foreground
                    [&_table]:mt-4 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden
                    [&_table]:rounded-xl [&_table]:border [&_table]:border-border
                    [&_thead]:bg-muted
                    [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-foreground
                    [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:align-top
                    [&_p]:mb-3 [&_ul]:mb-3 [&_ol]:mb-3 [&_li]:ml-5
                  "
                  dangerouslySetInnerHTML={{
                    __html: sanitizeHtml(product.shortDesc),
                  }}
                />
              ) : null}

              {groupedVariantOptions.length > 0 && (
                <div className="mt-6 space-y-4">
                  <div className="text-sm font-medium text-foreground">
                    Select Variant
                  </div>

                  <VariantSelector
                    variants={product.variants ?? []}
                    value={selectedVariant}
                    onChange={(variant) => setSelectedVariant(variant as Variant | null)}
                  />

                  {!hasMultipleVariants &&
                    groupedVariantOptions.map((group) => (
                      <div key={group.name}>
                        <div className="mb-2 text-sm font-medium text-foreground">
                          {group.name}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {group.values.map((value) => (
                            <span
                              key={value}
                              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <aside>
              <div className="overflow-hidden rounded-[18px] border border-border bg-card shadow-sm">
                <div className="bg-primary px-5 py-4 text-primary-foreground">
                  <div className="flex items-end gap-2">
                    <div className="text-3xl font-bold">
                      {moneyBDT(displayPrice)}
                    </div>

                    {displayOriginalPrice &&
                      displayOriginalPrice > displayPrice && (
                        <div className="pb-1 text-sm line-through opacity-80">
                          {moneyBDT(displayOriginalPrice)}
                        </div>
                      )}
                  </div>

                  {/* Bundle-specific info */}
                  {product.type === "BUNDLE" && (product as any).bundleItemCount && (
                    <div className="mt-2 text-sm opacity-90">
                      <div className="font-medium">
                        {(product as any).bundleItemCount} items included
                      </div>
                      {(product as any).bundleSavings && (
                        <div className="text-green-300">
                          Save {(product as any).bundleSavings}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-5">
                  <div className="mb-4 flex h-11 items-center justify-between rounded-lg border border-border bg-background px-2">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-accent disabled:opacity-50"
                      onClick={() =>
                        decProductQty(product.id, 1, selectedVariant?.id ?? null)
                      }
                      disabled={purchaseDisabled || cartQty <= 0}
                    >
                      <Minus className="h-4 w-4" />
                    </button>

                    <div className="text-sm font-semibold">{cartQty}</div>

                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-accent disabled:opacity-50"
                      onClick={() =>
                        incProductQty(product.id, 1, selectedVariant?.id ?? null)
                      }
                      disabled={purchaseDisabled}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {selectionRequired && (
                    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                      Please select a variant first.
                    </div>
                  )}

                  <div className="flex">
                    <div className=" w-full">
                      <AddToCartButton
                        productId={product.id}
                        variantId={selectedVariant?.id ?? null}
                        disabled={purchaseDisabled}
                      />
                    </div>
                    <div className=" w-full">
                      <button
                      type="button"
                      className="btn-primary h-11 w-full rounded-lg font-semibold transition hover:opacity-95 disabled:opacity-50"
                      disabled={purchaseDisabled}
                      onClick={() => {
                        if (
                          getQuantityByProductId(
                            product.id,
                            selectedVariant?.id ?? null
                          ) <= 0
                        ) {
                          addToCart(product.id, 1, selectedVariant?.id ?? null);
                        }
                        router.push("/ecommerce/checkout");
                      }}
                    >
                      Buy Now
                    </button>
                    </div>
                    
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-border bg-muted/30 px-3 py-1.5">
                      Stock: <span className={stockClassName}>{stockLabel}</span>
                    </span>

                    {product.brand?.name ? (
                      <span className="rounded-full border border-border bg-muted/30 px-3 py-1.5">
                        Brand: {product.brand.name}
                      </span>
                    ) : null}

                    {(selectedVariant as any)?.sku || product.sku ? (
                      <span className="rounded-full border border-border bg-muted/30 px-3 py-1.5">
                        SKU: {(selectedVariant as any)?.sku ?? product.sku}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <div className="card-theme mt-6 overflow-hidden rounded-[20px] border">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 sm:px-4">
            <button
              className={[
                "rounded-md px-4 py-2 text-sm font-semibold transition",
                tab === "desc"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              ].join(" ")}
              onClick={() => setTab("desc")}
            >
              Product Description
            </button>

            <button
              className={[
                "rounded-md px-4 py-2 text-sm font-semibold transition",
                tab === "spec"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              ].join(" ")}
              onClick={() => setTab("spec")}
            >
              Purchase & Delivery Policy
            </button>

            <button
              className={[
                "rounded-md px-4 py-2 text-sm font-semibold transition",
                tab === "reviews"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              ].join(" ")}
              onClick={() => setTab("reviews")}
            >
              Reviews
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {tab === "desc" && (
              <div>
                {/* Bundle items section */}
                {product.type === "BUNDLE" && (product as any).bundleItems && (product as any).bundleItems.length > 0 && (
                  <div className="mb-6 rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950">
                    <h3 className="mb-4 text-lg font-semibold text-purple-900 dark:text-purple-100">
                      What's Included in This Bundle
                    </h3>
                    <div className="space-y-3">
                      {(product as any).bundleItems.map((item: any, index: number) => (
                        <div key={item.id} className="flex items-center gap-3 rounded-lg bg-white p-3 dark:bg-purple-900/50">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-medium text-purple-600 dark:bg-purple-800 dark:text-purple-200">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-foreground">
                              {item.product.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Quantity: {item.quantity}
                            </div>
                          </div>
                          <div className="text-sm font-medium text-foreground">
                            {moneyBDT(
                              toNumber(
                                item?.product?.basePrice ??
                                  (item?.product as any)?.price
                              ) * toNumber(item?.quantity)
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-purple-900 dark:text-purple-100">
                          Regular Total:
                        </span>
                        <span className="font-medium line-through text-purple-900 dark:text-purple-100">
                          {moneyBDT(
                            (product as any).bundleItems.reduce(
                              (total: number, item: any) =>
                                total +
                                toNumber(
                                  item?.product?.basePrice ??
                                    (item?.product as any)?.price
                                ) *
                                  toNumber(item?.quantity),
                              0
                            )
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-semibold text-purple-900 dark:text-purple-100">
                          Bundle Price:
                        </span>
                        <span className="font-bold text-lg text-green-600">
                          {moneyBDT(displayPrice)}
                        </span>
                      </div>
                      {(product as any).bundleSavings && (
                        <div className="mt-2 text-center">
                          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                            You Save {(product as any).bundleSavings}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Regular product description */}
                <div
                  className="
                    prose prose-sm max-w-none dark:prose-invert
                    [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto
                    [&_thead]:bg-muted
                    [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
                    [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2
                    [&_img]:max-w-full [&_img]:h-auto
                  "
                >
                  {product.description ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(product.description),
                      }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No description available.
                    </p>
                  )}
                </div>
              </div>
            )}

            {tab === "spec" && (
              <div className="grid gap-3 text-sm text-muted-foreground">
                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium text-foreground">
                        Delivery Information
                      </div>
                      <div className="mt-1">
                        Fast delivery available depending on your location.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium text-foreground">
                        Product Specification
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="flex justify-between border-b border-border pb-2">
                          <span>Weight</span>
                          <span className="text-foreground">
                            {product.weight ? `${product.weight} kg` : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-border pb-2">
                          <span>Dimensions</span>
                          <span className="text-foreground">
                            {product.dimensions
                              ? JSON.stringify(product.dimensions)
                              : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-border pb-2">
                          <span>SKU</span>
                          <span className="text-foreground">
                            {(selectedVariant as any)?.sku ?? product.sku ?? "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Category</span>
                          <span className="text-foreground">
                            {product.category?.name ?? "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center gap-3">
                    <RefreshCcw className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium text-foreground">
                        Refund / Replacement
                      </div>
                      <div className="mt-1">
                        Replacement policy applies as per store rules and product
                        eligibility.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "reviews" && <ProductReviews productId={Number(product.id)} />}
          </div>
        </div>

        <div className="mt-3">
          <RelatedProducts
            products={related}
            currentProductId={product.id}
            categoryId={product.categoryId || product.category?.id}
          />
        </div>
      </div>
    </div>
  );
}

function MapPinIcon() {
  return (
    <div className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
      <Truck className="h-3.5 w-3.5" />
    </div>
  );
}