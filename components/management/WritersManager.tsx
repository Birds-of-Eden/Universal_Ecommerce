"use client";

import { useState } from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Edit3,
  Trash2,
  BookOpen,
  Users,
  Search,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface Writer {
  id: number;
  name: string;
  image?: string;
  _count?: {
    products: number;
  };
}

interface WritersManagerProps {
  writers: Writer[];
  loading: boolean;
  onCreate: (writer: { name: string; image?: string }) => Promise<void>;
  onUpdate: (id: number, writer: { name: string; image?: string }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function WritersManager({
  writers = [],
  loading = false,
  onCreate,
  onUpdate,
  onDelete,
}: WritersManagerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Writer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [form, setForm] = useState({
    name: "",
    image: "",
  });

  const filteredWriters = writers.filter((writer) =>
    writer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddModal = () => {
    setEditing(null);
    setForm({ name: "", image: "" });
    setModalOpen(true);
  };

  const openEditModal = (writer: Writer) => {
    setEditing(writer);
    setForm({
      name: writer.name,
      image: writer.image || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("দয়া করে লেখকের নাম পূরণ করুন");
      return;
    }

    setSubmitting(true);

    try {
      if (editing) {
        await onUpdate(editing.id, {
          name: form.name,
          image: form.image,
        });
        toast.success("লেখক সফলভাবে আপডেট করা হয়েছে");
      } else {
        await onCreate({
          name: form.name,
          image: form.image,
        });
        toast.success("নতুন লেখক সফলভাবে যোগ করা হয়েছে");
      }

      setModalOpen(false);
      setForm({ name: "", image: "" });
    } catch {
      toast.error("কিছু একটা সমস্যা হয়েছে");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLocal = async (id: number) => {
    if (!confirm("আপনি কি নিশ্চিত যে আপনি এই লেখকটি মুছে ফেলতে চান?")) return;

    try {
      await onDelete(id); // this now calls DELETE API and then re-fetches writers
      toast.success("লেখক সফলভাবে মুছে ফেলা হয়েছে");
    } catch (err) {
      toast.error("লেখক মুছতে সমস্যা হয়েছে");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEEFE0] to-[#D1D8BE]/30 p-6">
      <div>
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-2 h-10 bg-gradient-to-b from-[#2C4A3B] to-[#819A91] rounded-full"></div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#2C4A3B] to-[#819A91] bg-clip-text text-transparent">
              লেখক ব্যবস্থাপনা
            </h1>
            <div className="w-2 h-10 bg-gradient-to-b from-[#819A91] to-[#2C4A3B] rounded-full"></div>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            আপনার লাইব্রেরির লেখক এবং লেখিকাদের দক্ষতার সাথে পরিচালনা করুন
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 shadow-lg rounded-2xl">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">মোট লেখক</p>
                <h3 className="text-2xl font-bold">{writers?.length || 0}</h3>
              </div>
              <div className="p-3 bg-gradient-to-r from-[#819A91] to-[#A7C1A8] rounded-full">
                <Users className="h-6 w-6 text-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 shadow-lg rounded-2xl">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">মোট বই</p>
                <h3 className="text-2xl font-bold">
                  {writers?.reduce(
                    (acc: number, w: any) => acc + (w._count?.products || 0),
                    0
                  ) || 0}
                </h3>
              </div>
              <div className="p-3 bg-gradient-to-r from-[#2C4A3B] to-[#819A91] rounded-full">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2 bg-white/80 shadow-lg rounded-2xl">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="লেখক খুঁজুন..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 rounded-full"
                />
              </div>
              <Button
                onClick={openAddModal}
                className="rounded-full bg-gradient-to-r from-[#2C4A3B] to-[#819A91] text-white px-6"
              >
                <Plus className="h-4 w-4 mr-1" /> নতুন লেখক
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="bg-white/80 rounded-2xl shadow p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#819A91] mx-auto"></div>
            <p className="mt-4 text-lg">লেখক লোড হচ্ছে...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredWriters.map((writer) => (
              <Card
                key={writer.id}
                className="group bg-gradient-to-br from-white to-[#EEEFE0] rounded-2xl shadow-lg hover:shadow-2xl transition"
              >
                <div className="relative h-48">
                  {writer.image ? (
                    <Image
                      src={writer.image}
                      alt={`${writer.name}'s profile`}
                      fill
                      className="object-cover rounded-t-2xl group-hover:scale-110 transition"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#819A91] flex items-center justify-center">
                      <Users className="h-16 w-16 text-white/70" />
                    </div>
                  )}

                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 flex gap-2 transition">
                    <Button
                      size="sm"
                      onClick={() => openEditModal(writer)}
                      className="rounded-full text-gray-600 hover:text-white bg-white/90 shadow"
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleDeleteLocal(writer.id)}
                      className="rounded-full bg-red-500 text-white shadow"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <CardContent className="p-5">
                  <h3 className="font-bold text-xl text-gray-800 mb-2">
                    {writer.name}
                  </h3>

                  <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                    <BookOpen className="h-3 w-3 text-gray-500" /> Total Books:
                    <span>{writer._count?.products || 0}</span>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <Button
                      onClick={() => openEditModal(writer)}
                      variant="outline"
                      className="w-full bg-[#52aa8a] text-white hover:bg-[#2d6852] hover:text-white"
                    >
                      <Edit3 className="h-3 w-3 mr-1" /> এডিট
                    </Button>
                    <Button
                      onClick={() => handleDeleteLocal(writer.id)}
                      variant="outline"
                      className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredWriters?.length === 0 && (
          <Card className="bg-white/80 shadow rounded-2xl p-12 text-center">
            <h3 className="text-2xl font-bold">কোন লেখক পাওয়া যায়নি</h3>
            <p className="text-gray-600 mt-2 mb-6">
              আপনার অনুসন্ধানের সাথে মিল নেই।
            </p>
            <Button
              onClick={openAddModal}
              className="rounded-full bg-gradient-to-r from-[#2C4A3B] to-[#819A91] text-white px-6"
            >
              <Plus className="h-4 w-4 mr-1" /> নতুন লেখক যোগ করুন
            </Button>
          </Card>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h3 className="text-2xl font-bold">
                {editing ? "লেখক এডিট করুন" : "নতুন লেখক যোগ করুন"}
              </h3>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <Label>লেখকের নাম *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <Label>ছবি আপলোড করুন *</Label>

                <Input
                  type="file"
                  accept="image/*"
                  onChange={async (e: any) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    const folder = "writers"; // 🔹 এখানে folder নাম

                    const formData = new FormData();
                    formData.append("file", file);

                    try {
                      toast.loading("ছবি আপলোড হচ্ছে...", {
                        id: "upload-writer",
                      });

                      const res = await fetch(`/api/upload/${folder}`, {
                        method: "POST",
                        body: formData,
                      });

                      if (!res.ok) {
                        throw new Error("Upload failed");
                      }

                      const data = await res.json();

                      // বিভিন্ন রেসপন্স কী হ্যান্ডেল:
                      const rawUrl: string | undefined =
                        data.fileUrl || data.url || data.path || data.location;

                      if (!rawUrl) {
                        throw new Error("Server did not return image URL");
                      }

                      let finalUrl = rawUrl;
                      try {
                        const base =
                          typeof window !== "undefined"
                            ? window.location.origin
                            : "http://localhost";
                        const url = new URL(rawUrl, base);
                        const parts = url.pathname.split("/").filter(Boolean);
                        const filename = parts[parts.length - 1];

                        finalUrl = `/api/upload/${folder}/${filename}`;
                      } catch {
                        // URL parse error হলে rawUrl ই রাখব
                      }

                      setForm((prev) => ({ ...prev, image: finalUrl }));
                      toast.success("ছবি আপলোড সম্পন্ন!", {
                        id: "upload-writer",
                      });
                    } catch (error) {
                      console.error('Error in form submission:', error);
                      console.error("Writer image upload error:", error);
                      toast.error("ছবি আপলোড ব্যর্থ!", { id: "upload-writer" });
                    }
                  }}
                />

                {form.image && (
                  <div className="relative mt-3 w-24 h-24">
                    <Image
                      src={form.image}
                      alt="Uploaded preview"
                      fill
                      className="object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                বাতিল
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!form.name || submitting}
                className="bg-gradient-to-r from-[#2C4A3B] to-[#819A91] text-white"
              >
                {submitting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                )}
                <Zap className="h-4 w-4 mr-1" />
                {editing ? "আপডেট করুন" : "তৈরি করুন"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
