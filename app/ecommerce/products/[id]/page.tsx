"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProductReviews from "@/components/ecommarce/ProductReviews";
import AddToCartButton from "@/components/ecommarce/AddToCartButton";
import { useCart } from "@/components/ecommarce/CartContext";

type Product = {
  id: number | string;
  name: string;
  slug?: string | null;
  sku?: string | null;
  model?: string | null;
  available?: boolean;
  featured?: boolean;

  image: string | null;
  gallery?: string[] | null;

  basePrice: number;
  originalPrice: number | null;
  currency?: string | null;

  description?: string | null;
  shortDesc?: string | null;
  dimensions?: any;
  weight?: number | null;

  categoryId?: number | null;
  category?: { id: number; name: string } | null;

  brand?: { id: number; name: string } | null;

  variants?: { id: number; stock?: number | null; price?: number | null }[];
};

function moneyBDT(n: number) {
  return `${Math.round(n).toLocaleString("en-US")}৳`;
}

function isDiscounted(p: Product) {
  return !!p.originalPrice && p.originalPrice > p.basePrice;
}

function saveText(p: Product) {
  if (!p.originalPrice || p.originalPrice <= p.basePrice) return null;
  const diff = p.originalPrice - p.basePrice;
  const pct = Math.round((diff / p.originalPrice) * 100);
  return `Save: ${moneyBDT(diff)} (-${pct}%)`;
}

