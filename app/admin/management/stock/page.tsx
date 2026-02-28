"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, Warehouse as WarehouseIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import WarehouseManagerModal from "@/components/management/WarehouseManagerModal";

interface Product {
  id: number;
  name: string;
  type: "PHYSICAL" | "DIGITAL" | "SERVICE";
  category?: { name?: string | null } | null;
}

interface Warehouse {
  id: number;
  name: string;
  code: string;
  isDefault: boolean;
}

interface StockLevel {
  id: number;
  warehouseId: number;
  productVariantId: number;
  quantity: number;
  reserved: number;
  warehouse: Warehouse;
}

interface Variant {
  id: number;
  sku: string;
  price: number | string;
  currency: string;
  stock: number;
  stockLevels?: StockLevel[];
}

interface InventoryLog {
  id: number;
  change: number;
  reason: string;
  createdAt: string;
  variant?: { id: number; sku: string } | null;
  warehouse?: { id: number; name: string; code: string } | null;
}

export default function StockManagementPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [search, setSearch] = useState("");
  const [threshold, setThreshold] = useState("10");

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);

  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [stockDraft, setStockDraft] = useState<Record<number, string>>({});

  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);

  const physicalProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => p.type === "PHYSICAL")
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          (p.category?.name || "").toLowerCase().includes(q)
        );
      });
  }, [products, search]);

  const sortedWarehouses = useMemo(() => {
    return [...warehouses].sort((a, b) =>
      a.isDefault === b.isDefault ? a.name.localeCompare(b.name) : a.isDefault ? -1 : 1,
    );
  }, [warehouses]);

  const selectedVariant = useMemo(() => {
    if (!selectedVariantId) return null;
    return variants.find((v) => v.id === selectedVariantId) || null;
  }, [selectedVariantId, variants]);

  const thresholdNum = useMemo(() => {
    const n = Number(threshold);
    return Number.isFinite(n) && n >= 0 ? n : 10;
  }, [threshold]);

  const lowStockVariants = useMemo(() => {
    return variants.filter((v) => Number(v.stock || 0) < thresholdNum);
  }, [variants, thresholdNum]);

  const totalVariantStock = useMemo(() => {
    return variants.reduce((acc, item) => acc + (Number(item.stock) || 0), 0);
  }, [variants]);

  const loadBaseData = useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, wRes] = await Promise.all([
        fetch("/api/products", { cache: "no-store" }),
        fetch("/api/warehouses", { cache: "no-store" }),
      ]);

      const pData = await pRes.json();
      const wData = await wRes.json();

      setProducts(Array.isArray(pData) ? pData : []);
      setWarehouses(Array.isArray(wData) ? wData : []);
    } catch (err) {
      toast.error("Failed to load stock management data");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProductDetails = useCallback(async (productId: number) => {
    try {
      setLoading(true);
      const [vRes, lRes] = await Promise.all([
        fetch(`/api/product-variants?productId=${productId}`, { cache: "no-store" }),
        fetch(`/api/inventory-logs?productId=${productId}`, { cache: "no-store" }),
      ]);

      const vData = await vRes.json();
      const lData = await lRes.json();

      const nextVariants = Array.isArray(vData) ? vData : [];
      setVariants(nextVariants);
      setLogs(Array.isArray(lData) ? lData : []);

      const firstVariantId = nextVariants[0]?.id || null;
      setSelectedVariantId((prev) =>
        prev && nextVariants.some((v: Variant) => v.id === prev) ? prev : firstVariantId,
      );
    } catch (err) {
      toast.error("Failed to load variant/stock details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  useEffect(() => {
    if (!physicalProducts.length) {
      setSelectedProductId(null);
      setVariants([]);
      setLogs([]);
      return;
    }

    setSelectedProductId((prev) =>
      prev && physicalProducts.some((p) => p.id === prev) ? prev : physicalProducts[0].id,
    );
  }, [physicalProducts]);

  useEffect(() => {
    if (!selectedProductId) return;
    void loadProductDetails(selectedProductId);
  }, [selectedProductId, loadProductDetails]);

  useEffect(() => {
    if (!selectedVariant) {
      setStockDraft({});
      return;
    }

    const nextDraft: Record<number, string> = {};
    for (const warehouse of sortedWarehouses) {
      const level = selectedVariant.stockLevels?.find(
        (entry) => entry.warehouseId === warehouse.id,
      );
      nextDraft[warehouse.id] = String(level?.quantity ?? 0);
    }
    setStockDraft(nextDraft);
  }, [selectedVariant, sortedWarehouses]);

  const refreshAll = async () => {
    await loadBaseData();
    if (selectedProductId) {
      await loadProductDetails(selectedProductId);
    }
  };

  const saveStockLevel = async (warehouseId: number) => {
    if (!selectedVariant || !selectedProductId) return;

    const quantity = Number(stockDraft[warehouseId] ?? "0");
    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.error("Quantity must be 0 or more");
      return;
    }

    try {
      setSaving((prev) => ({ ...prev, [warehouseId]: true }));
      const res = await fetch("/api/stock-levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId,
          productVariantId: selectedVariant.id,
          quantity,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Save failed");

      toast.success("Stock saved");
      await loadProductDetails(selectedProductId);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save stock");
    } finally {
      setSaving((prev) => ({ ...prev, [warehouseId]: false }));
    }
  };

  const clearStockLevel = async (stockLevelId: number) => {
    if (!selectedProductId) return;
    if (!confirm("Delete this warehouse stock entry?")) return;

    try {
      const res = await fetch(`/api/stock-levels/${stockLevelId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed");

      toast.success("Stock entry deleted");
      await loadProductDetails(selectedProductId);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete stock entry");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Stock Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage stock by product variant and warehouse.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setWarehouseModalOpen(true)}>
            <WarehouseIcon className="h-4 w-4 mr-1" />
            Warehouses
          </Button>
          <Button variant="outline" onClick={refreshAll} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <Label>Search Physical Products</Label>
            <Input
              placeholder="Search by name/category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <Label>Product</Label>
            <select
              className="w-full border rounded-md px-3 py-2 bg-background"
              value={selectedProductId ?? ""}
              onChange={(e) =>
                setSelectedProductId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Select product</option>
              {physicalProducts.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Low Stock Threshold</Label>
            <Input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Physical Products</p>
            <p className="text-2xl font-semibold">{physicalProducts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Variants</p>
            <p className="text-2xl font-semibold">{variants.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Variant Stock</p>
            <p className="text-2xl font-semibold">{totalVariantStock}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Low Stock Variants</p>
            <p className="text-2xl font-semibold">{lowStockVariants.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Warehouse Stock Levels</p>
                <p className="text-xs text-muted-foreground">
                  Update quantity by selected variant.
                </p>
              </div>
              <div className="w-64">
                <Label>Variant</Label>
                <select
                  className="w-full border rounded-md px-3 py-2 bg-background"
                  value={selectedVariantId ?? ""}
                  onChange={(e) =>
                    setSelectedVariantId(e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">Select variant</option>
                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.sku} ({variant.currency} {String(variant.price)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!selectedVariant ? (
              <p className="text-sm text-muted-foreground">
                Select a product and variant to manage stock levels.
              </p>
            ) : sortedWarehouses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No warehouses found. Create one from the Warehouses button.
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reserved</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedWarehouses.map((warehouse) => {
                      const level =
                        selectedVariant.stockLevels?.find(
                          (entry) => entry.warehouseId === warehouse.id,
                        ) || null;
                      const reserved = Number(level?.reserved || 0);
                      const quantity = Number(stockDraft[warehouse.id] || 0);
                      const available = Math.max(0, quantity - reserved);

                      return (
                        <TableRow key={warehouse.id}>
                          <TableCell>
                            <div className="font-medium">
                              {warehouse.name} ({warehouse.code})
                            </div>
                            {warehouse.isDefault && (
                              <div className="text-xs text-muted-foreground">Default</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              className="w-28"
                              value={stockDraft[warehouse.id] ?? "0"}
                              onChange={(e) =>
                                setStockDraft((prev) => ({
                                  ...prev,
                                  [warehouse.id]: e.target.value,
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell>{reserved}</TableCell>
                          <TableCell>{available}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => saveStockLevel(warehouse.id)}
                                disabled={!!saving[warehouse.id] || loading}
                              >
                                {saving[warehouse.id] ? "Saving..." : "Save"}
                              </Button>
                              {level && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                                  onClick={() => clearStockLevel(level.id)}
                                  disabled={loading}
                                >
                                  Clear
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="font-semibold">Variant Stock Summary</p>
            {variants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No variants found.</p>
            ) : (
              <div className="space-y-2">
                {variants.map((variant) => {
                  const isLow = Number(variant.stock) < thresholdNum;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={`w-full border rounded-lg p-3 text-left transition-all duration-200 ${
                        selectedVariantId === variant.id 
                          ? "border-primary bg-primary/5 shadow-sm" 
                          : "border-border hover:border-primary/50 hover:bg-accent/50"
                      }`}
                    >
                      <p className="font-medium">{variant.sku}</p>
                      <p className="text-xs text-muted-foreground">
                        Stock: {variant.stock}
                      </p>
                      {isLow && (
                        <p className="text-xs text-amber-500 dark:text-amber-400 flex items-center gap-1 mt-1">
                          <AlertTriangle className="h-3 w-3" />
                          Low stock
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <p className="font-semibold">Inventory Logs</p>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No inventory logs found.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Change</TableHead>
                    <TableHead>Variant</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {String(log.createdAt).replace("T", " ").slice(0, 19)}
                      </TableCell>
                      <TableCell
                        className={
                          log.change > 0 ? "text-green-600 dark:text-green-400" : log.change < 0 ? "text-red-600 dark:text-red-400" : ""
                        }
                      >
                        {log.change}
                      </TableCell>
                      <TableCell>{log.variant?.sku || "-"}</TableCell>
                      <TableCell>{log.warehouse?.code || "-"}</TableCell>
                      <TableCell className="max-w-[500px] truncate">{log.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {warehouseModalOpen && (
        <WarehouseManagerModal
          open={warehouseModalOpen}
          onClose={() => {
            setWarehouseModalOpen(false);
            void refreshAll();
          }}
        />
      )}
    </div>
  );
}

