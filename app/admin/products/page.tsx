"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import ProductManager from "@/components/management/ProductManager";

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  stock: number;
  image?: string;
  writer?: Writer;
  publisher?: Publisher;
  category?: Category;
}

interface Writer {
  id: number;
  name: string;
}

interface Publisher {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [writers, setWriters] = useState<Writer[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsCache, setProductsCache] = useState<Map<string, Product[]>>(new Map());
  const [writersCache, setWritersCache] = useState<Map<string, Writer[]>>(new Map());
  const [publishersCache, setPublishersCache] = useState<Map<string, Publisher[]>>(new Map());
  const [categoriesCache, setCategoriesCache] = useState<Map<string, Category[]>>(new Map());

  // Memoize loadAll function with caching
  const loadAll = useCallback(async () => {
    setLoading(true);

    try {
      // Check caches first
      const productsCacheKey = "all";
      const writersCacheKey = "all";
      const publishersCacheKey = "all";
      const categoriesCacheKey = "all";

      const productsData = productsCache.get(productsCacheKey);
      const writersData = writersCache.get(writersCacheKey);
      const publishersData = publishersCache.get(publishersCacheKey);
      const categoriesData = categoriesCache.get(categoriesCacheKey);

      // If all data is cached, use cached data
      if (productsData && writersData && publishersData && categoriesData) {
        setProducts(productsData);
        setWriters(writersData);
        setPublishers(publishersData);
        setCategories(categoriesData);
        setLoading(false);
        return;
      }

      // Otherwise fetch fresh data
      const [p, w, pub, c] = await Promise.all([
        fetch("/api/products").then((r) => r.json()),
        fetch("/api/writers").then((r) => r.json()),
        fetch("/api/publishers").then((r) => r.json()),
        fetch("/api/categories").then((r) => r.json()),
      ]);

      // Update caches
      setProductsCache(prev => new Map(prev).set(productsCacheKey, p));
      setWritersCache(prev => new Map(prev).set(writersCacheKey, w));
      setPublishersCache(prev => new Map(prev).set(publishersCacheKey, pub));
      setCategoriesCache(prev => new Map(prev).set(categoriesCacheKey, c));

      setProducts(p);
      setWriters(w);
      setPublishers(pub);
      setCategories(c);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [productsCache, writersCache, publishersCache, categoriesCache]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Memoize CRUD operations
  const createProduct = useCallback(async (data: unknown) => {
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const newProd = await res.json();
    
    // Update state and cache
    setProducts((prev) => [newProd, ...prev]);
    setProductsCache(prev => {
      const newCache = new Map(prev);
      const current = newCache.get("all") || [];
      newCache.set("all", [newProd, ...current]);
      return newCache;
    });
  }, []);

  const updateProduct = useCallback(async (id: number, data: unknown) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update product");
      }

      const updated = await res.json();

      // Update UI state and cache
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setProductsCache(prev => {
        const newCache = new Map(prev);
        const current = newCache.get("all") || [];
        newCache.set("all", current.map((p) => (p.id === id ? updated : p)));
        return newCache;
      });

      return updated;
    } catch (error) {
      console.error("Update product error:", error);
      throw error;
    }
  }, []);

  const deleteProduct = useCallback(async (id: number) => {
    await fetch(`/api/products/${id}`, { method: "DELETE" });
    
    // Clear cache to force refresh
    setProductsCache(new Map());
    await loadAll(); // Refresh full product list from backend
  }, [loadAll]);

  // Memoize data to prevent unnecessary re-renders
  const memoizedProducts = useMemo(() => products, [products]);
  const memoizedWriters = useMemo(() => writers, [writers]);
  const memoizedPublishers = useMemo(() => publishers, [publishers]);
  const memoizedCategories = useMemo(() => categories, [categories]);

  return (
    <ProductManager
      products={memoizedProducts}
      writers={memoizedWriters}
      publishers={memoizedPublishers}
      categories={memoizedCategories}
      loading={loading}
      onCreate={createProduct}
      onUpdate={updateProduct}
      onDelete={deleteProduct}
    />
  );
}