export default function BookDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { addToCart, getQuantityByProductId, incProductQty, decProductQty } =
    useCart();

  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [all, setAll] = useState<Product[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [activeImg, setActiveImg] = useState<string | null>(null);
  const [tab, setTab] = useState<"desc" | "spec" | "reviews">("desc");

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

        const data = (await res.json()) as any[];
        if (!mounted) return;

        const list: Product[] = Array.isArray(data) ? data : [];
        setAll(list);

        const found = list.find((p) => String(p.id) === String(id)) ?? null;
        if (!found) {
          setProduct(null);
          setErr("Product not found");
          return;
        }

        setProduct(found);

        const first =
          found.image ||
          (Array.isArray(found.gallery) ? found.gallery[0] : null) ||
          null;
        setActiveImg(first);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || "Something went wrong");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  const related = useMemo(() => {
    if (!product) return [];
    const cid = product.categoryId ?? product.category?.id ?? null;
    if (!cid) return [];

    return all
      .filter((p) => {
        const pcid = p.categoryId ?? p.category?.id ?? null;
        return (
          pcid === cid &&
          Boolean(p.featured) === true &&
          String(p.id) !== String(product.id)
        );
      })
      .slice(0, 10);
  }, [all, product]);

  // ✅ STOCK: sum variants stocks (your API stores stock inside variants)
  const stock = useMemo(() => {
    const variants = Array.isArray(product?.variants) ? product!.variants! : [];
    if (variants.length) {
      return variants.reduce((sum, v) => {
        const s = typeof v?.stock === "number" ? v.stock : Number(v?.stock);
        return sum + (Number.isFinite(s) ? s : 0);
      }, 0);
    }
    // fallback if variants missing
    return product?.available ? 10 : 0;
  }, [product]);

  const images = useMemo(() => {
    const arr: string[] = [];
    if (product?.image) arr.push(product.image);
    if (Array.isArray(product?.gallery)) {
      product!.gallery!.forEach((g) => {
        if (g && !arr.includes(g)) arr.push(g);
      });
    }
    return arr;
  }, [product]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Product Details Skeleton */}
        <div className="card-theme rounded-xl p-4 sm:p-6 mb-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Product Image Skeleton */}
            <div>
              <div className="w-full h-[320px] sm:h-[380px] bg-muted animate-pulse rounded-xl" />
              <div className="mt-4 flex gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 w-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            </div>

            {/* Product Info Skeleton */}
            <div className="space-y-4">
              <div className="h-8 w-3/4 bg-muted animate-pulse rounded" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-6 w-20 bg-muted animate-pulse rounded" />
                ))}
              </div>
              <div className="h-16 w-full bg-muted animate-pulse rounded" />
              <div className="space-y-2">
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                <div className="h-8 w-32 bg-muted animate-pulse rounded" />
              </div>
              <div className="h-11 w-40 bg-muted animate-pulse rounded" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-11 bg-muted animate-pulse rounded" />
                <div className="h-11 bg-muted animate-pulse rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="card-theme rounded-xl overflow-hidden mb-6">
          <div className="flex gap-2 border-b border-border px-3 sm:px-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 w-24 bg-muted animate-pulse rounded" />
            ))}
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 bg-muted animate-pulse rounded" style={{ width: `${Math.random() * 40 + 60}%` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Related Products Skeleton */}
        <div className="card-theme rounded-xl overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-border">
            <div className="h-6 w-48 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </div>
          
          <div className="p-4 sm:p-6">
            {/* Mobile Skeleton */}
            <div className="lg:hidden space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4 p-4 border border-border rounded-xl">
                  <div className="h-20 w-20 bg-muted animate-pulse rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                    <div className="h-6 w-24 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Skeleton */}
            <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="border border-border rounded-xl overflow-hidden">
                  <div className="h-48 bg-muted animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                    <div className="h-6 w-24 bg-muted animate-pulse rounded" />
                    <div className="flex justify-between items-center">
                      <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                      <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* View All Button Skeleton */}
            <div className="mt-8 text-center">
              <div className="h-12 w-64 mx-auto bg-muted animate-pulse rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (err || !product) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-destructive font-semibold">
            {err || "Product not found"}
          </div>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 btn-primary rounded-lg transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const badge = saveText(product);

  // ✅ cart quantity (single source of truth)
  const cartQty = getQuantityByProductId(product.id);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr] gap-6">
          <section className="card-theme rounded-xl p-4 sm:p-6">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div
                  className="relative w-full h-[320px] sm:h-[380px] bg-card rounded-xl border border-border overflow-hidden"
                  onMouseMove={(e) => {
                    const { left, top, width, height } =
                      e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - left) / width) * 100;
                    const y = ((e.clientY - top) / height) * 100;
                    setZoomPos({ x, y });
                  }}
                  onMouseEnter={() => setIsZooming(true)}
                  onMouseLeave={() => setIsZooming(false)}
                  style={{ cursor: "zoom-in" }}
                >
                  {badge && (
                    <div className="absolute left-3 top-3 z-10">
                      <span className="h-6 px-2 inline-flex items-center text-[11px] font-semibold rounded bg-primary text-primary-foreground">
                        {badge}
                      </span>
                    </div>
                  )}

                  {activeImg ? (
                    <div
                      className="w-full h-full bg-no-repeat transition-[background-size,background-position] duration-75"
                      style={{
                        backgroundImage: `url(${activeImg})`,
                        backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                        backgroundSize: isZooming ? "250%" : "contain",
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      No Image
                    </div>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="mt-4 flex gap-3 overflow-auto pb-1">
                    {images.map((src) => {
                      const active = src === activeImg;
                      return (
                        <button
                          key={src}
                          type="button"
                          onClick={() => setActiveImg(src)}
                          className={[
                            "relative h-16 w-16 rounded-lg border bg-card overflow-hidden shrink-0",
                            active
                              ? "border-primary ring-2 ring-primary/30"
                              : "border-border hover:border-primary/60",
                          ].join(" ")}
                          aria-label="Thumbnail"
                        >
                          <Image
                            src={src}
                            alt="thumb"
                            fill
                            className="object-contain p-2"
                            sizes="64px"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <h1 className="text-lg sm:text-xl font-bold text-foreground">
                  {product.name}
                </h1>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded border border-border bg-muted/30">
                    Stock:{" "}
                    <span
                      className={
                        stock > 0
                          ? "text-green-600 dark:text-green-400"
                          : "text-destructive"
                      }
                    >
                      {stock > 0 ? "In Stock" : "Out of Stock"}
                    </span>
                  </span>

                  {product.sku ? (
                    <span className="px-2 py-1 rounded border border-border bg-muted/30">
                      PID: {product.sku}
                    </span>
                  ) : null}

                  {product.brand?.name ? (
                    <span className="px-2 py-1 rounded border border-border bg-muted/30">
                      Brand: {product.brand.name}
                    </span>
                  ) : null}

                  {product.model ? (
                    <span className="px-2 py-1 rounded border border-border bg-muted/30">
                      Model: {product.model}
                    </span>
                  ) : null}

                  {product.category?.name ? (
                    <span className="px-2 py-1 rounded border border-border bg-muted/30">
                      Category: {product.category.name}
                    </span>
                  ) : null}
                </div>

                {product.shortDesc ? (
                  <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
                    {product.shortDesc}
                  </p>
                ) : null}

                <div className="mt-6">
                  <div className="text-sm text-muted-foreground">
                    {isDiscounted(product) ? "Discount Price" : "Price"}
                  </div>

                  <div className="mt-1 flex items-end gap-3">
                    <div className="text-2xl font-bold text-destructive">
                      {moneyBDT(product.basePrice ?? 0)}
                    </div>

                    {isDiscounted(product) && (
                      <div className="text-sm text-muted-foreground line-through">
                        {moneyBDT(product.originalPrice!)}
                      </div>
                    )}
                  </div>
                </div>

                {/* ✅ Cart-based +/- counter */}
                <div className="mt-6 grid grid-cols-[140px_1fr] gap-3">
                  <div className="h-11 rounded-lg border border-border flex items-center justify-between px-2 bg-card">
                    <button
                      type="button"
                      className="h-9 w-9 rounded-md hover:bg-accent transition"
                      onClick={() => decProductQty(product.id, 1)}
                      disabled={stock <= 0 || cartQty <= 0}
                    >
                      −
                    </button>

                    <div className="text-sm font-semibold">{cartQty}</div>

                    <button
                      type="button"
                      className="h-9 w-9 rounded-md hover:bg-accent transition"
                      onClick={() => incProductQty(product.id, 1)}
                      disabled={stock <= 0}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="grid grid-cols-2 gap-3">
                    {/* ✅ DISABLE AddToCartButton when out of stock */}
                    <AddToCartButton
                      productId={product.id}
                      disabled={stock <= 0}
                    />

                    <button
                      type="button"
                      className="h-11 btn-primary rounded-lg font-semibold hover:opacity-95 transition disabled:opacity-50"
                      disabled={stock <= 0}
                      onClick={() => {
                        // ✅ if not in cart, add 1 then go checkout
                        if (getQuantityByProductId(product.id) <= 0) {
                          addToCart(product.id, 1);
                        }
                        router.push("/ecommerce/checkout");
                      }}
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 card-theme rounded-xl overflow-hidden">
          <div className="flex gap-2 border-b border-border px-3 sm:px-4">
            <button
              className={[
                "px-4 py-3 text-sm font-semibold border-b-2 transition",
                tab === "desc"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
              onClick={() => setTab("desc")}
            >
              Description
            </button>

            <button
              className={[
                "px-4 py-3 text-sm font-semibold border-b-2 transition",
                tab === "spec"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
              onClick={() => setTab("spec")}
            >
              Specification
            </button>

            <button
              className={[
                "px-4 py-3 text-sm font-semibold border-b-2 transition",
                tab === "reviews"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
              onClick={() => setTab("reviews")}
            >
              Reviews
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {tab === "desc" && (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {product.description ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No description available.
                  </p>
                )}
              </div>
            )}

            {tab === "spec" && (
              <div className="text-sm text-muted-foreground space-y-2">
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
                  <span className="text-foreground">{product.sku ?? "—"}</span>
                </div>
              </div>
            )}

            {tab === "reviews" && (
              <ProductReviews productId={Number(product.id)} />
            )}
          </div>
        </div>

        {/* Related Products Section - Below Product Details */}
        {related.length > 0 && (
          <div className="mt-8 card-theme rounded-xl overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                Related Products
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Discover similar products in same category
              </p>
            </div>

            <div className="p-4 sm:p-6">
              {/* Mobile: Single column scrollable */}
              <div className="lg:hidden">
                <div className="space-y-4">
                  {related.slice(0, 5).map((p) => (
                    <Link
                      key={p.id}
                      href={`/ecommerce/products/${p.id}`}
                      className="flex gap-4 rounded-xl border border-border p-4 hover:bg-accent transition"
                    >
                      <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-card border border-border shrink-0">
                        {p.image ? (
                          <Image
                            src={p.image}
                            alt={p.name}
                            fill
                            className="object-contain p-2"
                            sizes="80px"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                            No Image
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-foreground line-clamp-2 mb-2">
                          {p.name}
                        </div>

                        <div className="flex items-end gap-2 mb-2">
                          <div className="text-lg font-bold text-primary">
                            {moneyBDT(p.basePrice ?? 0)}
                          </div>
                          {isDiscounted(p) && (
                            <div className="text-sm text-muted-foreground line-through">
                              {moneyBDT(p.originalPrice!)}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {p.featured && (
                            <span className="px-2 py-1 text-[10px] font-medium rounded bg-primary/10 text-primary">
                              Featured
                            </span>
                          )}
                          {p.category?.name && (
                            <span className="px-2 py-1 text-[10px] font-medium rounded bg-muted text-muted-foreground">
                              {p.category.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Desktop: Grid layout */}
              <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {related.map((p) => (
                  <Link
                    key={p.id}
                    href={`/ecommerce/products/${p.id}`}
                    className="group rounded-xl border border-border overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300"
                  >
                    <div className="relative h-48 bg-card border-b border-border overflow-hidden">
                      {p.image ? (
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                          No Image
                        </div>
                      )}

                      {isDiscounted(p) && (
                        <div className="absolute top-3 left-3">
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-destructive text-destructive-foreground">
                            {Math.round(
                              ((p.originalPrice! - p.basePrice) /
                                p.originalPrice!) *
                                100,
                            )}
                            % OFF
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                        {p.name}
                      </div>

                      <div className="flex items-end gap-2 mb-3">
                        <div className="text-lg font-bold text-primary">
                          {moneyBDT(p.basePrice ?? 0)}
                        </div>
                        {isDiscounted(p) && (
                          <div className="text-sm text-muted-foreground line-through">
                            {moneyBDT(p.originalPrice!)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {p.featured && (
                            <span className="px-2 py-1 text-[10px] font-medium rounded bg-primary/10 text-primary">
                              Featured
                            </span>
                          )}
                        </div>

                        <button className="px-3 py-1 text-xs font-medium rounded-lg bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          View Details
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* View All Button */}
              <div className="mt-8 text-center">
                <Link
                  href={`/ecommerce/categories/${product.categoryId}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  View All Products in This Category
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
