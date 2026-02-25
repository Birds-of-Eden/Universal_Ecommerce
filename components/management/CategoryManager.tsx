"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit3, Trash2, Search, Zap, Grid2X2 } from "lucide-react";
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
    image: "",
  });

  const filtered = categories?.filter((cat: any) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddModal = () => {
    setEditing(null);
    setForm({ name: "", image: "" });
    setModalOpen(true);
  };

  const openEditModal = (cat: any) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      image: cat.image || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("দয়া করে ক্যাটাগরির নাম লিখুন");
      return;
    }

    setSubmitting(true);

    try {
      if (editing) {
        await onUpdate(editing.id, { name: form.name });
        toast.success("Category updated");
      } else {
        await onCreate({ name: form.name });
        toast.success("Category created");
      }

      setModalOpen(false);
      setForm({ name: "", image: "" });
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
    <div className="min-h-screen p-6 bg-gradient-to-br from-[#EEEFE0] to-[#D1D8BE]/30">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-2 h-10 bg-gradient-to-b from-[#2C4A3B] to-[#819A91] rounded-full"></div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#2C4A3B] to-[#819A91] bg-clip-text text-transparent">
            ক্যাটাগরি ব্যবস্থাপনা
          </h1>
          <div className="w-2 h-10 bg-gradient-to-b from-[#819A91] to-[#2C4A3B] rounded-full"></div>
        </div>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          ক্যাটাগরি দেখুন, যোগ করুন ও ম্যানেজ করুন
        </p>
      </div>

      {/* Top Bar */}
      <div className="flex justify-between gap-3 items-center mb-8">
        <div className="relative w-64 border border-[#2C4A3B] rounded-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="ক্যাটাগরি খুঁজুন..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Button onClick={openAddModal} className="bg-emerald-600 text-white">
          <Plus className="h-4 w-4 mr-1" />
          নতুন ক্যাটাগরি
        </Button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-20">লোড হচ্ছে...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((cat: any) => (
            <Card key={cat.id} className="shadow">
              <div className="h-40 bg-gray-100 flex justify-center items-center">
                {cat.image ? (
                  <img
                    src={cat.image}
                    className="h-full w-full object-cover"
                    alt={cat.name}
                  />
                ) : (
                  <img
                    src="/assets/categories.png"
                    alt="Default category"
                    className="h-full w-full object-contain p-4"
                  />
                )}
              </div>

              <CardContent className="p-5">
                <h3 className="text-xl font-semibold">{cat.name}</h3>

                {/* 🔥 Updated: only count */}
                <p className="text-gray-500 text-sm mb-4">
                  Total Products: {cat._count?.products || 0}
                </p>

                <div className="flex gap-2">
                  <Button
                    onClick={() => openEditModal(cat)}
                    className="w-full bg-teal-600 text-white"
                  >
                    <Edit3 className="h-4 w-4 mr-1" /> এডিট
                  </Button>
                  <Button
                    onClick={() => handleDeleteLocal(cat.id)}
                    variant="outline"
                    className="border-red-500 text-red-500"
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
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-5 border-b">
              <h3 className="text-2xl font-bold">
                {editing ? "ক্যাটাগরি এডিট" : "নতুন ক্যাটাগরি"}
              </h3>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <Label>ক্যাটাগরি নাম</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div className="p-5 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                বাতিল
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-gradient-to-r from-teal-600 to-emerald-500 text-white"
              >
                <Zap className="h-4 w-4 mr-1" />
                {editing ? "আপডেট" : "তৈরি করুন"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
