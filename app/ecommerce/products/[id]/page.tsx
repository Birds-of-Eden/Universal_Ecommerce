"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProductReviews from "@/components/ecommarce/ProductReviews";
import AddToCartButton from "@/components/ecommarce/AddToCartButton";
import RelatedProducts from "@/components/ecommarce/RelatedProducts";
import VariantSelector from "@/components/ecommarce/VariantSelector";
import { useCart } from "@/components/ecommarce/CartContext";
import { Product, Variant } from "@/types/product";


function moneyBDT(n: number) {
  return `${Math.round(n).toLocaleString("en-US")}৳`;
}

function toNumber(value: number | string | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  
  // Remove Facebook-specific classes and convert emoji images to actual emojis
  return html
    // Replace Facebook emoji images with actual emojis
    .replace(/<img[^>]+alt="([^"]+)"[^>]*>/g, '$1')
    // Remove Facebook span wrappers
    .replace(/<span[^>]*class="html-span[^"]*"[^>]*>(.*?)<\/span>/g, '$1')
    // Remove any remaining Facebook-specific classes
    .replace(/class="[^"]*xexx8yu[^"]*"/g, '')
    .replace(/class="[^"]*xyri2b[^"]*"/g, '')
    .replace(/class="[^"]*x18d9i69[^"]*"/g, '')
    .replace(/class="[^"]*x1c1uobl[^"]*"/g, '')
    .replace(/class="[^"]*x1hl2dhg[^"]*"/g, '')
    .replace(/class="[^"]*x16tdsg8[^"]*"/g, '')
    .replace(/class="[^"]*x1vvkbs[^"]*"/g, '')
    .replace(/class="[^"]*x3nfvp2[^"]*"/g, '')
    .replace(/class="[^"]*x1j61x8r[^"]*"/g, '')
    .replace(/class="[^"]*x1fcty0u[^"]*"/g, '')
    .replace(/class="[^"]*xdj266r[^"]*"/g, '')
    .replace(/class="[^"]*xat24cr[^"]*"/g, '')
    .replace(/class="[^"]*xm2jcoa[^"]*"/g, '')
    .replace(/class="[^"]*x1mpyi22[^"]*"/g, '')
    .replace(/class="[^"]*xxymvpz[^"]*"/g, '')
    .replace(/class="[^"]*xlup9mm[^"]*"/g, '')
    .replace(/class="[^"]*x1kky2od[^"]*"/g, '')
    // Clean up empty class attributes
    .replace(/class="\s*"/g, '')
    // Remove external Facebook image URLs
    .replace(/<img[^>]+src="https:\/\/static\.xx\.fbcdn\.net[^>]*>/g, '')
    // Basic HTML sanitization - keep only safe tags
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/on\w+="[^"]*"/g, '');
}

