"use client";

import { useEffect, useState, useCallback } from "react";
import CategoryManager from "@/components/management/CategoryManager";

interface Category {
  id: number;
  name: string;
  slug?: string;
  image?: string | null;
  parentId?: number | null;
  parentName?: string | null;
  productCount?: number;
  childrenCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface CategoryCreatePayload {
  name: string;
  parentId?: number | null;
  image?: string | null;
}

interface CategoryUpdatePayload {
  name?: string;
  parentId?: number | null;
  image?: string | null;
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

  const handleCreate = async (payload: CategoryCreatePayload) => {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Create failed");

    await fetchCategories(); // ✅ refresh full tree
  };

  /* =========================
     UPDATE
  ========================= */

  const handleUpdate = async (
    id: number,
    payload: CategoryUpdatePayload
  ) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Update failed");

    await fetchCategories(); // ✅ refresh full tree
  };

  /* =========================
     DELETE
  ========================= */

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/categories/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Delete failed");

    await fetchCategories(); // ✅ refresh full tree
  };

  return (
    <CategoryManager
      categories={categories}
      loading={loading}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  );
}