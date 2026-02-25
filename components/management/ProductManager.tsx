"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  BookOpen,
  Image as ImageIcon,
  Layers,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import ProductAddModal from "./ProductAddModal";

export default function ProductManager({
  products,
  loading,
  onCreate,
  onUpdate,
  onDelete,
  writers,
  publishers,
  categories,
}: any) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const filtered = products
    ?.filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter(
      (p: any) =>
        p.category !== null && p.writer !== null && p.publisher !== null
    );

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (product: any) => {
    setEditing(product);
    setModalOpen(true);
  };

  const openDeleteModal = (product: any) => {
    setDeletingProduct(product);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeletingProduct(null);
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;

    try {
      setIsDeleting(true);
      // Delete associated files first
      await deleteProductFiles(deletingProduct);
      // Then delete the product
      await onDelete(deletingProduct.id);
      toast.success("Product deleted successfully");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    } finally {
      setIsDeleting(false);
      closeDeleteModal();
    }
  };

  const deleteProductFiles = async (product: any) => {
    try {
      const filesToDelete = [];

      // Add main image
      if (product.image) {
        filesToDelete.push(extractRelativePath(product.image));
      }

      // Add gallery images
      if (product.gallery && product.gallery.length > 0) {
        product.gallery.forEach((img: string) => {
          filesToDelete.push(extractRelativePath(img));
        });
      }

      // Add PDF if exists
      if (product.pdf) {
        filesToDelete.push(extractRelativePath(product.pdf));
      }

      // Delete all files in parallel
      await Promise.all(
        filesToDelete.map((filePath) =>
          fetch(`/api/delete-file?path=${encodeURIComponent(filePath)}`, {
            method: "DELETE",
          })
        )
      );
    } catch (error) {
      console.error("Error deleting product files:", error);
      // Continue with product deletion even if file deletion fails
    }
  };

  const extractRelativePath = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname; // Returns path like "/upload/products/filename.jpg"
    } catch (error) {
      // If it's not a full URL, return as is (might be a relative path already)
      return url.startsWith("/") ? url : `/${url}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEEFE0] to-[#D1D8BE]/30 p-6">
      <div>
        {/* Delete Confirmation Modal */}
        <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the product &quot;
                {deletingProduct?.name}&quot; and all its associated files (images,
                PDFs, etc.). This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* HEADER */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-2 h-10 bg-gradient-to-b from-[#2C4A3B] to-[#819A91] rounded-full"></div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#2C4A3B] to-[#819A91] bg-clip-text text-transparent">
              পণ্য ব্যবস্থাপনা
            </h1>
            <div className="w-2 h-10 bg-gradient-to-b from-[#819A91] to-[#2C4A3B] rounded-full"></div>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            সম্পূর্ণ নিয়ন্ত্রণের সাথে সমস্ত বই, লেখক, প্রকাশক এবং বিভাগ
            পরিচালনা করুন
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {/* TOTAL PRODUCTS */}
          <Card className="bg-white/80 shadow-lg rounded-2xl">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Total Products</p>
                <h3 className="text-2xl font-bold">
                  {
                    products.filter(
                      (p: any) =>
                        p.category !== null &&
                        p.writer !== null &&
                        p.publisher !== null
                    ).length
                  }
                </h3>
              </div>
              <div className="p-3 bg-gradient-to-r from-[#819A91] to-[#A7C1A8] rounded-full">
                <Layers className="h-6 w-6 text-white" />
              </div>
            </CardContent>
          </Card>

          {/* TOTAL AUTHORS */}
          <Card className="bg-white/80 shadow-lg rounded-2xl">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Total Authors</p>
                <h3 className="text-2xl font-bold">
                  {writers.filter((w: any) => w.deleted === false).length}
                </h3>
              </div>
              <div className="p-3 bg-gradient-to-r from-[#2C4A3B] to-[#819A91] rounded-full">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
            </CardContent>
          </Card>

          {/* TOTAL PUBLISHERS */}
          <Card className="bg-white/80 shadow-lg rounded-2xl">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Total Publishers</p>
                <h3 className="text-2xl font-bold">
                  {publishers.filter((p: any) => p.deleted === false).length}
                </h3>
              </div>
              <div className="p-3 bg-gradient-to-r from-[#819A91] to-[#A7C1A8] rounded-full">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </CardContent>
          </Card>

          {/* TOTAL CATEGORIES */}
          <Card className="bg-white/80 shadow-lg rounded-2xl">
            <CardContent className="p-6 flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Categories</p>
                <h3 className="text-2xl font-bold">
                  {categories.filter((c: any) => c.deleted === false).length}
                </h3>
              </div>
              <div className="p-3 bg-gradient-to-r from-[#2C4A3B] to-[#819A91] rounded-full">
                <Layers className="h-6 w-6 text-white" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SEARCH + BUTTON */}
        <Card className="col-span-2 bg-white/80 shadow-lg rounded-2xl mb-8">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-full"
              />
            </div>
            <Button
              onClick={openAdd}
              className="rounded-full bg-gradient-to-r from-[#2C4A3B] to-[#819A91] text-white px-6"
            >
              <Plus className="h-4 w-4 mr-1" /> New Product
            </Button>
          </CardContent>
        </Card>

        {/* LOADING */}
        {loading ? (
          <div className="min-h-screen bg-gradient-to-br from-[#EEEFE0] to-[#D1D8BE]/30 p-6">
            <div className="max-w-7xl mx-auto">
              {/* Header Skeleton */}
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-2 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="h-10 bg-gray-200 rounded w-48 animate-pulse"></div>
                  <div className="w-2 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-96 mx-auto animate-pulse"></div>
              </div>

              {/* Stats Cards Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="bg-white/80 rounded-2xl shadow-lg p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                        <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
                      </div>
                      <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Search and Button Skeleton */}
              <div className="bg-white/80 rounded-2xl shadow-lg p-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-10 bg-gray-200 rounded-full w-full pl-10 animate-pulse"></div>
                  </div>
                  <div className="h-10 bg-gray-200 rounded-full w-32 animate-pulse"></div>
                </div>
              </div>

              {/* Product Grid Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="bg-white/80 rounded-2xl shadow-lg">
                    {/* Image Skeleton */}
                    <div className="relative h-48">
                      <div className="h-full w-full bg-gray-200 rounded-t-2xl animate-pulse"></div>
                      <div className="absolute top-3 right-3 flex gap-2">
                        <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
                        <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
                      </div>
                    </div>

                    {/* Content Skeleton */}
                    <div className="p-5">
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-1 animate-pulse"></div>
                      
                      <div className="space-y-1 mb-3">
                        <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-4/5 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                      </div>

                      <div className="h-4 bg-gray-200 rounded w-20 mb-4 animate-pulse"></div>

                      <div className="flex gap-2">
                        <div className="h-10 bg-gray-200 rounded flex-1 animate-pulse"></div>
                        <div className="h-10 bg-gray-200 rounded w-10 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* PRODUCT GRID */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered?.map((p: any) => (
              <Card
                key={p.id}
                className="group bg-white/80 rounded-2xl shadow-lg hover:shadow-2xl transition"
              >
                <div className="relative w-full aspect-[3/4] sm:aspect-[4/5] lg:aspect-[3/4] max-w-[500px] mx-auto rounded-xl overflow-hidden bg-gray-50 group">
                  {p.image ? (
                    <Image
                      src={p.image}
                      alt={p.name || 'Product image'}
                      width={400}
                      height={200}
                      className="h-full w-full object-cover rounded-t-2xl group-hover:scale-110 transition"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#819A91] flex items-center justify-center">
                      <ImageIcon className="h-16 w-16 text-white/70" />
                    </div>
                  )}

                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 flex gap-2 transition">
                    <Button
                      size="sm"
                      onClick={() => openEdit(p)}
                      className="rounded-full text-gray-600 hover:text-white bg-white/90 shadow"
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteModal(p)}
                      className="text-red-500 hover:bg-red-50"
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <CardContent className="p-5">
                  <h3 className="font-bold text-xl text-gray-800 mb-1">
                    {p.name}
                  </h3>

                  <div className="space-y-1 mb-3 text-sm text-gray-600">
                    <p>Category: {p.category?.name || "No category"}</p>
                    <p>Writer: {p.writer?.name || "No writer"}</p>
                    <p>Publisher: {p.publisher?.name || "No publisher"}</p>
                    <p>Stock: {p.stock || "Stock Out"}</p>
                  </div>

                  <p className="text-gray-600 text-sm">Price: ৳{p.price}</p>

                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={() => openEdit(p)}
                      variant="outline"
                      className="w-full bg-[#52aa8a] text-white hover:text-white hover:bg-[#2d6852]"
                    >
                      <Edit3 className="h-3 w-3 mr-1" /> Edit
                    </Button>

                    <Button
                      onClick={() => openDeleteModal(p)}
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

        {/* EMPTY STATE */}
        {!loading && filtered?.length === 0 && (
          <Card className="bg-white/80 shadow rounded-2xl p-12 text-center">
            <h3 className="text-2xl font-bold">No products found</h3>
            <p className="text-gray-600 mt-2 mb-6">
              Try searching with a different keyword.
            </p>
            <Button
              onClick={openAdd}
              className="rounded-full bg-gradient-to-r from-[#2C4A3B] to-[#819A91] text-white px-6"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Product
            </Button>
          </Card>
        )}
      </div>

      {/* MODAL */}
      {modalOpen && (
        <ProductAddModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          editing={editing}
          onSubmit={editing ? onUpdate : onCreate}
          writers={writers}
          publishers={publishers}
          categories={categories}
        />
      )}
    </div>
  );
}
