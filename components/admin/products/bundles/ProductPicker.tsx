"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Search, Plus, X, Package, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface Product {
  id: number;
  name: string;
  slug: string;
  sku?: string;
  basePrice: number;
  originalPrice?: number;
  currency: string;
  image?: string;
  available: boolean;
  type: string;
  category?: {
    id: number;
    name: string;
  };
  brand?: {
    id: number;
    name: string;
  };
  defaultPrice: number;
  stock: number;
  variants: Array<{
    id: number;
    sku: string;
    price: number;
    currency: string;
    stock: number;
    isDefault: boolean;
    options: any;
  }>;
}

interface BundleItem {
  product: Product;
  variant?: Product['variants'][0];
  quantity: number;
}

interface ProductPickerProps {
  selectedItems: BundleItem[];
  onItemsChange: (items: BundleItem[]) => void;
  excludeBundleId?: number;
}

export default function ProductPicker({ selectedItems, onItemsChange, excludeBundleId }: ProductPickerProps) {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const selectedProductIds = useMemo(() => 
    new Set(selectedItems.map(item => item.product.id)),
    [selectedItems]
  );

  const searchProducts = async () => {
    if (!search.trim()) {
      setProducts([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        limit: "10",
      });

      if (excludeBundleId) {
        params.append("excludeBundleId", excludeBundleId.toString());
      }

      const response = await fetch(`/api/admin/products/bundles/search-products?${params}`);
      if (!response.ok) throw new Error("Failed to search products");

      const data = await response.json();
      setProducts(data.products);
      setShowResults(true);
    } catch (error) {
      console.error("Error searching products:", error);
      toast.error("Failed to search products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchProducts();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const addItem = (product: Product) => {
    const existingItem = selectedItems.find(item => item.product.id === product.id);
    
    if (existingItem) {
      // Update quantity if already selected
      const updatedItems = selectedItems.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      );
      onItemsChange(updatedItems);
    } else {
      // Add new item
      const defaultVariant = product.variants.find(v => v.isDefault) || product.variants[0];
      const newItem: BundleItem = {
        product,
        variant: defaultVariant,
        quantity: 1
      };
      onItemsChange([...selectedItems, newItem]);
    }
    
    setSearch("");
    setShowResults(false);
  };

  const removeItem = (productId: number) => {
    const updatedItems = selectedItems.filter(item => item.product.id !== productId);
    onItemsChange(updatedItems);
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity < 1) return;
    
    const updatedItems = selectedItems.map(item =>
      item.product.id === productId
        ? { ...item, quantity }
        : item
    );
    onItemsChange(updatedItems);
  };

  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search products to add to bundle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
          onFocus={() => search && setShowResults(true)}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {showResults && products.length > 0 && (
        <Card className="border-2">
          <CardContent className="p-0">
            <div className="max-h-64 overflow-y-auto">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="p-3 hover:bg-muted/50 border-b last:border-b-0 cursor-pointer transition-colors"
                  onClick={() => addItem(product)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{product.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          Stock: {product.stock}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{formatCurrency(product.defaultPrice, product.currency)}</span>
                        {product.category && (
                          <>
                            <span>•</span>
                            <span>{product.category.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {selectedProductIds.has(product.id) && (
                      <Badge variant="secondary">Added</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Items */}
      {selectedItems.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Selected Products ({selectedItems.length})
            </h3>
            <div className="space-y-3">
              {selectedItems.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.product.image ? (
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        width={48}
                        height={48}
                        className="object-cover"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{item.product.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatCurrency(item.product.defaultPrice, item.product.currency)}</span>
                      {item.product.category && (
                        <>
                          <span>•</span>
                          <span>{item.product.category.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        className="h-8 w-8 p-0"
                      >
                        -
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="h-8 w-8 p-0"
                      >
                        +
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.product.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {selectedItems.length === 0 && !search && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No products selected</h3>
            <p className="text-sm text-muted-foreground">
              Search and add at least 2 products to create a bundle
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
