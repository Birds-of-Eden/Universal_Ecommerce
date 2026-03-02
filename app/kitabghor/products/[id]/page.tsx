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
  const { addToCart } = useCart();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [all, setAll] = useState<Product[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [activeImg, setActiveImg] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"desc" | "spec" | "reviews">("desc");

  // ✅ Zoom states (ecommerce magnifier style)
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [isZooming, setIsZooming] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setErr(null);

        // ✅ Using existing API
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

    // ✅ same category + featured true + not current
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

  // stock (simple)
  const stock = useMemo(() => {
    const v = product?.variants?.[0];
    const s = v?.stock;
    if (typeof s === "number") return s;
    // fallback
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
      <div className="container mx-auto px-4 py-10">
        <div className="h-8 w-56 bg-muted animate-pulse rounded mb-6" />
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          <div className="h-[620px] bg-muted animate-pulse rounded-xl" />
          <div className="h-[620px] bg-muted animate-pulse rounded-xl" />
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        {/* Top area */}
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* ✅ Related products (left) */}
          <aside className="card-theme rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border font-semibold text-card-foreground">
              Related Products
            </div>

            <div className="max-h-[620px] overflow-auto p-3 space-y-3">
              {related.length === 0 ? (
                <div className="text-sm text-muted-foreground px-2 py-3">
                  No featured related products found.
                </div>
              ) : (
                related.map((p) => (
                  <Link
                    key={p.id}
                    href={`/kitabghor/books/${p.id}`}
                    className="flex gap-3 rounded-xl border border-border p-3 hover:bg-accent transition"
                  >
                    <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-card border border-border shrink-0">
                      {p.image ? (
                        <Image
                          src={p.image}
                          alt={p.name}
                          fill
                          className="object-contain p-2"
                          sizes="56px"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
                          No Image
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-foreground line-clamp-2">
                        {p.name}
                      </div>

                      <div className="mt-1 flex items-end gap-2">
                        <div className="text-sm font-bold text-primary">
                          {moneyBDT(p.basePrice ?? 0)}
                        </div>
                        {isDiscounted(p) && (
                          <div className="text-[11px] text-muted-foreground line-through">
                            {moneyBDT(p.originalPrice!)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </aside>

          {/* ✅ Product main */}
          <section className="card-theme rounded-xl p-4 sm:p-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Gallery */}
              <div>
                {/* ✅ Ecommerce magnifier zoom */}
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

                {/* thumbnails */}
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

              {/* Info */}
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

                {/* Price */}
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

                {/* Qty + Buttons */}
                <div className="mt-6 grid grid-cols-[140px_1fr] gap-3">
                  <div className="h-11 rounded-lg border border-border flex items-center justify-between px-2 bg-card">
                    <button
                      type="button"
                      className="h-9 w-9 rounded-md hover:bg-accent transition"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                    >
                      −
                    </button>

                    <div className="text-sm font-semibold">{qty}</div>

                    <button
                      type="button"
                      className="h-9 w-9 rounded-md hover:bg-accent transition"
                      onClick={() => setQty((q) => Math.min(99, q + 1))}
                    >
                      +
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <AddToCartButton productId={product.id} />

                    <button
                      type="button"
                      className="h-11 btn-primary rounded-lg font-semibold hover:opacity-95 transition disabled:opacity-50"
                      disabled={stock <= 0}
                      onClick={() => {
                        addToCart(product.id, qty);
                        router.push("/kitabghor/checkout");
                      }}
                    >
                      Buy Now
                    </button>
                  </div>
                </div>

                {/* short desc */}
                {product.shortDesc ? (
                  <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
                    {product.shortDesc}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        </div>

        {/* Tabs section */}
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
                    // যদি HTML থাকে, এটা safe sanitize করা উচিত
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
                    {product.dimensions ? JSON.stringify(product.dimensions) : "—"}
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
      </div>
    </div>
  );
}