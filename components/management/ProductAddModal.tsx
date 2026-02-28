"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { X, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProductType = "PHYSICAL" | "DIGITAL" | "SERVICE";

interface Entity {
  id: number;
  name: string;
}

interface VatClass {
  id: number;
  name: string;
  code: string;
}

interface DigitalAsset {
  id: number;
  title: string;
}

interface ProductForm {
  id?: number;
  name: string;
  description: string;
  shortDesc: string;
  type: ProductType;
  sku: string;
  basePrice: string;
  originalPrice: string;
  currency: string;
  weight: string;
  stockQty: string;
  dimLength: string;
  dimWidth: string;
  dimHeight: string;
  dimUnit: string;
  VatClassId: string;
  digitalAssetId: string;
  serviceDurationMinutes: string;
  serviceLocation: string;
  serviceOnlineLink: string;
  categoryId: string;
  brandId: string;
  writerId: string;
  publisherId: string;
  available: boolean;
  featured: boolean;
  image: string;
  gallery: string[];
  videoUrl: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (idOrData: any, data?: any) => Promise<void>;
  editing?: any;
  categories: Entity[];
  brands: Entity[];
  writers?: Entity[];
  publishers?: Entity[];
  vatClasses?: VatClass[];
  digitalAssets?: DigitalAsset[];
}

const emptyForm: ProductForm = {
  name: "",
  description: "",
  shortDesc: "",
  type: "PHYSICAL",
  sku: "",
  basePrice: "",
  originalPrice: "",
  currency: "USD",
  weight: "",
  stockQty: "0",
  dimLength: "",
  dimWidth: "",
  dimHeight: "",
  dimUnit: "cm",
  VatClassId: "",
  digitalAssetId: "",
  serviceDurationMinutes: "",
  serviceLocation: "",
  serviceOnlineLink: "",
  categoryId: "",
  brandId: "",
  writerId: "",
  publisherId: "",
  available: true,
  featured: false,
  image: "",
  gallery: [],
  videoUrl: "",
};

