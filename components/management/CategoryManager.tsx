"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Plus,
  Edit3,
  Trash2,
  ChevronRight,
  ChevronDown,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: number;
  name: string;
  parentId: number | null;
  image?: string | null;
  productCount?: number;
  childrenCount?: number;
}

export default function CategoryManager({
  categories,
  loading,
  onCreate,
  onUpdate,
  onDelete,
}: any) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createParent, setCreateParent] = useState<Category | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [form, setForm] = useState({
    name: "",
    parentId: null as number | null,
    image: null as string | null,
  });

  useEffect(() => {
    return () => {
      if (imagePreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const buildTree = (items: Category[]) => {
    const map = new Map<number, any>();
    const roots: any[] = [];

    items.forEach((item) => {
      map.set(item.id, { ...item, children: [] });
    });

    items.forEach((item) => {
      if (item.parentId) {
        map.get(item.parentId)?.children.push(map.get(item.id));
      } else {
        roots.push(map.get(item.id));
      }
    });

    return roots;
  };

  const filtered = useMemo(() => {
    return categories?.filter((c: any) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [categories, searchTerm]);

  const treeData = useMemo(() => buildTree(filtered || []), [filtered]);

  const toggle = (id: number) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderNode = (node: any, level = 0) => {
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} className="min-w-0">
        <div
          className={cn(
            "group rounded-md px-2 py-3 transition hover:bg-primary/10 sm:px-3",
            hasChildren && "cursor-pointer",
          )}
          style={{ paddingLeft: `${Math.min(level * 16, 48)}px` }}
          onClick={() => hasChildren && toggle(node.id)}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(node.id);
                  }}
                  className="shrink-0 rounded p-1 hover:bg-muted"
                >
                  {expanded[node.id] ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
              ) : (
                <div className="w-6 shrink-0" />
              )}

              {node.image ? (
                <img
                  src={node.image}
                  alt={node.name}
                  className="h-9 w-9 shrink-0 rounded border bg-muted object-cover sm:h-7 sm:w-7"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border bg-muted text-[10px] text-muted-foreground sm:h-7 sm:w-7">
                  {(node.name?.[0] || "?").toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate font-medium">{node.name}</p>
                <p className="text-xs text-muted-foreground">
                  {node.productCount || 0} products
                </p>
              </div>
            </div>

            <div
              className="grid grid-cols-3 gap-2 sm:flex sm:shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Button size="sm" variant="outline" onClick={() => openAddModal(node)}>
                <Plus size={14} />
                <span className="ml-1 sm:hidden">Add</span>
              </Button>

              <Button size="sm" variant="outline" onClick={() => openEditModal(node)}>
                <Edit3 size={14} />
                <span className="ml-1 sm:hidden">Edit</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteLocal(node.id)}
                className="text-destructive"
              >
                <Trash2 size={14} />
                <span className="ml-1 sm:hidden">Del</span>
              </Button>
            </div>
          </div>
        </div>

        {hasChildren && expanded[node.id] && (
          <div className="mt-1 space-y-1">
            {node.children.map((child: any) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setCreateParent(null);
    setSubmitting(false);
    setImageFile(null);
    setImagePreviewUrl(null);
    setFileInputKey((k) => k + 1);
    setForm({ name: "", parentId: null, image: null });
  };

  const openAddModal = (parent: Category | null = null) => {
    setEditing(null);
    setCreateParent(parent);
    setSubmitting(false);
    setImageFile(null);
    setImagePreviewUrl(null);
    setFileInputKey((k) => k + 1);
    setForm({ name: "", parentId: parent?.id ?? null, image: null });
    setModalOpen(true);
  };

  const openEditModal = (cat: any) => {
    setEditing(cat);
    setCreateParent(null);
    setSubmitting(false);
    setImageFile(null);
    setImagePreviewUrl(cat.image ?? null);
    setFileInputKey((k) => k + 1);
    setForm({ name: cat.name, parentId: cat.parentId, image: cat.image ?? null });
    setModalOpen(true);
  };

  const uploadCategoryImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.fileUrl) {
      throw new Error(data?.error || "Image upload failed");
    }

    return data.fileUrl as string;
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter category name");
      return;
    }

    try {
      setSubmitting(true);

      let imageUrl = form.image ?? null;
      if (imageFile) {
        imageUrl = await uploadCategoryImage(imageFile);
      }

      const payload = {
        name: form.name,
        parentId: form.parentId,
        image: imageUrl,
      };

      if (editing) {
        await onUpdate(editing.id, payload);
        toast.success("Category updated");
      } else {
        await onCreate(payload);
        toast.success("Category created");
      }

      closeModal();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save category");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLocal = async (id: number) => {
    if (!confirm("Delete this category?")) return;
    await onDelete(id);
    toast.success("Deleted");
  };

  return (
    <div className="w-full p-3 sm:p-5 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">Category Management</h1>

        <Button className="w-full sm:w-auto" onClick={() => openAddModal(null)}>
          <Plus size={16} className="mr-2" />
          Add Root Category
        </Button>
      </div>

      <div className="relative mb-5">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={16}
        />
        <Input
          className="h-11 pl-10"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-x-hidden rounded-lg border bg-card p-2 sm:p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, index) => (
              <div
                key={index}
                className="flex flex-col gap-3 rounded-md px-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 animate-pulse rounded bg-muted" />
                  <div className="h-9 w-9 animate-pulse rounded border bg-muted" />
                  <div>
                    <div className="mb-2 h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:flex">
                  <div className="h-8 animate-pulse rounded bg-muted sm:w-8" />
                  <div className="h-8 animate-pulse rounded bg-muted sm:w-8" />
                  <div className="h-8 animate-pulse rounded bg-muted sm:w-8" />
                </div>
              </div>
            ))}
          </div>
        ) : treeData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No categories found
          </p>
        ) : (
          <div className="space-y-1">{treeData.map((node) => renderNode(node))}</div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={closeModal}
        >
          <div
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-card p-4 shadow-lg sm:max-w-xl sm:rounded-lg sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold sm:text-xl">
                {editing
                  ? "Edit Category"
                  : createParent
                    ? `Add Subcategory: ${createParent.name}`
                    : "New Root Category"}
              </h2>

              <Button
                size="icon"
                variant="ghost"
                onClick={closeModal}
                aria-label="Close modal"
                className="shrink-0"
              >
                <X size={18} />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  className="mt-1 h-11"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Image</Label>

                <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted sm:h-14 sm:w-14">
                    {imagePreviewUrl ? (
                      <img
                        src={imagePreviewUrl}
                        alt="Category image preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        No image
                      </span>
                    )}
                  </div>

                  <Input
                    key={fileInputKey}
                    type="file"
                    accept="image/*"
                    className="h-auto"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      if (!file) return;

                      if (imagePreviewUrl?.startsWith("blob:")) {
                        URL.revokeObjectURL(imagePreviewUrl);
                      }

                      setImageFile(file);
                      setImagePreviewUrl(URL.createObjectURL(file));
                    }}
                  />
                </div>

                {(imagePreviewUrl || form.image) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full sm:w-auto"
                    onClick={() => {
                      if (imagePreviewUrl?.startsWith("blob:")) {
                        URL.revokeObjectURL(imagePreviewUrl);
                      }
                      setImageFile(null);
                      setImagePreviewUrl(null);
                      setFileInputKey((k) => k + 1);
                      setForm({ ...form, image: null });
                    }}
                  >
                    Remove image
                  </Button>
                )}
              </div>

              {!editing && (
                <div>
                  <Label>Type</Label>
                  <div className="mt-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                    {createParent
                      ? `Subcategory under "${createParent.name}"`
                      : "Root category"}
                  </div>
                </div>
              )}

              {editing && (
                <div>
                  <Label>Parent</Label>
                  <select
                    className="mt-1 h-11 w-full rounded-md border bg-background px-3 py-2"
                    value={form.parentId ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        parentId: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  >
                    <option value="">Root</option>
                    {categories
                      ?.filter((c: any) => c.id !== editing.id)
                      .map((cat: any) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </Button>

                <Button
                  onClick={handleSubmit}
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : editing ? "Update" : "Create"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}