"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { RefreshCw, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";

type Supplier = {
  id: number;
  name: string;
  code: string;
  currency: string;
};

type Warehouse = {
  id: number;
  name: string;
  code: string;
};

type Variant = {
  id: number;
  sku: string;
  productId: number;
  stock: number;
};

type PurchaseOrder = {
  id: number;
  poNumber: string;
  status: string;
  approvalStage: string;
  orderDate: string;
  expectedAt: string | null;
  notes: string | null;
  termsTemplateName: string | null;
  termsAndConditions: string | null;
  rejectionNote: string | null;
  currency: string;
  grandTotal: number | string;
  supplier: Supplier;
  warehouse: Warehouse;
  items: Array<{
    id: number;
    description: string | null;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: number | string;
    lineTotal: number | string;
    productVariant: {
      id: number;
      sku: string;
      product: {
        id: number;
        name: string;
      };
    };
  }>;
};

type PurchaseOrderTermsTemplate = {
  id: number;
  code: string;
  name: string;
  body: string;
  isDefault: boolean;
  isActive: boolean;
};

type PurchaseOrderDraftItem = {
  productVariantId: string;
  quantityOrdered: string;
  unitCost: string;
  description: string;
};

const emptyLine = (): PurchaseOrderDraftItem => ({
  productVariantId: "",
  quantityOrdered: "1",
  unitCost: "",
  description: "",
});

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || fallbackMessage);
  }
  return data as T;
}

