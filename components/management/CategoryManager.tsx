"use client";

import { useState, useMemo } from "react";
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
} from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: number;
  name: string;
  parentId: number | null;
  image?: string;
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

  const [form, setForm] = useState({
    name: "",
    parentId: null as number | null,
  });

  /* =========================
     BUILD TREE
  ========================= */

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

  /* =========================
     TOGGLE
  ========================= */

  const toggle = (id: number) => {
    setExpanded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  /* =========================
     RENDER TREE NODE
  ========================= */

  const renderNode = (node: any, level = 0) => {
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted transition",
            hasChildren && "cursor-pointer"
          )}
          style={{ paddingLeft: `${level * 24}px` }}
          onClick={() => hasChildren && toggle(node.id)}
        >
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(node.id);
                }}
                className="p-0"
              >
                {expanded[node.id] ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>
            ) : (
              <div className="w-4" />
            )}

            <span className="font-medium">{node.name}</span>

            <span className="text-xs text-muted-foreground ml-2">
              ({node.productCount || 0} products)
            </span>
          </div>

          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEditModal(node)}
            >
              <Edit3 size={14} />
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDeleteLocal(node.id)}
              className="text-destructive"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>

        {hasChildren && expanded[node.id] && (
          <div>
            {node.children.map((child: any) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  /* =========================
     CRUD
  ========================= */

  const openAddModal = () => {
    setEditing(null);
    setForm({ name: "", parentId: null });
    setModalOpen(true);
  };

  const openEditModal = (cat: any) => {
    setEditing(cat);
    setForm({ name: cat.name, parentId: cat.parentId });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter category name");
      return;
    }

    if (editing) {
      await onUpdate(editing.id, form);
      toast.success("Category updated");
    } else {
      await onCreate(form);
      toast.success("Category created");
    }

    setModalOpen(false);
  };

  const handleDeleteLocal = async (id: number) => {
    if (!confirm("Delete this category?")) return;
    await onDelete(id);
    toast.success("Deleted");
  };

  /* =========================
     UI
  ========================= */

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Category Management</h1>

        <Button onClick={openAddModal}>
          <Plus size={16} className="mr-2" />
          Add Category
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search
          className="absolute left-3 top-3 text-muted-foreground"
          size={16}
        />
        <Input
          className="pl-10"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tree */}
      <div className="border rounded-lg p-4 bg-card">
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : treeData.length === 0 ? (
          <p className="text-muted-foreground">No categories found</p>
        ) : (
          treeData.map((node) => renderNode(node))
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-card p-6 rounded-lg md:w-[40vw]">
            <h2 className="text-xl font-bold mb-4">
              {editing ? "Edit Category" : "New Category"}
            </h2>

            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <Label>Parent</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-background"
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
                    ?.filter((c: any) => !editing || c.id !== editing.id)
                    .map((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              <Button onClick={handleSubmit} className="w-full">
                {editing ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
