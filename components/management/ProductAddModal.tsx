//components/management/ProductAddModal.tsx

"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Zap, Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

interface ProductForm {
  id?: string | number;
  name: string;
  slug: string;
  description: string;
  price: string;
  original_price: string;
  discount: string;
  stock: string;
  available: boolean;
  writerId: string;
  publisherId: string;
  categoryId: string;
  image: string;
  gallery: string[];
  pdf: string;
}

interface Entity {
  id: number | string;
  name: string;
}

interface ProductAddModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (idOrData: string | number | Omit<ProductForm, 'id'>, data?: Omit<ProductForm, 'id'>) => Promise<void>;
  editing?: ProductForm | null;
  writers: Entity[];
  publishers: Entity[];
  categories: Entity[];
}

export default function ProductAddModal({
  open,
  onClose,
  onSubmit,
  editing,
  writers,
  publishers,
  categories,
}: ProductAddModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState({
    mainImage: false,
    gallery: false,
    pdf: false
  });

  const [form, setForm] = useState<ProductForm>({
    name: "",
    slug: "",
    description: "",
    price: "",
    original_price: "",
    discount: "0",
    stock: "0",
    available: true,
    writerId: "",
    publisherId: "",
    categoryId: "",
    image: "",
    gallery: [],
    pdf: "",
  });

  useEffect(() => {
    if (editing) setForm(editing);
  }, [editing]);

  if (!open) return null;

  const handleUpload = async (file: File, folder: string) => {
    // Validate file type
    if (folder.includes('image') && !file.type.startsWith('image/')) {
      throw new Error('Please upload a valid image file');
    }
    if (folder.includes('pdf') && file.type !== 'application/pdf') {
      throw new Error('Please upload a valid PDF file');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File size should be less than 5MB');
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/upload/${folder}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    const data = await response.json();
    return data.url;
  };

  const removeGalleryImage = (index: number) => {
    setForm(prev => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index)
    }));
  };

  const renderFilePreview = (url: string, onRemove?: () => void) => (
    <div className="relative group">
      {url.endsWith('.pdf') ? (
        <div className="border rounded p-3 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-red-500" />
            <span className="text-sm truncate max-w-[200px]">
              {url.split('/').pop()}
            </span>
          </div>
          {onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div className="relative group">
          <Image
            src={url}
            alt="Preview"
            width={120}
            height={120}
            className="rounded-md object-cover h-30 w-30 border"
          />
          {onRemove && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(editing?.id ?? form, form);
      onClose();
    } catch (error) {
      console.error('Error submitting product:', error);
      toast.error("Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading({ ...uploading, mainImage: true });
    try {
      const url = await handleUpload(e.target.files[0], 'products');
      setForm({ ...form, image: url });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image';
      toast.error(errorMessage);
    } finally {
      setUploading({ ...uploading, mainImage: false });
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading({ ...uploading, gallery: true });
    try {
      const files = Array.from(e.target.files);
      const urls = await Promise.all(
        files.map((file) => handleUpload(file, 'products/gallery'))
      );
      setForm({ ...form, gallery: [...form.gallery, ...urls] });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload gallery images';
      toast.error(errorMessage);
    } finally {
      setUploading({ ...uploading, gallery: false });
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploading({ ...uploading, pdf: true });
    try {
      const url = await handleUpload(e.target.files[0], 'products/pdf');
      setForm({ ...form, pdf: url });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload PDF';
      toast.error(errorMessage);
    } finally {
      setUploading({ ...uploading, pdf: false });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center p-6 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5">
        <h2 className="text-2xl font-bold">
          {editing ? "Update Product" : "Add New Product"}
        </h2>
        {/* NAME */}
        <div>
          <Label>Name *</Label>
          <Input
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
                slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
              })
            }
          />
        </div>
        {/* SLUG */}
        <div>
          <Label>Slug *</Label>
          <Input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
          />
        </div>
        {/* DROPDOWNS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Writer</Label>
            <select
              className="border p-2 rounded w-full"
              value={form.writerId || ""}
              onChange={(e) => setForm({ ...form, writerId: e.target.value })}
            >
              <option value="">Select</option>
              {writers.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Publisher</Label>
            <select
              className="border p-2 rounded w-full"
              value={form.publisherId || ""}
              onChange={(e) =>
                setForm({ ...form, publisherId: e.target.value })
              }
            >
              <option value="">Select</option>
              {publishers.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Category *</Label>
            <select
              className="border p-2 rounded w-full"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">Select</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* PRICE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Price *</Label>
            <Input
              type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div>
            <Label>Original Price</Label>
            <Input
              type="number"
              value={form.original_price}
              onChange={(e) =>
                setForm({ ...form, original_price: e.target.value })
              }
            />
          </div>
          <div>
            <Label>Discount (%)</Label>
            <Input
              type="number"
              value={form.discount}
              onChange={(e) => setForm({ ...form, discount: e.target.value })}
            />
          </div>
        </div>
        {/* STOCK */}
        <div>
          <Label>Stock</Label>
          <Input
            type="number"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
          />
        </div>
        {/* Main Image Upload */}
        <div className="space-y-2">
          <Label>Main Product Image *</Label>
          {form.image ? (
            <div className="flex items-start gap-4">
              {renderFilePreview(form.image, () => 
                setForm(prev => ({ ...prev, image: '' }))
              )}
            </div>
          ) : (
            <label
              htmlFor="main-image-upload"
              className="mt-1 flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#2C4A3B] transition-colors cursor-pointer"
            >
              <div className="space-y-1 text-center">
                <div className="flex justify-center">
                  <Upload className="h-12 w-12 text-gray-400" />
                </div>
                <div className="flex text-sm text-gray-600 justify-center">
                  <span className="relative font-medium text-[#2C4A3B] hover:text-[#1a3529] focus-within:outline-none">
                    Upload an image
                  </span>
                  <span className="pl-1">or drag and drop</span>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, GIF up to 5MB
                </p>
              </div>
              <input
                id="main-image-upload"
                name="main-image-upload"
                type="file"
                className="sr-only"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </label>
          )}
        </div>

        {/* Gallery Images */}
        <div className="space-y-2">
          <Label>Gallery Images</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-3">
            {form.gallery.map((img, index) => (
              <div key={index} className="relative">
                {renderFilePreview(img, () => removeGalleryImage(index))}
              </div>
            ))}
          </div>
          
          <label
            htmlFor="gallery-upload"
            className="mt-1 flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#2C4A3B] transition-colors cursor-pointer"
          >
            <div className="space-y-1 text-center">
              <div className="flex justify-center">
                <ImageIcon className="h-12 w-12 text-gray-400" />
              </div>
              <div className="flex text-sm text-gray-600 justify-center">
                <span className="relative font-medium text-[#2C4A3B] hover:text-[#1a3529] focus-within:outline-none">
                  Upload images
                </span>
                <span className="pl-1">or drag and drop</span>
              </div>
              <p className="text-xs text-gray-500">
                PNG, JPG, GIF up to 5MB each
              </p>
            </div>
            <input
              id="gallery-upload"
              name="gallery-upload"
              type="file"
              className="sr-only"
              accept="image/*"
              multiple
              onChange={handleGalleryUpload}
            />
          </label>
        </div>

        {/* PDF Upload */}
        <div className="space-y-2">
          <Label>Product PDF (Optional)</Label>
          {form.pdf ? (
            <div className="mt-2">
              {renderFilePreview(form.pdf, () => 
                setForm(prev => ({ ...prev, pdf: '' }))
              )}
            </div>
          ) : (
            <label
              htmlFor="pdf-upload"
              className="mt-1 flex flex-col items-center justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#2C4A3B] transition-colors cursor-pointer"
            >
              <div className="space-y-1 text-center">
                <div className="flex justify-center">
                  <FileText className="h-12 w-12 text-gray-400" />
                </div>
                <div className="flex text-sm text-gray-600 justify-center">
                  <span className="relative font-medium text-[#2C4A3B] hover:text-[#1a3529] focus-within:outline-none">
                    Upload PDF
                  </span>
                  <span className="pl-1">or drag and drop</span>
                </div>
                <p className="text-xs text-gray-500">
                  PDF up to 5MB
                </p>
              </div>
              <input
                id="pdf-upload"
                name="pdf-upload"
                type="file"
                className="sr-only"
                accept="application/pdf"
                onChange={handlePdfUpload}
              />
            </label>
          )}
        </div>
        <div className="flex justify-end gap-3 pb-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={loading || uploading.mainImage || uploading.gallery || uploading.pdf}
            onClick={handleSubmit}
            className="bg-[#2C4A3B] text-white hover:bg-[#1a3529]"
          >
            {(uploading.mainImage || uploading.gallery || uploading.pdf) ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Uploading...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-1" />
                {editing ? "Update Product" : "Add Product"}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