export default function PurchaseOrdersPage() {
  const { data: session } = useSession();
  const permissions = Array.isArray((session?.user as any)?.permissions)
    ? ((session?.user as any).permissions as string[])
    : [];
  const canManage = permissions.includes("purchase_orders.manage");
  const canApproveLegacy = permissions.includes("purchase_orders.approve");
  const canApproveManager =
    permissions.includes("purchase_orders.approve_manager") || canApproveLegacy;
  const canApproveCommittee =
    permissions.includes("purchase_orders.approve_committee") || canApproveLegacy;
  const canApproveFinal =
    permissions.includes("purchase_orders.approve_final") || canApproveLegacy;
  const canApproveAny = canApproveManager || canApproveCommittee || canApproveFinal;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [termsTemplates, setTermsTemplates] = useState<PurchaseOrderTermsTemplate[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [termsTemplateId, setTermsTemplateId] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [items, setItems] = useState<PurchaseOrderDraftItem[]>([emptyLine()]);

  const loadPageData = async () => {
    try {
      setLoading(true);
      const [ordersRes, warehousesRes, variantsRes, suppliersRes, templatesRes] =
        await Promise.all([
        fetch("/api/scm/purchase-orders", { cache: "no-store" }),
        fetch("/api/warehouses", { cache: "no-store" }),
        fetch("/api/product-variants", { cache: "no-store" }),
        fetch("/api/scm/suppliers", { cache: "no-store" }),
        fetch("/api/scm/purchase-order-terms-templates", { cache: "no-store" }),
      ]);

      const [orders, warehouseData, variantData, supplierData, templateData] =
        await Promise.all([
          readJson<PurchaseOrder[]>(ordersRes, "Failed to load purchase orders"),
          readJson<Warehouse[]>(warehousesRes, "Failed to load warehouses"),
          readJson<Variant[]>(variantsRes, "Failed to load variants"),
          suppliersRes.ok ? supplierResToJson<Supplier[]>(suppliersRes) : Promise.resolve([]),
          templatesRes.ok
            ? readJson<PurchaseOrderTermsTemplate[]>(
                templatesRes,
                "Failed to load PO terms templates",
              )
            : Promise.resolve([]),
        ]);

      setPurchaseOrders(Array.isArray(orders) ? orders : []);
      setWarehouses(Array.isArray(warehouseData) ? warehouseData : []);
      setVariants(Array.isArray(variantData) ? variantData : []);
      setSuppliers(Array.isArray(supplierData) ? supplierData : []);
      setTermsTemplates(Array.isArray(templateData) ? templateData : []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load purchase order data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPageData();
  }, []);

  const visibleOrders = useMemo(() => {
    return purchaseOrders.filter((purchaseOrder) => {
      const matchesStatus =
        statusFilter === "ALL" || purchaseOrder.status === statusFilter;
      if (!matchesStatus) return false;
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return (
        purchaseOrder.poNumber.toLowerCase().includes(query) ||
        purchaseOrder.supplier.name.toLowerCase().includes(query) ||
        purchaseOrder.warehouse.name.toLowerCase().includes(query)
      );
    });
  }, [purchaseOrders, search, statusFilter]);

  const estimatedTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const quantity = Number(item.quantityOrdered);
      const unitCost = Number(item.unitCost);
      if (!Number.isFinite(quantity) || !Number.isFinite(unitCost)) return sum;
      return sum + quantity * unitCost;
    }, 0);
  }, [items]);

  const defaultTemplate = useMemo(
    () => termsTemplates.find((template) => template.isDefault) ?? termsTemplates[0] ?? null,
    [termsTemplates],
  );

  useEffect(() => {
    if (!termsTemplateId && defaultTemplate) {
      setTermsTemplateId(String(defaultTemplate.id));
      if (!termsAndConditions.trim()) {
        setTermsAndConditions(defaultTemplate.body);
      }
    }
  }, [defaultTemplate, termsAndConditions, termsTemplateId]);

  const applyTemplateSelection = (nextTemplateId: string) => {
    setTermsTemplateId(nextTemplateId);
    const selectedTemplate = termsTemplates.find(
      (template) => String(template.id) === nextTemplateId,
    );
    if (selectedTemplate) {
      setTermsAndConditions(selectedTemplate.body);
      return;
    }
    if (!nextTemplateId) {
      setTermsAndConditions("");
    }
  };

  const resetForm = () => {
    setSupplierId("");
    setWarehouseId("");
    setExpectedAt("");
    setNotes("");
    setTermsTemplateId(defaultTemplate ? String(defaultTemplate.id) : "");
    setTermsAndConditions(defaultTemplate?.body || "");
    setItems([emptyLine()]);
  };

  const updateItem = (
    index: number,
    key: keyof PurchaseOrderDraftItem,
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  };

  const createPurchaseOrder = async () => {
    if (!supplierId || !warehouseId) {
      toast.error("Supplier and warehouse are required");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/scm/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: Number(supplierId),
          warehouseId: Number(warehouseId),
          expectedAt: expectedAt || null,
          notes,
          termsTemplateId: termsTemplateId ? Number(termsTemplateId) : null,
          termsAndConditions,
          items: items.map((item) => ({
            productVariantId: Number(item.productVariantId),
            quantityOrdered: Number(item.quantityOrdered),
            unitCost: Number(item.unitCost),
            description: item.description,
          })),
        }),
      });
      await readJson(response, "Failed to create purchase order");
      toast.success("Purchase order created");
      resetForm();
      await loadPageData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create purchase order");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (purchaseOrderId: number, action: string) => {
    const actionLabels: Record<string, string> = {
      submit: "submitted",
      manager_approve: "manager-approved",
      committee_approve: "committee-approved",
      final_approve: "final-approved",
      reject: "rejected",
      cancel: "cancelled",
    };
    try {
      const response = await fetch(`/api/scm/purchase-orders/${purchaseOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await readJson(response, `Failed to ${action} purchase order`);
      toast.success(`Purchase order ${actionLabels[action] ?? action} successfully`);
      await loadPageData();
    } catch (error: any) {
      toast.error(error?.message || `Failed to ${action} purchase order`);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <p className="text-sm text-muted-foreground">
            Create and control warehouse-specific procurement orders.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search PO number, supplier, warehouse..."
            className="w-full md:w-80"
          />
          <Button variant="outline" onClick={() => void loadPageData()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Purchase Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Supplier</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={supplierId}
                  onChange={(event) => setSupplierId(event.target.value)}
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Warehouse</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={warehouseId}
                  onChange={(event) => setWarehouseId(event.target.value)}
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Expected Delivery</Label>
                <Input
                  type="date"
                  value={expectedAt}
                  onChange={(event) => setExpectedAt(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setItems((prev) => [...prev, emptyLine()])}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Line
                </Button>
              </div>

              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-lg border p-3 md:grid-cols-[2fr_1fr_1fr_2fr_auto]"
                >
                  <div>
                    <Label>Variant</Label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2"
                      value={item.productVariantId}
                      onChange={(event) =>
                        updateItem(index, "productVariantId", event.target.value)
                      }
                    >
                      <option value="">Select variant</option>
                      {variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.sku}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantityOrdered}
                      onChange={(event) =>
                        updateItem(index, "quantityOrdered", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Unit Cost</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitCost}
                      onChange={(event) => updateItem(index, "unitCost", event.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(event) =>
                        updateItem(index, "description", event.target.value)
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setItems((prev) =>
                          prev.length === 1
                            ? prev
                            : prev.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Terms Template</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={termsTemplateId}
                  onChange={(event) => applyTemplateSelection(event.target.value)}
                >
                  <option value="">No template</option>
                  {termsTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                      {template.isDefault ? " (Default)" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Template auto-fills terms. You can still customize below before saving.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <div>
              <Label>Terms & Conditions</Label>
              <Textarea
                value={termsAndConditions}
                onChange={(event) => setTermsAndConditions(event.target.value)}
                rows={7}
              />
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-muted-foreground">
                Estimated total: <span className="font-medium text-foreground">{estimatedTotal.toFixed(2)}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm} disabled={saving}>
                  Clear
                </Button>
                <Button onClick={() => void createPurchaseOrder()} disabled={saving}>
                  {saving ? "Saving..." : "Create Draft"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Purchase Order Register</CardTitle>
          <select
            className="w-full rounded-md border bg-background px-3 py-2 md:w-56"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="MANAGER_APPROVED">Manager Approved</option>
            <option value="COMMITTEE_APPROVED">Committee Approved</option>
            <option value="APPROVED">Approved</option>
            <option value="PARTIALLY_RECEIVED">Partially Received</option>
            <option value="RECEIVED">Received</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading purchase orders...</p>
          ) : visibleOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchase orders found.</p>
          ) : (
            <div className="space-y-4">
              {visibleOrders.map((purchaseOrder) => (
                <div key={purchaseOrder.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-lg font-semibold">{purchaseOrder.poNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {purchaseOrder.supplier.name} • {purchaseOrder.warehouse.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(purchaseOrder.orderDate).toLocaleDateString()} • {purchaseOrder.status} •{" "}
                        Stage: {purchaseOrder.approvalStage}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {purchaseOrder.status === "DRAFT" && canManage ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void changeStatus(purchaseOrder.id, "submit")}
                        >
                          Submit
                        </Button>
                      ) : null}
                      {purchaseOrder.status === "SUBMITTED" && canApproveManager ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void changeStatus(purchaseOrder.id, "manager_approve")}
                        >
                          Manager Approve
                        </Button>
                      ) : null}
                      {purchaseOrder.status === "MANAGER_APPROVED" && canApproveCommittee ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void changeStatus(purchaseOrder.id, "committee_approve")
                          }
                        >
                          Committee Approve
                        </Button>
                      ) : null}
                      {purchaseOrder.status === "COMMITTEE_APPROVED" && canApproveFinal ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void changeStatus(purchaseOrder.id, "final_approve")}
                        >
                          Final Approve
                        </Button>
                      ) : null}
                      {["SUBMITTED", "MANAGER_APPROVED", "COMMITTEE_APPROVED"].includes(
                        purchaseOrder.status,
                      ) && canApproveAny ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => void changeStatus(purchaseOrder.id, "reject")}
                        >
                          Reject
                        </Button>
                      ) : null}
                      {["DRAFT", "SUBMITTED", "MANAGER_APPROVED", "COMMITTEE_APPROVED", "APPROVED"].includes(
                        purchaseOrder.status,
                      ) &&
                      (canManage || canApproveAny) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void changeStatus(purchaseOrder.id, "cancel")}
                        >
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Ordered</TableHead>
                          <TableHead>Received</TableHead>
                          <TableHead>Unit Cost</TableHead>
                          <TableHead>Line Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchaseOrder.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium">{item.productVariant.product.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.productVariant.sku}
                              </div>
                            </TableCell>
                            <TableCell>{item.quantityOrdered}</TableCell>
                            <TableCell>{item.quantityReceived}</TableCell>
                            <TableCell>{Number(item.unitCost).toFixed(2)}</TableCell>
                            <TableCell>{Number(item.lineTotal).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-3 text-right text-sm font-medium">
                    Grand Total: {Number(purchaseOrder.grandTotal).toFixed(2)} {purchaseOrder.currency}
                  </div>
                  {purchaseOrder.termsAndConditions ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Terms Template: {purchaseOrder.termsTemplateName || "Custom"}.
                    </p>
                  ) : null}
                  {purchaseOrder.rejectionNote ? (
                    <p className="mt-2 text-xs text-destructive">
                      Rejection note: {purchaseOrder.rejectionNote}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function supplierResToJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => []);
  return data as T;
}
