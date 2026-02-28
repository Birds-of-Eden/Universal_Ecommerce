"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import CategoryManager from "@/components/management/CategoryManager";

interface Category {
  id: number;
  name: string;
  slug?: string;
  parentId?: number | null;
  parentName?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    products: number;
  };
  childrenCount?: number;
}

interface CategoryCreatePayload {
  name: string;
  parentId?: number | null;
}

interface CategoryUpdatePayload {
  name?: string;
  parentId?: number | null;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  /* =========================
     FETCH
  ========================= */

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/categories", { cache: "no-store" });
      const data = await res.json();
      setCategories(data || []);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  /* =========================
     CREATE
  ========================= */

  const handleCreate = useCallback(
    async (payload: CategoryCreatePayload) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Create failed");

      const newCat = await res.json();

      setCategories((prev) => [newCat, ...prev]);
    },
    []
  );

  /* =========================
     UPDATE
  ========================= */

  const handleUpdate = useCallback(
    async (id: number, payload: CategoryUpdatePayload) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Update failed");

      const updated = await res.json();

      setCategories((prev) =>
        prev.map((cat) => (cat.id === id ? updated : cat))
      );
    },
    []
  );

  /* =========================
     DELETE (SOFT)
  ========================= */

  const handleDelete = useCallback(
    async (id: number) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      setCategories((prev) => prev.filter((cat) => cat.id !== id));
    },
    []
  );

  /* =========================
     MEMO
  ========================= */

  const memoizedCategories = useMemo(() => categories, [categories]);

  /* =========================
     SKELETONS (THEME SAFE)
  ========================= */

  const CategoryCardSkeleton = () => (
    <div className="card bg-card border rounded-lg p-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-muted rounded-lg"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-3 bg-muted rounded w-1/2"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-muted rounded"></div>
          <div className="h-8 w-8 bg-muted rounded"></div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-muted rounded"></div>
        <div className="h-3 bg-muted rounded w-5/6"></div>
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