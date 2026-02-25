"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import CategoryManager from "@/components/management/CategoryManager";

interface Category {
  id: number;
  name: string;
  description?: string;
  image?: string;
  parentId?: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryCreatePayload {
  name: string;
}

interface CategoryUpdatePayload {
  name: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesCache, setCategoriesCache] = useState<Map<string, Category[]>>(new Map());

  // Memoize fetch function with caching
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check cache first
      const cacheKey = "all";
      if (categoriesCache.has(cacheKey)) {
        const cachedData = categoriesCache.get(cacheKey);
        if (cachedData) {
          setCategories(cachedData);
          setLoading(false);
          return;
        }
      }

      const res = await fetch("/api/categories");
      const data = await res.json();
      
      // Update cache
      setCategoriesCache(prev => new Map(prev).set(cacheKey, data));
      setCategories(data);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoading(false);
    }
  }, [categoriesCache]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Memoize CRUD operations
  const handleCreate = useCallback(async (payload: CategoryCreatePayload) => {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const newCat = await res.json();

    // Update state and cache
    setCategories((prev) => [newCat, ...prev]);
    setCategoriesCache(prev => {
      const newCache = new Map(prev);
      const current = newCache.get("all") || [];
      newCache.set("all", [newCat, ...current]);
      return newCache;
    });
  }, []);

  const handleUpdate = useCallback(async (id: number, payload: CategoryUpdatePayload) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const updated = await res.json();

    // Update state and cache
    setCategories((prev) => prev.map((cat) => (cat.id === id ? updated : cat)));
    setCategoriesCache(prev => {
      const newCache = new Map(prev);
      const current = newCache.get("all") || [];
      newCache.set("all", current.map((cat) => (cat.id === id ? updated : cat)));
      return newCache;
    });
  }, []);

  const handleDelete = useCallback(async (id: number) => {
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    
    // Clear cache to force refresh
    setCategoriesCache(new Map());
    await fetchCategories(); // refresh list after soft delete
  }, [fetchCategories]);

  // Memoize data to prevent unnecessary re-renders
  const memoizedCategories = useMemo(() => categories, [categories]);

  // Skeleton loader components
  const CategoryCardSkeleton = () => (
    <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="flex space-x-2">
          <div className="h-8 w-8 bg-gray-200 rounded"></div>
          <div className="h-8 w-8 bg-gray-200 rounded"></div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  );

  const CategoriesGridSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }, (_, i) => (
        <CategoryCardSkeleton key={i} />
      ))}
    </div>
  );

  return (
    <CategoryManager
      categories={memoizedCategories}
      loading={loading}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      CategoryCardSkeleton={CategoryCardSkeleton}
      CategoriesGridSkeleton={CategoriesGridSkeleton}
    />
  );
}