function saveText(price: number, originalPrice: number | null | undefined) {
  if (!originalPrice || originalPrice <= price) return null;
  const diff = originalPrice - price;
  const pct = Math.round((diff / originalPrice) * 100);
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

        const initialVariant =
          Array.isArray(found.variants) && found.variants.length === 1
            ? found.variants[0]
            : null;

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

    return list;
  }, [product, selectedVariant]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card-theme mb-6 rounded-xl p-4 sm:p-6">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <div className="h-[320px] w-full rounded-xl bg-muted animate-pulse sm:h-[380px]" />
              <div className="mt-4 flex gap-3">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-16 w-16 rounded-lg bg-muted animate-pulse"
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="h-8 w-3/4 rounded bg-muted animate-pulse" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-6 w-20 rounded bg-muted animate-pulse"
                  />
                ))}
              </div>
              <div className="h-16 w-full rounded bg-muted animate-pulse" />
              <div className="space-y-2">
                <div className="h-4 w-16 rounded bg-muted animate-pulse" />
                <div className="h-8 w-32 rounded bg-muted animate-pulse" />
              </div>
              <div className="h-11 w-40 rounded bg-muted animate-pulse" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-11 rounded bg-muted animate-pulse" />
                <div className="h-11 rounded bg-muted animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        <div className="card-theme mb-6 overflow-hidden rounded-xl">
          <div className="flex gap-2 border-b border-border px-3 sm:px-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-12 w-24 rounded bg-muted animate-pulse" />
            ))}
          </div>
          <div className="p-4 sm:p-6">
            <div className="space-y-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-4 rounded bg-muted animate-pulse"
                  style={{ width: `${Math.random() * 40 + 60}%` }}
                />
              ))}
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
    ? selectedVariant.originalPrice != null
      ? toNumber(selectedVariant.originalPrice)
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
        <div className="grid gap-6 lg:grid-cols-[1fr]">
          <section className="card-theme rounded-xl p-4 sm:p-6">
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <div
                  className="relative h-[320px] w-full overflow-hidden rounded-xl border border-border bg-card sm:h-[380px]"
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
                      <span className="inline-flex h-6 items-center rounded bg-primary px-2 text-[11px] font-semibold text-primary-foreground">
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
                        backgroundSize: isZooming ? "250%" : "contain",
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No Image
                    </div>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="mt-4 flex gap-3 overflow-auto pb-1">
                    {images.map((src) => {
                      const isActive = src === activeImg;

                      return (
                        <button
                          key={src}
                          type="button"
                          onClick={() => setActiveImg(src)}
                          className={[
                            "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-card",
                            isActive
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
                <div className="flex items-start justify-between gap-4">
                  <h1 className="text-lg font-bold text-foreground sm:text-xl">
                    {product.name}
                  </h1>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const rating = Number(product.ratingAvg ?? 0);
                        const isFull = i < Math.floor(rating);
                        const isHalf = i === Math.floor(rating) && rating % 1 >= 0.5;
                        return (
                          <span
                            key={i}
                            className={`text-[14px] ${
                              isFull || isHalf ? "text-yellow-400" : "text-muted-foreground/30"
                            }`}
                          >
                            ★
                          </span>
                        );
                      })}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {Number(product.ratingCount ?? 0) > 0
                        ? `${Number(product.ratingAvg ?? 0).toFixed(1)} (${Number(product.ratingCount)})`
                        : "No reviews"}
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded border border-border bg-muted/30 px-2 py-1">
                    Stock:{" "}
                    <span className={stockClassName}>{stockLabel}</span>
                  </span>

                  {selectedVariant?.sku ? (
                    <span className="rounded border border-border bg-muted/30 px-2 py-1">
                      SKU: {selectedVariant.sku}
                    </span>
                  ) : product.sku ? (
                    <span className="rounded border border-border bg-muted/30 px-2 py-1">
                      PID: {product.sku}
                    </span>
                  ) : null}

                  {product.brand?.name ? (
                    <span className="rounded border border-border bg-muted/30 px-2 py-1">
                      Brand: {product.brand.name}
                    </span>
                  ) : null}

                  {product.model ? (
                    <span className="rounded border border-border bg-muted/30 px-2 py-1">
                      Model: {product.model}
                    </span>
                  ) : null}

                  {product.category?.name ? (
                    <span className="rounded border border-border bg-muted/30 px-2 py-1">
                      Category: {product.category.name}
                    </span>
                  ) : null}
                </div>

                {product.shortDesc ? (
                  <div 
                    className="mt-6 text-sm leading-relaxed text-muted-foreground" 
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.shortDesc) }}
                  />
                ) : null}

                {Array.isArray(product.variants) && hasMultipleVariants && (
                  <div className="mt-6">
                    <div className="text-sm font-medium text-foreground mb-3">
                      Choose Your Variant
                    </div>
                    <VariantSelector
                      variants={product.variants}
                      value={selectedVariant}
                      onChange={(variant) => setSelectedVariant(variant as Variant | null)}
                    />
                  </div>
                )}

                <div className="mt-6">
                  {hasMultipleVariants ? (
                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                      <div className="text-sm text-muted-foreground">
                        Starting from
                      </div>
                      <div className="mt-1 flex items-end gap-3">
                        <div className="text-2xl font-bold text-foreground">
                          {moneyBDT(basePrice)}
                        </div>
                        {product.originalPrice != null &&
                          toNumber(product.originalPrice) > basePrice && (
                            <div className="text-sm text-muted-foreground line-through">
                              {moneyBDT(toNumber(product.originalPrice))}
                            </div>
                          )}
                      </div>

                      {selectedVariant ? (
                        <div className="mt-4 rounded-xl border border-primary/15 bg-background p-3">
                          <div className="text-sm font-medium text-foreground">
                            Selected variant price
                          </div>
                          <div className="mt-1 flex items-end gap-3">
                            <div className="text-2xl font-bold text-destructive">
                              {moneyBDT(displayPrice)}
                            </div>
                            {displayOriginalPrice &&
                              displayOriginalPrice > displayPrice && (
                                <div className="text-sm text-muted-foreground line-through">
                                  {moneyBDT(displayOriginalPrice)}
                                </div>
                              )}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 text-sm text-muted-foreground">
                          Select a variant to see the exact final price.
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-muted-foreground">
                        {displayOriginalPrice && displayOriginalPrice > displayPrice
                          ? "Discount Price"
                          : "Price"}
                      </div>

                      <div className="mt-1 flex items-end gap-3">
                        <div className="text-2xl font-bold text-destructive">
                          {moneyBDT(displayPrice)}
                        </div>

                        {displayOriginalPrice &&
                          displayOriginalPrice > displayPrice && (
                            <div className="text-sm text-muted-foreground line-through">
                              {moneyBDT(displayOriginalPrice)}
                            </div>
                          )}
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-6 grid grid-cols-[140px_1fr] gap-3">
                  <div className="flex h-11 items-center justify-between rounded-lg border border-border bg-card px-2">
                    <button
                      type="button"
                      className="h-9 w-9 rounded-md transition hover:bg-accent"
                      onClick={() => decProductQty(product.id, 1, selectedVariant?.id ?? null)}
                      
                      disabled={purchaseDisabled || cartQty <= 0}
                    >
                      −
                    </button>

                    <div className="text-sm font-semibold">{cartQty}</div>

                    <button
                      type="button"
                      className="h-9 w-9 rounded-md transition hover:bg-accent"
                      onClick={() => incProductQty(product.id, 1, selectedVariant?.id ?? null)}
                      disabled={purchaseDisabled}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  {selectionRequired && (
                    <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                      Please select a variant to enable cart and checkout.
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <AddToCartButton
                      productId={product.id}
                      variantId={selectedVariant?.id ?? null}
                      disabled={purchaseDisabled}
                    />

                    <button
                      type="button"
                      className="btn-primary h-11 rounded-lg font-semibold transition hover:opacity-95 disabled:opacity-50"
                      disabled={purchaseDisabled}
                      onClick={() => {
                        if (getQuantityByProductId(product.id, selectedVariant?.id ?? null) <= 0) {
                          addToCart(product.id, 1, selectedVariant?.id ?? null);
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

        <div className="card-theme mt-6 overflow-hidden rounded-xl">
          <div className="flex gap-2 border-b border-border px-3 sm:px-4">
            <button
              className={[
                "border-b-2 px-4 py-3 text-sm font-semibold transition",
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
                "border-b-2 px-4 py-3 text-sm font-semibold transition",
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
                "border-b-2 px-4 py-3 text-sm font-semibold transition",
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
                  <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No description available.
                  </p>
                )}
              </div>
            )}

            {tab === "spec" && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between border-b border-border pb-2">
                  <span>Weight</span>
                  <span className="text-foreground">
                    {product.weight ? `${product.weight} kg` : "—"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span>Dimensions</span>
                  <span className="text-foreground">
                    {product.dimensions ? JSON.stringify(product.dimensions) : "—"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span>SKU</span>
                  <span className="text-foreground">
                    {selectedVariant?.sku ?? product.sku ?? "—"}
                  </span>
                </div>
              </div>
            )}

            {tab === "reviews" && <ProductReviews productId={Number(product.id)} />}
          </div>
        </div>

        <div className="mt-2">
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
