"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Save, Package, DollarSign, TrendingDown, Upload } from "lucide-react";
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
  validateBundleConfiguration,
  mergeDuplicateBundleItems,
  formatBundlePricing,
  type BundleItem,
  type DiscountType 
} from "@/lib/bundle";

interface Category {
  id: number;
  name: string;
}

interface Brand {
  id: number;
  name: string;
}

export default function CreateBundlePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    shortDesc: "",
    categoryId: "",
    brandId: "",
    image: "",
    gallery: [] as string[],
    available: true,
    featured: false,
    currency: "USD",
  });
  
  // Discount state
  const [discountType, setDiscountType] = useState<DiscountType>("PERCENTAGE");
  const [discountValue, setDiscountValue] = useState("15");
  const [manualPrice, setManualPrice] = useState("");
  
  // Bundle items
  const [selectedItems, setSelectedItems] = useState<BundleItem[]>([]);
  
  // Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  
  // Calculated pricing
  const pricing = useMemo(() => {
    if (selectedItems.length < 2) return null;
    
    try {
      const mergedItems = mergeDuplicateBundleItems(selectedItems);
      return calculateBundlePricing({
        items: mergedItems,
        discountType,
        discountValue: parseFloat(discountValue) || 0,
        manualPrice: manualPrice ? parseFloat(manualPrice) : undefined,
      });
    } catch (error) {
      console.error("Error calculating pricing:", error);
      return null;
    }
  }, [selectedItems, discountType, discountValue, manualPrice]);

  // Validation
  const validation = useMemo(() => {
    if (selectedItems.length < 2) return { isValid: false, errors: ["At least 2 items required"] };
    
    try {
      const mergedItems = mergeDuplicateBundleItems(selectedItems);
      return validateBundleConfiguration(
        mergedItems,
        discountType,
        parseFloat(discountValue) || 0,
        manualPrice ? parseFloat(manualPrice) : undefined
      );
    } catch (error) {
      return { isValid: false, errors: ["Invalid configuration"] };
    }
  }, [selectedItems, discountType, discountValue, manualPrice]);

  // Fetch categories and brands
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [categoriesRes, brandsRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/brands"),
        ]);

        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategories(categoriesData.categories || categoriesData);
        }

        if (brandsRes.ok) {
          const brandsData = await brandsRes.json();
          setBrands(brandsData.brands || brandsData);
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

  const handleImageUpload = (url: string) => {
    setFormData(prev => ({ ...prev, image: url }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validation.isValid) {
      toast.error("Please fix the validation errors");
      return;
    }

    if (!pricing) {
      toast.error("Invalid pricing calculation");
      return;
    }

    setSaving(true);
    
    try {
      const mergedItems = mergeDuplicateBundleItems(selectedItems);
      
      const payload = {
        ...formData,
        categoryId: parseInt(formData.categoryId),
        brandId: formData.brandId && formData.brandId !== "none" ? parseInt(formData.brandId) : null,
        discountType,
        discountValue: parseFloat(discountValue) || 0,
        manualPrice: discountType === "MANUAL" ? parseFloat(manualPrice) : undefined,
        items: mergedItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          variantId: item.variant?.id || null,
        })),
      };

      const response = await fetch("/api/admin/products/bundles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create bundle");
      }

      const result = await response.json();
      toast.success("Bundle created successfully!");
      router.push(`/admin/products/bundles/${result.bundle.id}`);
    } catch (error) {
      console.error("Error creating bundle:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create bundle");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
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
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Summer Bundle, Starter Pack"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="shortDesc">Short Description</Label>
                  <Input
                    id="shortDesc"
                    value={formData.shortDesc}
                    onChange={(e) => setFormData(prev => ({ ...prev, shortDesc: e.target.value }))}
                    placeholder="Brief description for product listings"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Full Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed description of what's included in this bundle..."
                    rows={4}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="categoryId">Category *</Label>
                    <Select
                      value={formData.categoryId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="brandId">Brand</Label>
                    <Select
                      value={formData.brandId}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, brandId: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select brand (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No brand</SelectItem>
                        {brands.map((brand) => (
                          <SelectItem key={brand.id} value={brand.id.toString()}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="available"
                      checked={formData.available}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, available: checked }))}
                    />
                    <Label htmlFor="available">Available</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="featured"
                      checked={formData.featured}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
                    />
                    <Label htmlFor="featured">Featured</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Selection */}
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
                  onItemsChange={setSelectedItems}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Pricing */}
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

                {/* Pricing Summary */}
                {pricing && (
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Regular Total:</span>
                      <span className="font-medium line-through">
                        {formatCurrency(pricing.regularTotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Bundle Price:</span>
                      <span className="font-bold text-lg text-green-600">
                        {formatCurrency(pricing.discountedPrice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Savings:</span>
                      <Badge variant="secondary" className="text-green-700 bg-green-50">
                        {pricing.discountPercentage}% ({formatCurrency(pricing.discountAmount)})
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bundle Image */}
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
                        onClick={() => setFormData(prev => ({ ...prev, image: "" }))}
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
                  
                  {/* For now, just a simple URL input - in production you'd integrate with actual file upload */}
                  <Input
                    type="url"
                    placeholder="Enter image URL"
                    value={formData.image}
                    onChange={(e) => handleImageUpload(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {!validation.isValid && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      <p className="text-sm text-destructive font-medium mb-1">
                        Validation Errors:
                      </p>
                      <ul className="text-sm text-destructive list-disc list-inside">
                        {validation.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={saving || !validation.isValid || !pricing}
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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
