"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Save, Package, DollarSign, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import ProductPicker from "@/components/admin/products/bundles/ProductPicker";
import {
  calculateBundlePricing,
  mergeDuplicateBundleItems,
  type BundleItem,
  type DiscountType,
} from "@/lib/bundle";

interface Category {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
}

interface Warehouse {
  id: number;
  name: string;
  code: string;
  isDefault: boolean;
}

interface VatClass {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export default function CreateBundlePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    shortDesc: "",
    categoryId: "",
    selectedCategoryIds: [] as string[],
    brandIds: [] as string[],
    image: "",
    gallery: [] as string[],
    available: true,
    featured: false,
    currency: "BDT",
    warehouseId: "",
    vatClassId: "none",
  });

  const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("15");
  const [manualPrice, setManualPrice] = useState("");

  const [selectedItems, setSelectedItems] = useState<BundleItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [vatClasses, setVatClasses] = useState<VatClass[]>([]);

  const handleImageUpload = async (file: File) => {
    setUploading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();

      if (data.success) {
        setFormData((prev) => ({
          ...prev,
          image: data.fileUrl,
        }));
        toast.success("Image uploaded successfully");
      } else {
        throw new Error(data.error || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleImageUrlChange = (url: string) => {
    setFormData((prev) => ({
      ...prev,
      image: url,
    }));
  };

  const handleImageRemove = () => {
    setFormData((prev) => ({
      ...prev,
      image: "",
    }));
  };

  const pricing = useMemo(() => {
    const validItems = (selectedItems || []).filter(
      (item) => item && item.product && item.product.id
    );

    if (validItems.length < 2) return null;

    try {
      const mergedItems = mergeDuplicateBundleItems(validItems);

      return calculateBundlePricing({
        items: mergedItems,
        discountType,
        discountValue: parseFloat(discountValue) || 0,
        manualPrice:
          discountType === "MANUAL" && manualPrice
            ? parseFloat(manualPrice)
            : undefined,
      });
    } catch (error) {
      console.error("Error calculating pricing:", error);
      return null;
    }
  }, [selectedItems, discountType, discountValue, manualPrice]);

  const hasEnoughItems = selectedItems.filter(
    (item) => item && item.product && item.product.id
  ).length >= 2;

  const hasOutOfStockItems = selectedItems.some((item) => {
    if (!item || !item.product) return false;
    const itemStock = item.variant ? item.variant.stock : item.product.stock;
    return itemStock <= 0;
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [categoriesRes, brandsRes, warehousesRes, vatClassesRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/brands"),
          fetch("/api/warehouses"),
          fetch("/api/vat-classes"),
        ]);

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData.categories || categoriesData || []);
        }

        if (brandsRes.ok) {
          const brandsData = await brandsRes.json();
          setBrands(brandsData.brands || brandsData || []);
        }

        if (warehousesRes.ok) {
          const warehousesData = await warehousesRes.json();
          setWarehouses(warehousesData || []);

          // Auto-select default warehouse if available
          const defaultWarehouse = warehousesData?.find((w: Warehouse) => w.isDefault);
          if (defaultWarehouse) {
            setFormData((prev) => ({ ...prev, warehouseId: defaultWarehouse.id.toString() }));
          }
        }

        if (vatClassesRes.ok) {
          const vatClassesData = await vatClassesRes.json();
          setVatClasses(vatClassesData || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load categories and brands");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = selectedItems.filter(
      (item) => item && item.product && item.product.id
    );

    if (validItems.length < 2) {
      toast.error("At least 2 valid items required to create a bundle");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Bundle name is required");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Bundle description is required");
      return;
    }

    if (!formData.categoryId) {
      toast.error("Please select a bundle category");
      return;
    }

    if (!formData.warehouseId) {
      toast.error("Please select a warehouse");
      return;
    }

    if (discountType === "MANUAL" && !manualPrice) {
      toast.error("Please enter manual price");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        shortDesc: formData.shortDesc.trim(),
        categoryId: parseInt(formData.categoryId, 10),
        brandIds: formData.brandIds.map((id) => parseInt(id, 10)),
        image: formData.image,
        gallery: formData.gallery,
        available: formData.available,
        featured: formData.featured,
        currency: formData.currency,
        warehouseId: formData.warehouseId ? parseInt(formData.warehouseId, 10) : null,
        vatClassId: formData.vatClassId && formData.vatClassId !== "none" ? parseInt(formData.vatClassId, 10) : null,
        discountType,
        discountValue: parseFloat(discountValue) || 0,
        manualPrice:
          discountType === "MANUAL" ? parseFloat(manualPrice) || 0 : undefined,
        items: validItems.map((item) => ({
          product: item.product,
          variant: item.variant || null,
          quantity: Number(item.quantity) || 1,
        })),
      };

      const response = await fetch("/api/admin/products/bundles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create bundle");
      }

      toast.success("Bundle created successfully!");
      router.push(`/admin/products/bundles/${result.bundle.id}`);
    } catch (error) {
      console.error("Error creating bundle:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create bundle"
      );
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number, currency = "BDT") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency === "BDT" ? "BDT" : currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
      .format(amount)
      .replace("BDT", "৳");
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div>
          <h1 className="text-3xl font-bold">Create Bundle</h1>
          <p className="text-muted-foreground">
            Create a product bundle with special pricing
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Bundle Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="e.g., Summer Bundle, Starter Pack"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="shortDesc">Short Description</Label>
                  <Input
                    id="shortDesc"
                    value={formData.shortDesc}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        shortDesc: e.target.value,
                      }))
                    }
                    placeholder="Brief description for product listings"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Full Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Detailed description of what's included in this bundle..."
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="categoryId">Bundle Category *</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          categoryId: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select bundle category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem
                            key={category.id}
                            value={category.id.toString()}
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      This category will be used to display the bundle in the storefront
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="warehouseId">Warehouse *</Label>
                      <Select
                        value={formData.warehouseId}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            warehouseId: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((warehouse) => (
                            <SelectItem
                              key={warehouse.id}
                              value={warehouse.id.toString()}
                            >
                              {warehouse.name} ({warehouse.code})
                              {warehouse.isDefault && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Default
                                </Badge>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Warehouse where bundle products will be sourced from
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="vatClassId">VAT Class (Optional)</Label>
                      <Select
                        value={formData.vatClassId}
                        onValueChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            vatClassId: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select VAT class (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            No VAT Class
                          </SelectItem>
                          {vatClasses.map((vatClass) => (
                            <SelectItem
                              key={vatClass.id}
                              value={vatClass.id.toString()}
                            >
                              {vatClass.name} ({vatClass.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        VAT class for tax calculation (optional)
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label>Product Categories</Label>
                    <div className="border rounded-md p-3 max-h-32 overflow-y-auto bg-background">
                      {categories.map((category) => (
                        <div
                          key={category.id}
                          className="flex items-center space-x-2 mb-2"
                        >
                          <input
                            type="checkbox"
                            id={`category-${category.id}`}
                            checked={formData.selectedCategoryIds.includes(
                              category.id.toString()
                            )}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData((prev) => ({
                                  ...prev,
                                  selectedCategoryIds: [
                                    ...prev.selectedCategoryIds,
                                    category.id.toString(),
                                  ],
                                }));
                              } else {
                                setFormData((prev) => ({
                                  ...prev,
                                  selectedCategoryIds:
                                    prev.selectedCategoryIds.filter(
                                      (id) => id !== category.id.toString()
                                    ),
                                }));
                              }
                            }}
                            className="rounded border-border text-primary focus:ring-ring"
                          />
                          <label
                            htmlFor={`category-${category.id}`}
                            className="text-sm font-medium text-foreground"
                          >
                            {category.name}
                          </label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select categories to show products from in the Bundle Products section
                    </p>
                  </div>

                  <div>
                    <Label>Bundle Image</Label>
                    <div className="space-y-4">
                      {formData.image && (
                        <div className="relative">
                          <Image
                            src={formData.image}
                            alt="Bundle image"
                            width={200}
                            height={200}
                            className="w-32 h-32 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={handleImageRemove}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                          <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground mb-3">
                            Click to upload bundle image
                          </p>

                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file);
                            }}
                            disabled={uploading}
                            className="hidden"
                            id="bundle-image-upload"
                          />

                          <Button
                            type="button"
                            variant="outline"
                            disabled={uploading}
                            onClick={() =>
                              document.getElementById("bundle-image-upload")?.click()
                            }
                          >
                            {uploading ? "Uploading..." : "Choose Image"}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="imageUrl">Enter Image URL</Label>
                        <div className="flex gap-2">
                          <Input
                            id="imageUrl"
                            type="text"
                            placeholder="https://example.com/image.jpg"
                            value={formData.image}
                            onChange={(e) => handleImageUrlChange(e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleImageRemove}
                            disabled={!formData.image}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Bundle Products
                </CardTitle>
              </CardHeader>

              <CardContent>
                <ProductPicker
                  selectedItems={selectedItems}
                  onItemsChange={(items) => {
                    const safeItems = (items || []).filter(
                      (item) => item && item.product && item.product.id
                    );
                    setSelectedItems(safeItems);
                  }}
                  categoryIds={formData.selectedCategoryIds}
                  categories={categories}
                  warehouseId={formData.warehouseId}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="discountType">Discount Type</Label>
                  <Select
                    value={discountType}
                    onValueChange={(value: DiscountType) => setDiscountType(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage Discount</SelectItem>
                      <SelectItem value="FIXED">Fixed Amount Discount</SelectItem>
                      <SelectItem value="MANUAL">Manual Price</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {discountType === "PERCENTAGE" && (
                  <div>
                    <Label htmlFor="discountValue">Discount Percentage</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="discountValue"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder="15"
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                )}

                {discountType === "FIXED" && (
                  <div>
                    <Label htmlFor="discountValue">Discount Amount</Label>
                    <Input
                      id="discountValue"
                      type="number"
                      min="0"
                      step="0.01"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="10.00"
                    />
                  </div>
                )}

                {discountType === "MANUAL" && (
                  <div>
                    <Label htmlFor="manualPrice">Final Bundle Price</Label>
                    <Input
                      id="manualPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      placeholder="49.99"
                    />
                  </div>
                )}

                {pricing && (
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Regular Total:
                      </span>
                      <span className="font-medium line-through">
                        {formatCurrency(pricing.regularTotal)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Bundle Price:
                      </span>
                      <span className="font-bold text-lg text-green-600">
                        {formatCurrency(pricing.discountedPrice)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Savings:</span>
                      <Badge variant="secondary" className="text-green-700 bg-green-50">
                        {pricing.discountPercentage}% (
                        {formatCurrency(pricing.discountAmount)})
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Bundle Image
                </CardTitle>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  {formData.image ? (
                    <div className="relative">
                      <div className="w-full h-48 bg-muted rounded-lg overflow-hidden">
                        <Image
                          src={formData.image}
                          alt="Bundle image"
                          width={300}
                          height={200}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleImageRemove}
                        className="mt-2"
                      >
                        Remove Image
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-muted-foreground/25">
                      <div className="text-center">
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload bundle image
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG up to 10MB
                        </p>
                      </div>
                    </div>
                  )}

                  <Input
                    type="text"
                    placeholder="Enter image URL"
                    value={formData.image}
                    onChange={(e) => handleImageUrlChange(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {!hasEnoughItems && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      <p className="text-sm text-destructive font-medium mb-1">
                        Bundle Requirements:
                      </p>
                      <ul className="text-sm text-destructive list-disc list-inside">
                        <li>At least 2 items required to create a bundle</li>
                      </ul>
                    </div>
                  )}

                  {hasOutOfStockItems && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      <p className="text-sm text-destructive font-medium mb-1">
                        Stock Issues:
                      </p>
                      <ul className="text-sm text-destructive list-disc list-inside">
                        <li>Some items in your bundle are out of stock</li>
                        <li>Please remove out of stock items or select different variants</li>
                      </ul>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={saving || !hasEnoughItems || hasOutOfStockItems}
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Creating Bundle...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Create Bundle
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => router.back()}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}