export default function ProductAddModal({
  open,
  onClose,
  onSubmit,
  editing,
  categories,
  brands,
  writers = [],
  publishers = [],
  vatClasses = [],
  digitalAssets = [],
}: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const selectedCategory = categories.find(
    (c) => String(c.id) === String(form.categoryId),
  );
  const showBookFields =
    !!selectedCategory?.name &&
    selectedCategory.name.toLowerCase().includes("book");

  useEffect(() => {
    if (!editing) {
      setForm(emptyForm);
      return;
    }

    const d = editing.dimensions ?? null;
    const dimLength =
      d && typeof d === "object" && d.length != null ? String(d.length) : "";
    const dimWidth =
      d && typeof d === "object" && d.width != null ? String(d.width) : "";
    const dimHeight =
      d && typeof d === "object" && d.height != null ? String(d.height) : "";
    const dimUnit =
      d && typeof d === "object" && typeof d.unit === "string" ? d.unit : "cm";

    const variants = Array.isArray(editing.variants) ? editing.variants : [];
    const totalStock = variants.reduce(
      (acc: number, v: any) => acc + (Number(v?.stock) || 0),
      0,
    );

    setForm({
      id: editing.id,
      name: editing.name ?? "",
      description: editing.description ?? "",
      shortDesc: editing.shortDesc ?? "",
      type: (editing.type as ProductType) ?? "PHYSICAL",
      sku: editing.sku ?? "",
      basePrice: editing.basePrice?.toString?.() ?? "",
      originalPrice: editing.originalPrice?.toString?.() ?? "",
      currency: editing.currency ?? "USD",
      weight: editing.weight?.toString?.() ?? "",
      stockQty: String(totalStock),
      dimLength,
      dimWidth,
      dimHeight,
      dimUnit,
      VatClassId: editing.VatClassId?.toString?.() ?? "",
      digitalAssetId: editing.digitalAssetId?.toString?.() ?? "",
      serviceDurationMinutes:
        editing.serviceDurationMinutes?.toString?.() ?? "",
      serviceLocation: editing.serviceLocation ?? "",
      serviceOnlineLink: editing.serviceOnlineLink ?? "",
      categoryId: editing.categoryId?.toString?.() ?? "",
      brandId: editing.brandId?.toString?.() ?? "",
      writerId: editing.writerId?.toString?.() ?? "",
      publisherId: editing.publisherId?.toString?.() ?? "",
      available: editing.available ?? true,
      featured: editing.featured ?? false,
      image: editing.image ?? "",
      gallery: editing.gallery ?? [],
      videoUrl: editing.videoUrl ?? "",
    });
  }, [editing]);

  useEffect(() => {
    if (!showBookFields && (form.writerId || form.publisherId)) {
      setForm((prev) => ({ ...prev, writerId: "", publisherId: "" }));
    }
  }, [showBookFields, form.writerId, form.publisherId]);

  if (!open) return null;

  const uploadFile = async (file: File, folder: string) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/upload/${folder}`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.url) throw new Error(data?.message || "Upload failed");
    return data.url as string;
  };

  const handleMainImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadFile(file, "products");
      setForm((prev) => ({ ...prev, image: url }));
    } catch (err: any) {
      toast.error(err?.message || "Image upload failed");
    }
  };

  const handleGalleryUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    try {
      const files = Array.from(e.target.files);
      const urls = await Promise.all(
        files.map((file) => uploadFile(file, "products/gallery")),
      );
      setForm((prev) => ({ ...prev, gallery: [...prev.gallery, ...urls] }));
    } catch (err: any) {
      toast.error(err?.message || "Gallery upload failed");
    }
  };

  const removeGalleryImage = (index: number) => {
    setForm((prev) => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index),
    }));
  };

  const buildDimensions = () => {
    const length = form.dimLength.trim() ? Number(form.dimLength) : null;
    const width = form.dimWidth.trim() ? Number(form.dimWidth) : null;
    const height = form.dimHeight.trim() ? Number(form.dimHeight) : null;

    if (length === null && width === null && height === null) return null;
    if (
      (length !== null && Number.isNaN(length)) ||
      (width !== null && Number.isNaN(width)) ||
      (height !== null && Number.isNaN(height))
    ) {
      return undefined;
    }

    return {
      length,
      width,
      height,
      unit: form.dimUnit || "cm",
    };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.basePrice || !form.categoryId) {
      toast.error("Name, Category and Price required");
      return;
    }

    const stock =
      form.type === "PHYSICAL"
        ? form.stockQty.trim()
          ? Number(form.stockQty)
          : 0
        : undefined;
    if (stock !== undefined && (!Number.isFinite(stock) || stock < 0)) {
      toast.error("Stock must be a number (0 or more)");
      return;
    }

    const dimensions = buildDimensions();
    if (dimensions === undefined) {
      toast.error("Please enter valid dimensions");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: form.name,
        description: form.description || "",
        shortDesc: form.shortDesc || null,
        type: form.type,
        sku: form.sku || null,

        categoryId: Number(form.categoryId),
        brandId: form.brandId ? Number(form.brandId) : null,
        writerId: form.writerId ? Number(form.writerId) : null,
        publisherId: form.publisherId ? Number(form.publisherId) : null,

        basePrice: Number(form.basePrice),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
        currency: form.currency || "USD",

        weight: form.weight ? Number(form.weight) : null,
        dimensions,
        VatClassId: form.VatClassId ? Number(form.VatClassId) : null,

        digitalAssetId: form.digitalAssetId ? Number(form.digitalAssetId) : null,
        serviceDurationMinutes: form.serviceDurationMinutes
          ? Number(form.serviceDurationMinutes)
          : null,
        serviceLocation: form.serviceLocation || null,
        serviceOnlineLink: form.serviceOnlineLink || null,

        available: form.available,
        featured: form.featured,

        image: form.image || null,
        gallery: form.gallery || [],
        videoUrl: form.videoUrl || null,
      };
      if (stock !== undefined) payload.stock = stock;

      if (editing) {
        await onSubmit(editing.id, payload);
      } else {
        await onSubmit(payload);
      }

      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 px-4">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-3xl p-6 relative max-h-[90vh] overflow-y-auto border">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-2xl font-bold mb-4">
          {editing ? "Edit Product" : "Add Product"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <Label>Description</Label>
            <textarea
              className="w-full border rounded p-2 min-h-[90px] bg-background text-foreground border-border resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Short Description</Label>
            <textarea
              className="w-full border rounded p-2 min-h-[70px] bg-background text-foreground border-border resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              value={form.shortDesc}
              onChange={(e) =>
                setForm({ ...form, shortDesc: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <select
                className="border p-2 rounded w-full bg-background text-foreground border-border focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as ProductType })
                }
              >
                <option value="PHYSICAL">PHYSICAL</option>
                <option value="DIGITAL">DIGITAL</option>
                <option value="SERVICE">SERVICE</option>
              </select>
            </div>

            <div>
              <Label>SKU</Label>
              <Input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Base Price *</Label>
              <Input
                type="number"
                value={form.basePrice}
                onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
              />
            </div>

            <div>
              <Label>Original Price</Label>
              <Input
                type="number"
                value={form.originalPrice}
                onChange={(e) =>
                  setForm({ ...form, originalPrice: e.target.value })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Currency</Label>
              <Input
                value={form.currency}
                onChange={(e) =>
                  setForm({ ...form, currency: e.target.value.toUpperCase() })
                }
              />
            </div>

            <div>
              <Label>Weight</Label>
              <Input
                type="number"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
          </div>

          {form.type === "PHYSICAL" && (
            <div>
              <Label>Stock Quantity</Label>
              <Input
                type="number"
                value={form.stockQty}
                onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
              />
              {editing && Array.isArray(editing?.variants) && editing.variants.length > 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  This product has multiple variants; stock here shows total stock.
                </p>
              )}
            </div>
          )}

          <div>
            <Label>Dimensions</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Length</Label>
                <Input
                  type="number"
                  value={form.dimLength}
                  onChange={(e) =>
                    setForm({ ...form, dimLength: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Width</Label>
                <Input
                  type="number"
                  value={form.dimWidth}
                  onChange={(e) =>
                    setForm({ ...form, dimWidth: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Height</Label>
                <Input
                  type="number"
                  value={form.dimHeight}
                  onChange={(e) =>
                    setForm({ ...form, dimHeight: e.target.value })
                  }
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Unit</Label>
                <select
                  className="border p-2 rounded w-full bg-background text-foreground border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.dimUnit}
                  onChange={(e) =>
                    setForm({ ...form, dimUnit: e.target.value })
                  }
                >
                  <option value="cm">cm</option>
                  <option value="mm">mm</option>
                  <option value="in">in</option>
                  <option value="m">m</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>VAT Class</Label>
              <select
                className="border p-2 rounded w-full bg-background text-foreground border-border focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.VatClassId}
                onChange={(e) => setForm({ ...form, VatClassId: e.target.value })}
              >
                <option value="">Select</option>
                {vatClasses.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Video URL</Label>
              <Input
                value={form.videoUrl}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Category *</Label>
              <select
                className="border p-2 rounded w-full bg-background text-foreground border-border focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
              >
                <option value="">Select</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label>Brand</Label>
              <select
                className="border p-2 rounded w-full bg-background text-foreground border-border focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.brandId}
                onChange={(e) => setForm({ ...form, brandId: e.target.value })}
              >
                <option value="">Select</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showBookFields && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Writer</Label>
                <select
                  className="border p-2 rounded w-full bg-background text-foreground border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.writerId}
                  onChange={(e) =>
                    setForm({ ...form, writerId: e.target.value })
                  }
                >
                  <option value="">Select</option>
                  {writers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Publisher</Label>
                <select
                  className="border p-2 rounded w-full bg-background text-foreground border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.publisherId}
                  onChange={(e) =>
                    setForm({ ...form, publisherId: e.target.value })
                  }
                >
                  <option value="">Select</option>
                  {publishers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {form.type === "DIGITAL" && (
            <div>
              <Label>Digital Asset</Label>
              <select
                className="border p-2 rounded w-full bg-background text-foreground border-border focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.digitalAssetId}
                onChange={(e) =>
                  setForm({ ...form, digitalAssetId: e.target.value })
                }
              >
                <option value="">Select</option>
                {digitalAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.type === "SERVICE" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Service Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={form.serviceDurationMinutes}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        serviceDurationMinutes: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Service Location</Label>
                  <Input
                    value={form.serviceLocation}
                    onChange={(e) =>
                      setForm({ ...form, serviceLocation: e.target.value })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Service Online Link</Label>
                <Input
                  value={form.serviceOnlineLink}
                  onChange={(e) =>
                    setForm({ ...form, serviceOnlineLink: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                id="available"
                type="checkbox"
                checked={form.available}
                onChange={(e) =>
                  setForm({ ...form, available: e.target.checked })
                }
              />
              <Label htmlFor="available">Available</Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="featured"
                type="checkbox"
                checked={form.featured}
                onChange={(e) =>
                  setForm({ ...form, featured: e.target.checked })
                }
              />
              <Label htmlFor="featured">Featured</Label>
            </div>
          </div>

          {/* MAIN IMAGE */}
          <div>
            <Label>Main Image</Label>
            {form.image ? (
              <div className="relative w-32">
                <Image
                  src={form.image}
                  alt="preview"
                  width={120}
                  height={120}
                  className="rounded border border-border"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                  onClick={() => setForm({ ...form, image: "" })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Input type="file" accept="image/*" onChange={handleMainImageUpload} />
            )}
          </div>

          {/* GALLERY */}
          <div>
            <Label>Gallery</Label>
            <div className="flex flex-wrap gap-3 mb-3">
              {form.gallery.map((img, i) => (
                <div key={i} className="relative">
                  <Image
                    src={img}
                    alt="gallery"
                    width={100}
                    height={100}
                    className="rounded border border-border"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                    onClick={() => removeGalleryImage(i)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <Input
              type="file"
              multiple
              accept="image/*"
              onChange={handleGalleryUpload}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Zap className="h-4 w-4 mr-1" />
              {editing ? "Update Product" : "Add Product"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
