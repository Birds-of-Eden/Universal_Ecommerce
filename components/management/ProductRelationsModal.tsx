"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Edit3, Plus, RefreshCw, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ProductType = "PHYSICAL" | "DIGITAL" | "SERVICE";

interface ProductLite {
  id: number;
  name: string;
  type: ProductType;
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
  productId: number;
  sku: string;
  price: number | string;
  currency: string;
  stock: number;
  digitalAssetId?: number | null;
  options: any;
  stockLevels?: StockLevel[];
}

interface AttributeValue {
  id: number;
  value: string;
}

interface Attribute {
  id: number;
  name: string;
  values: AttributeValue[];
}

interface ProductAttribute {
  id: number;
  productId: number;
  attributeId: number;
  value: string;
  attribute: { id: number; name: string };
}

interface ServiceSlot {
  id: number;
  productId: number;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  timezone?: string | null;
  location?: string | null;
  notes?: string | null;
}

interface InventoryLog {
  id: number;
  change: number;
  reason: string;
  createdAt: string;
  variant?: { id: number; sku: string } | null;
  warehouse?: { id: number; name: string; code: string } | null;
}

interface DigitalAsset {
  id: number;
  title: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  product: ProductLite | null;
}

export default function ProductRelationsModal({ open, onClose, product }: Props) {
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [productAttributes, setProductAttributes] = useState<ProductAttribute[]>([]);
  const [serviceSlots, setServiceSlots] = useState<ServiceSlot[]>([]);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [digitalAssets, setDigitalAssets] = useState<DigitalAsset[]>([]);

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  const [variantFormOpen, setVariantFormOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [variantForm, setVariantForm] = useState({
    sku: "",
    price: "",
    currency: "USD",
    stock: "0",
    option1Name: "",
    option1Value: "",
    option2Name: "",
    option2Value: "",
    digitalAssetId: "",
  });

  const [newAttr, setNewAttr] = useState({ attributeId: "", value: "" });
  const [stockDraft, setStockDraft] = useState<Record<number, string>>({});

  const [slotForm, setSlotForm] = useState({
    startsAt: "",
    endsAt: "",
    capacity: "1",
    timezone: "",
    location: "",
    notes: "",
  });

  const selectedVariant = useMemo(() => {
    if (!selectedVariantId) return null;
    return variants.find((v) => v.id === selectedVariantId) || null;
  }, [selectedVariantId, variants]);

  const selectedAttr = useMemo(() => {
    const id = Number(newAttr.attributeId);
    if (!id) return null;
    return attributes.find((a) => a.id === id) || null;
  }, [newAttr.attributeId, attributes]);

  const loadAll = async () => {
    if (!product?.id) return;
    try {
      setLoading(true);
      const [vRes, wRes, aRes, paRes, lRes, daRes, ssRes] = await Promise.all([
        fetch(`/api/product-variants?productId=${product.id}`, { cache: "no-store" }),
        fetch(`/api/warehouses`, { cache: "no-store" }),
        fetch(`/api/attributes`, { cache: "no-store" }),
        fetch(`/api/product-attributes?productId=${product.id}`, { cache: "no-store" }),
        fetch(`/api/inventory-logs?productId=${product.id}`, { cache: "no-store" }),
        fetch(`/api/digital-assets`, { cache: "no-store" }),
        product.type === "SERVICE"
          ? fetch(`/api/service-slots?productId=${product.id}`, { cache: "no-store" })
          : Promise.resolve(null as any),
      ]);

      const [v, w, a, pa, l, da, ss] = await Promise.all([
        vRes.json(),
        wRes.json(),
        aRes.json(),
        paRes.json(),
        lRes.json(),
        daRes.json(),
        ssRes ? ssRes.json() : Promise.resolve([]),
      ]);

      setVariants(v || []);
      setWarehouses(w || []);
      setAttributes(a || []);
      setProductAttributes(pa || []);
      setLogs(l || []);
      setDigitalAssets(da || []);
      setServiceSlots(ss || []);

      const firstVariantId = (v || [])[0]?.id;
      setSelectedVariantId((prev) => prev ?? firstVariantId ?? null);
    } catch {
      toast.error("Failed to load product relations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setSelectedVariantId(null);
    setVariantFormOpen(false);
    setEditingVariant(null);
    setVariantForm({
      sku: "",
      price: "",
      currency: "USD",
      stock: "0",
      option1Name: "",
      option1Value: "",
      option2Name: "",
      option2Value: "",
      digitalAssetId: "",
    });
    setNewAttr({ attributeId: "", value: "" });
    setStockDraft({});
    setSlotForm({
      startsAt: "",
      endsAt: "",
      capacity: "1",
      timezone: "",
      location: "",
      notes: "",
    });
    void loadAll();
  }, [open, product?.id]);

  useEffect(() => {
    if (!selectedVariant) return;
    const next: Record<number, string> = {};
    for (const w of warehouses) {
      const level = selectedVariant.stockLevels?.find((sl) => sl.warehouseId === w.id);
      next[w.id] = level ? String(level.quantity) : "0";
    }
    setStockDraft(next);
  }, [selectedVariant, warehouses]);

  const openAddVariant = () => {
    setEditingVariant(null);
    setVariantFormOpen(true);
    setVariantForm({
      sku: "",
      price: "",
      currency: "USD",
      stock: "0",
      option1Name: "",
      option1Value: "",
      option2Name: "",
      option2Value: "",
      digitalAssetId: "",
    });
  };

  const openEditVariant = (v: Variant) => {
    setEditingVariant(v);
    setVariantFormOpen(true);

    const opts = v.options && typeof v.options === "object" ? v.options : {};
    const entries = Object.entries(opts);
    const [o1, o2] = entries as any[];

    setVariantForm({
      sku: v.sku || "",
      price: String(v.price ?? ""),
      currency: v.currency || "USD",
      stock: String(v.stock ?? 0),
      option1Name: o1?.[0] || "",
      option1Value: o1?.[1] != null ? String(o1[1]) : "",
      option2Name: o2?.[0] || "",
      option2Value: o2?.[1] != null ? String(o2[1]) : "",
      digitalAssetId: v.digitalAssetId ? String(v.digitalAssetId) : "",
    });
  };

  const saveVariant = async () => {
    if (!product) return;

    const sku = variantForm.sku.trim();
    const price = Number(variantForm.price);
    const stock = Number(variantForm.stock);

    if (!sku) {
      toast.error("SKU is required");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Price is required");
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      toast.error("Stock must be 0 or more");
      return;
    }

    const options: Record<string, any> = {};
    if (variantForm.option1Name.trim()) {
      options[variantForm.option1Name.trim()] = variantForm.option1Value;
    }
    if (variantForm.option2Name.trim()) {
      options[variantForm.option2Name.trim()] = variantForm.option2Value;
    }

    const payload: any = {
      productId: product.id,
      sku,
      price,
      currency: variantForm.currency || "USD",
      stock,
      options,
      digitalAssetId: variantForm.digitalAssetId
        ? Number(variantForm.digitalAssetId)
        : null,
    };

    try {
      const url = editingVariant
        ? `/api/product-variants/${editingVariant.id}`
        : `/api/product-variants`;

      const res = await fetch(url, {
        method: editingVariant ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Save failed");

      toast.success(editingVariant ? "Variant updated" : "Variant created");
      setVariantFormOpen(false);
      setEditingVariant(null);
      await loadAll();
    } catch (err: any) {
      toast.error(err?.message || "Save failed");
    }
  };

  const deleteVariant = async (variantId: number) => {
    if (!confirm("Delete this variant?")) return;
    try {
      const res = await fetch(`/api/product-variants/${variantId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      toast.success("Variant deleted");
      await loadAll();
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    }
  };

  const addProductAttribute = async () => {
    if (!product) return;
    const attributeId = Number(newAttr.attributeId);
    const value = newAttr.value.trim();
    if (!attributeId) {
      toast.error("Select an attribute");
      return;
    }
    if (!value) {
      toast.error("Value is required");
      return;
    }

    try {
      const res = await fetch("/api/product-attributes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, attributeId, value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Add failed");

      toast.success("Attribute added");
      setNewAttr({ attributeId: "", value: "" });
      await loadAll();
    } catch (err: any) {
      toast.error(err?.message || "Add failed");
    }
  };

  const deleteProductAttribute = async (id: number) => {
    if (!confirm("Remove this product attribute?")) return;
    try {
      const res = await fetch(`/api/product-attributes/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      toast.success("Removed");
      await loadAll();
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    }
  };

  const saveStockLevel = async (warehouseId: number) => {
    if (!selectedVariant) return;
    const qty = Number(stockDraft[warehouseId]);
    if (!Number.isFinite(qty) || qty < 0) {
      toast.error("Quantity must be 0 or more");
      return;
    }

    try {
      const res = await fetch("/api/stock-levels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId,
          productVariantId: selectedVariant.id,
          quantity: qty,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Save failed");

      toast.success("Saved");
      await loadAll();
    } catch (err: any) {
      toast.error(err?.message || "Save failed");
    }
  };

  const deleteStockLevel = async (stockLevelId: number) => {
    if (!confirm("Delete this warehouse stock entry?")) return;
    try {
      const res = await fetch(`/api/stock-levels/${stockLevelId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      toast.success("Deleted");
      await loadAll();
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    }
  };

  const addServiceSlot = async () => {
    if (!product) return;
    if (!slotForm.startsAt || !slotForm.endsAt) {
      toast.error("Start and End are required");
      return;
    }

    const capacity = Number(slotForm.capacity || "1");
    if (!Number.isFinite(capacity) || capacity < 1) {
      toast.error("Capacity must be 1 or more");
      return;
    }

    try {
      const res = await fetch("/api/service-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          startsAt: slotForm.startsAt,
          endsAt: slotForm.endsAt,
          capacity,
          timezone: slotForm.timezone || null,
          location: slotForm.location || null,
          notes: slotForm.notes || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Create failed");
      toast.success("Service slot created");
      setSlotForm({
        startsAt: "",
        endsAt: "",
        capacity: "1",
        timezone: "",
        location: "",
        notes: "",
      });
      await loadAll();
    } catch (err: any) {
      toast.error(err?.message || "Create failed");
    }
  };

  const deleteServiceSlot = async (id: number) => {
    if (!confirm("Delete this service slot?")) return;
    try {
      const res = await fetch(`/api/service-slots/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed");
      toast.success("Deleted");
      await loadAll();
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate">
              Manage: {product.name} ({product.type})
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadAll}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button size="icon" variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="variants" className="w-full">
          <TabsList className="justify-start">
            <TabsTrigger value="variants">Variants</TabsTrigger>
            <TabsTrigger value="attributes">Attributes</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            {product.type === "SERVICE" && (
              <TabsTrigger value="service">Service Slots</TabsTrigger>
            )}
            <TabsTrigger value="logs">Inventory Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="variants">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Variants (SKU, price, stock, options)
                </p>
                <Button onClick={openAddVariant} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Variant
                </Button>
              </div>

              {variantFormOpen && (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">
                      {editingVariant ? "Edit Variant" : "New Variant"}
                    </p>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setVariantFormOpen(false);
                        setEditingVariant(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid md:grid-cols-4 gap-3">
                    <div className="md:col-span-2">
                      <Label>SKU *</Label>
                      <Input
                        value={variantForm.sku}
                        onChange={(e) =>
                          setVariantForm({ ...variantForm, sku: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Price *</Label>
                      <Input
                        type="number"
                        value={variantForm.price}
                        onChange={(e) =>
                          setVariantForm({
                            ...variantForm,
                            price: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Currency</Label>
                      <Input
                        value={variantForm.currency}
                        onChange={(e) =>
                          setVariantForm({
                            ...variantForm,
                            currency: e.target.value.toUpperCase(),
                          })
                        }
                      />
                    </div>
                  </div>

                  {product.type === "PHYSICAL" ? (
                    <div className="grid md:grid-cols-4 gap-3">
                      <div>
                        <Label>Stock</Label>
                        <Input
                          type="number"
                          value={variantForm.stock}
                          onChange={(e) =>
                            setVariantForm({
                              ...variantForm,
                              stock: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="md:col-span-3 text-xs text-muted-foreground flex items-end">
                        Tip: for multiple warehouses, manage stock from the Inventory tab.
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Stock is not used for {product.type} products.
                    </p>
                  )}

                  {product.type === "DIGITAL" && (
                    <div>
                      <Label>Digital Asset (optional)</Label>
                      <select
                        className="border p-2 rounded w-full"
                        value={variantForm.digitalAssetId}
                        onChange={(e) =>
                          setVariantForm({
                            ...variantForm,
                            digitalAssetId: e.target.value,
                          })
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

                  <div className="grid md:grid-cols-4 gap-3">
                    <div>
                      <Label>Option 1 Name</Label>
                      <Input
                        value={variantForm.option1Name}
                        onChange={(e) =>
                          setVariantForm({
                            ...variantForm,
                            option1Name: e.target.value,
                          })
                        }
                        placeholder="e.g. Color"
                      />
                    </div>
                    <div>
                      <Label>Option 1 Value</Label>
                      <Input
                        value={variantForm.option1Value}
                        onChange={(e) =>
                          setVariantForm({
                            ...variantForm,
                            option1Value: e.target.value,
                          })
                        }
                        placeholder="e.g. Red"
                      />
                    </div>
                    <div>
                      <Label>Option 2 Name</Label>
                      <Input
                        value={variantForm.option2Name}
                        onChange={(e) =>
                          setVariantForm({
                            ...variantForm,
                            option2Name: e.target.value,
                          })
                        }
                        placeholder="e.g. Size"
                      />
                    </div>
                    <div>
                      <Label>Option 2 Value</Label>
                      <Input
                        value={variantForm.option2Value}
                        onChange={(e) =>
                          setVariantForm({
                            ...variantForm,
                            option2Value: e.target.value,
                          })
                        }
                        placeholder="e.g. XL"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => {
                        setVariantFormOpen(false);
                        setEditingVariant(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={saveVariant} disabled={loading}>
                      {editingVariant ? "Update" : "Create"}
                    </Button>
                  </div>
                </div>
              )}

              {variants.length === 0 ? (
                <p className="text-sm text-muted-foreground">No variants found</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Price</TableHead>
                        {product.type === "PHYSICAL" && <TableHead>Stock</TableHead>}
                        <TableHead>Options</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {variants.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.sku}</TableCell>
                          <TableCell>
                            {v.currency} {String(v.price)}
                          </TableCell>
                          {product.type === "PHYSICAL" && (
                            <TableCell>{v.stock}</TableCell>
                          )}
                          <TableCell className="max-w-[320px] truncate">
                            {v.options && typeof v.options === "object"
                              ? Object.entries(v.options)
                                  .map(([k, val]) => `${k}: ${String(val)}`)
                                  .join(", ")
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditVariant(v)}
                              >
                                <Edit3 className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive"
                                onClick={() => deleteVariant(v.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="attributes">
            <div className="space-y-4">
              <div className="border rounded-lg p-4 space-y-3">
                <p className="font-semibold">Add Product Attribute</p>
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <Label>Attribute</Label>
                    <select
                      className="border p-2 rounded w-full"
                      value={newAttr.attributeId}
                      onChange={(e) =>
                        setNewAttr({ ...newAttr, attributeId: e.target.value })
                      }
                    >
                      <option value="">Select</option>
                      {attributes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Value</Label>
                    <Input
                      value={newAttr.value}
                      onChange={(e) =>
                        setNewAttr({ ...newAttr, value: e.target.value })
                      }
                      list={selectedAttr ? `attr-values-${selectedAttr.id}` : undefined}
                      placeholder="Type value"
                    />
                    {selectedAttr?.values?.length ? (
                      <datalist id={`attr-values-${selectedAttr.id}`}>
                        {selectedAttr.values.map((v) => (
                          <option key={v.id} value={v.value} />
                        ))}
                      </datalist>
                    ) : null}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={addProductAttribute}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              {productAttributes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No product attributes yet
                </p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Attribute</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productAttributes.map((pa) => (
                        <TableRow key={pa.id}>
                          <TableCell className="font-medium">
                            {pa.attribute?.name || pa.attributeId}
                          </TableCell>
                          <TableCell>{pa.value}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                              onClick={() => deleteProductAttribute(pa.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="inventory">
            {product.type !== "PHYSICAL" ? (
              <p className="text-sm text-muted-foreground">
                Inventory is only available for PHYSICAL products.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <Label>Variant</Label>
                    <select
                      className="border p-2 rounded"
                      value={selectedVariantId ?? ""}
                      onChange={(e) =>
                        setSelectedVariantId(
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                    >
                      <option value="">Select</option>
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.sku}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedVariant && (
                    <p className="text-sm text-muted-foreground pt-6">
                      Total stock:{" "}
                      <span className="font-medium">{selectedVariant.stock}</span>
                    </p>
                  )}
                </div>

                {!selectedVariant ? (
                  <p className="text-sm text-muted-foreground">
                    Select a variant to manage stock levels.
                  </p>
                ) : warehouses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No warehouses yet. Create one from the Warehouses button on the products page.
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
                        {warehouses.map((w) => {
                          const level =
                            selectedVariant.stockLevels?.find(
                              (sl) => sl.warehouseId === w.id,
                            ) || null;
                          const reserved = level ? Number(level.reserved) : 0;
                          const qty = Number(stockDraft[w.id] ?? 0);
                          const available = Math.max(0, qty - reserved);

                          return (
                            <TableRow key={w.id}>
                              <TableCell className="font-medium">
                                {w.name} ({w.code})
                                {w.isDefault && (
                                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full border">
                                    Default
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  className="w-28"
                                  value={stockDraft[w.id] ?? "0"}
                                  onChange={(e) =>
                                    setStockDraft((prev) => ({
                                      ...prev,
                                      [w.id]: e.target.value,
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
                                    onClick={() => saveStockLevel(w.id)}
                                    disabled={loading}
                                  >
                                    Save
                                  </Button>
                                  {level && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="text-destructive"
                                      onClick={() => deleteStockLevel(level.id)}
                                      disabled={loading}
                                    >
                                      <Trash2 className="h-3 w-3" />
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
              </div>
            )}
          </TabsContent>

          {product.type === "SERVICE" && (
            <TabsContent value="service">
              <div className="space-y-4">
                <div className="border rounded-lg p-4 space-y-3">
                  <p className="font-semibold">Add Service Slot</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <Label>Start *</Label>
                      <Input
                        type="datetime-local"
                        value={slotForm.startsAt}
                        onChange={(e) =>
                          setSlotForm({ ...slotForm, startsAt: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>End *</Label>
                      <Input
                        type="datetime-local"
                        value={slotForm.endsAt}
                        onChange={(e) =>
                          setSlotForm({ ...slotForm, endsAt: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <Label>Capacity</Label>
                      <Input
                        type="number"
                        value={slotForm.capacity}
                        onChange={(e) =>
                          setSlotForm({ ...slotForm, capacity: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Timezone</Label>
                      <Input
                        value={slotForm.timezone}
                        onChange={(e) =>
                          setSlotForm({ ...slotForm, timezone: e.target.value })
                        }
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <Label>Location</Label>
                      <Input
                        value={slotForm.location}
                        onChange={(e) =>
                          setSlotForm({ ...slotForm, location: e.target.value })
                        }
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Input
                      value={slotForm.notes}
                      onChange={(e) =>
                        setSlotForm({ ...slotForm, notes: e.target.value })
                      }
                      placeholder="Optional"
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={addServiceSlot}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Slot
                    </Button>
                  </div>
                </div>

                {serviceSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No service slots yet
                  </p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Start</TableHead>
                          <TableHead>End</TableHead>
                          <TableHead>Capacity</TableHead>
                          <TableHead>Booked</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {serviceSlots.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell>
                              {String(s.startsAt).replace("T", " ").slice(0, 16)}
                            </TableCell>
                            <TableCell>
                              {String(s.endsAt).replace("T", " ").slice(0, 16)}
                            </TableCell>
                            <TableCell>{s.capacity}</TableCell>
                            <TableCell>{s.bookedCount}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive"
                                onClick={() => deleteServiceSlot(s.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          <TabsContent value="logs">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No inventory logs</p>
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
                    {logs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="whitespace-nowrap">
                          {String(l.createdAt).replace("T", " ").slice(0, 19)}
                        </TableCell>
                        <TableCell>{l.change}</TableCell>
                        <TableCell>{l.variant?.sku || "-"}</TableCell>
                        <TableCell>{l.warehouse?.code || "-"}</TableCell>
                        <TableCell className="max-w-[420px] truncate">
                          {l.reason}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
