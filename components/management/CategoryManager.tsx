"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit3, Trash2, Search, Zap } from "lucide-react";
import { toast } from "sonner";

export default function CategoryManager({
  categories,
  loading,
  onCreate,
  onUpdate,
  onDelete,
}: any) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    name: "",
    parentId: null as number | null,
  });

  const filtered = categories?.filter((cat: any) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const openAddModal = () => {
    setEditing(null);
    setForm({ name: "", parentId: null });
    setModalOpen(true);
  };

  const openEditModal = (cat: any) => {
    setEditing(cat);
    setForm({ name: cat.name, parentId: cat.parentId || null });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter category name");
      return;
    }

    setSubmitting(true);

    try {
      if (editing) {
        await onUpdate(editing.id, { name: form.name, parentId: form.parentId });
        toast.success("Category updated");
      } else {
        await onCreate({ name: form.name, parentId: form.parentId });
        toast.success("Category created");
      }

      setModalOpen(false);
      setForm({ name: "", parentId: null });
    } catch {
      toast.error("Error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLocal = async (id: number) => {
    if (!confirm("Are you sure?")) return;

    try {
      await onDelete(id);
      toast.success("Category deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold">
          Category Management
        </h1>
        <p className="text-muted-foreground mt-2">
          View, add and manage categories
        </p>
      </div>

      {/* Top Bar */}
      <div className="flex justify-between gap-3 items-center mb-8">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            className="pl-10 input-theme"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button onClick={openAddModal} className="btn-primary">
          <Plus className="h-4 w-4 mr-1" />
          New Category
        </Button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((cat: any) => (
            <Card key={cat.id} className="card-theme shadow-md">
              <div className="h-40 bg-muted flex justify-center items-center">
                <img
                  src="/assets/categories.png"
                  alt="Category"
                  className="h-full w-full object-contain p-4"
                />
              </div>

              <CardContent className="p-5">
                <h3 className="text-xl font-semibold">
                  {cat.parentName && (
                    <span className="text-sm text-muted-foreground block">{cat.parentName} / </span>
                  )}
                  {cat.name}
                </h3>

                <p className="text-muted-foreground text-sm mb-4">
                  Total Products: {cat._count?.products || 0}
                  {cat.childrenCount > 0 && (
                    <span className="ml-2">• Subcategories: {cat.childrenCount}</span>
                  )}
                </p>

                <div className="flex gap-2">
                  <Button
                    onClick={() => openEditModal(cat)}
                    className="w-full btn-primary"
                  >
                    <Edit3 className="h-4 w-4 mr-1" /> Edit
                  </Button>

                  <Button
                    onClick={() => handleDeleteLocal(cat.id)}
                    variant="outline"
                    className="btn-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="card-theme rounded-lg w-full max-w-md shadow-lg">
            <div className="p-5 border-b border-[hsl(var(--color-border))]">
              <h3 className="text-2xl font-bold">
                {editing ? "Edit Category" : "New Category"}
              </h3>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <Label>Category Name</Label>
                <Input
                  className="input-theme"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Parent Category</Label>
                <select
                  className="w-full mt-1 px-3 py-2 border border-border rounded-md bg-background text-foreground input-theme"
                  value={form.parentId ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, parentId: e.target.value ? Number(e.target.value) : null })
                  }
                >
                  <option value="">None (Root Category)</option>
                  {categories
                    ?.filter((c: any) => !editing || c.id !== editing.id)
                    .map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="p-5 border-t border-[hsl(var(--color-border))] flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary"
              >
                <Zap className="h-4 w-4 mr-1" />
                {editing ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}