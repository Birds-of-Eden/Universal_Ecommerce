"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import ProductManager from "@/components/management/ProductManager";

interface Product {
  id: number;
  name: string;
  description?: string;
  shortDesc?: string | null;
  basePrice: number;
  originalPrice?: number;
  currency?: string;
  type?: "PHYSICAL" | "DIGITAL" | "SERVICE";
  sku?: string | null;
  weight?: number | null;
  dimensions?: any;
  VatClassId?: number | null;
  digitalAssetId?: number | null;
  serviceDurationMinutes?: number | null;
  serviceLocation?: string | null;
  serviceOnlineLink?: string | null;
  image?: string;
  gallery?: string[];
  videoUrl?: string | null;
  available: boolean;
  featured?: boolean;
  categoryId?: number;
  brandId?: number | null;
  writerId?: number | null;
  publisherId?: number | null;
  category?: Category;
  brand?: Brand;
  writer?: Writer | null;
  publisher?: Publisher | null;
  variants?: any[];
}

interface Category {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
}

interface Writer {
  id: number;
  name: string;
}

interface Publisher {
  id: number;
  name: string;
}

interface VatClass {
  id: number;
  name: string;
  code: string;
}

interface DigitalAsset {
  id: number;
  title: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [vatClasses, setVatClasses] = useState<VatClass[]>([]);
  const [digitalAssets, setDigitalAssets] = useState<DigitalAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const [productsCache, setProductsCache] = useState<Map<string, Product[]>>(new Map());
  const [categoriesCache, setCategoriesCache] = useState<Map<string, Category[]>>(new Map());
  const [brandsCache, setBrandsCache] = useState<Map<string, Brand[]>>(new Map());
  const [writersCache, setWritersCache] = useState<Map<string, Writer[]>>(new Map());
  const [publishersCache, setPublishersCache] = useState<Map<string, Publisher[]>>(new Map());
  const [vatClassesCache, setVatClassesCache] = useState<Map<string, VatClass[]>>(new Map());
  const [digitalAssetsCache, setDigitalAssetsCache] = useState<Map<string, DigitalAsset[]>>(new Map());

  const loadAll = useCallback(async () => {
    setLoading(true);

    try {
      const cacheKey = "all";

      const cachedProducts = productsCache.get(cacheKey);
      const cachedCategories = categoriesCache.get(cacheKey);
      const cachedBrands = brandsCache.get(cacheKey);
      const cachedWriters = writersCache.get(cacheKey);
      const cachedPublishers = publishersCache.get(cacheKey);
      const cachedVatClasses = vatClassesCache.get(cacheKey);
      const cachedDigitalAssets = digitalAssetsCache.get(cacheKey);

      if (
        cachedProducts &&
        cachedCategories &&
        cachedBrands &&
        cachedWriters &&
        cachedPublishers &&
        cachedVatClasses &&
        cachedDigitalAssets
      ) {
        setProducts(cachedProducts);
        setCategories(cachedCategories);
        setBrands(cachedBrands);
        setWriters(cachedWriters);
        setPublishers(cachedPublishers);
        setVatClasses(cachedVatClasses);
        setDigitalAssets(cachedDigitalAssets);
        setLoading(false);
        return;
      }

      const [p, c, b, w, pub, vat, da] = await Promise.all([
        fetch("/api/products").then((r) => r.json()),
        fetch("/api/categories").then((r) => r.json()),
        fetch("/api/brands").then((r) => r.json()),
        fetch("/api/writers").then((r) => r.json()),
        fetch("/api/publishers").then((r) => r.json()),
        fetch("/api/vat-classes").then((r) => r.json()),
        fetch("/api/digital-assets").then((r) => r.json()),
      ]);

      setProductsCache((prev) => new Map(prev).set(cacheKey, p));
      setCategoriesCache((prev) => new Map(prev).set(cacheKey, c));
      setBrandsCache((prev) => new Map(prev).set(cacheKey, b));
      setWritersCache((prev) => new Map(prev).set(cacheKey, w));
      setPublishersCache((prev) => new Map(prev).set(cacheKey, pub));
      setVatClassesCache((prev) => new Map(prev).set(cacheKey, vat));
      setDigitalAssetsCache((prev) => new Map(prev).set(cacheKey, da));

      setProducts(p);
      setCategories(c);
      setBrands(b);
      setWriters(w);
      setPublishers(pub);
      setVatClasses(vat);
      setDigitalAssets(da);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  }, [
    productsCache,
    categoriesCache,
    brandsCache,
    writersCache,
    publishersCache,
    vatClassesCache,
    digitalAssetsCache,
  ]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const createProduct = useCallback(async (data: unknown) => {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Create failed");
    }

    const newProduct = await res.json();

    setProducts((prev) => [newProduct, ...prev]);

    setProductsCache((prev) => {
      const map = new Map(prev);
      const current = map.get("all") || [];
      map.set("all", [newProduct, ...current]);
      return map;
    });
  }, []);

  const updateProduct = useCallback(async (id: number, data: unknown) => {
    const res = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Update failed");
    }

    const updated = await res.json();

    setProducts((prev) =>
      prev.map((p) => (p.id === id ? updated : p))
    );

    setProductsCache((prev) => {
      const map = new Map(prev);
      const current = map.get("all") || [];
      map.set(
        "all",
        current.map((p) => (p.id === id ? updated : p))
      );
      return map;
    });

    return updated;
  }, []);

  const deleteProduct = useCallback(async (id: number) => {
    await fetch(`/api/products/${id}`, { method: "DELETE" });

    setProducts((prev) => prev.filter((p) => p.id !== id));

    setProductsCache(new Map());
  }, []);

  const memoizedProducts = useMemo(() => products, [products]);
  const memoizedCategories = useMemo(() => categories, [categories]);
  const memoizedBrands = useMemo(() => brands, [brands]);
  const memoizedWriters = useMemo(() => writers, [writers]);
  const memoizedPublishers = useMemo(() => publishers, [publishers]);
  const memoizedVatClasses = useMemo(() => vatClasses, [vatClasses]);
  const memoizedDigitalAssets = useMemo(() => digitalAssets, [digitalAssets]);

  return (
    <ProductManager
      products={memoizedProducts}
      categories={memoizedCategories}
      brands={memoizedBrands}
      writers={memoizedWriters}
      publishers={memoizedPublishers}
      vatClasses={memoizedVatClasses}
      digitalAssets={memoizedDigitalAssets}
      loading={loading}
      onCreate={createProduct}
      onUpdate={updateProduct}
      onDelete={deleteProduct}
    />
  );
}
