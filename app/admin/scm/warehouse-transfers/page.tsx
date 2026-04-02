"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Warehouse = {
  id: number;
  name: string;
  code: string;
};

type ProductVariant = {
  id: number;
  sku: string;
  product?: {
    name: string;
  };
};

type WarehouseTransferItem = {
  id: number;
  productVariantId: number;
  description: string | null;
  quantityRequested: number;
  quantityDispatched: number;
  quantityReceived: number;
  productVariant: {
    id: number;
    sku: string;
    product: {
      name: string;
    };
    stockLevels?: Array<{
      warehouseId: number;
      quantity: number;
      reserved: number;
    }>;
  };
};

type WarehouseTransfer = {
  id: number;
  transferNumber: string;
  status: string;
  requestedAt: string;
  requiredBy: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  dispatchedAt: string | null;
  receivedAt: string | null;
  note: string | null;
  sourceWarehouseId: number;
  destinationWarehouseId: number;
  sourceWarehouse: Warehouse;
  destinationWarehouse: Warehouse;
  items: WarehouseTransferItem[];
};

type DraftItem = {
  productVariantId: string;
  quantityRequested: string;
  description: string;
};

const emptyLine = (): DraftItem => ({
  productVariantId: "",
  quantityRequested: "",
  description: "",
});

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || fallback);
  }
  return payload as T;
}

function formatDate(value: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function totalQuantity(
  items: WarehouseTransferItem[],
  field: "quantityRequested" | "quantityDispatched" | "quantityReceived",
) {
  return items.reduce((sum, item) => sum + Number(item[field] || 0), 0);
}

export default function WarehouseTransfersPage() {
  const { data: session } = useSession();
  const permissions = Array.isArray((session?.user as any)?.permissions)
    ? ((session?.user as any).permissions as string[])
    : [];

  const canRead = permissions.some((permission) =>
    ["warehouse_transfers.read", "warehouse_transfers.manage", "warehouse_transfers.approve"].includes(permission),
  );
  const canManage = permissions.includes("warehouse_transfers.manage");
  const canApprove = permissions.includes("warehouse_transfers.approve");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceWarehouseId, setSourceWarehouseId] = useState("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState("");
  const [requiredBy, setRequiredBy] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<DraftItem[]>([emptyLine()]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [transfers, setTransfers] = useState<WarehouseTransfer[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [transferData, warehouseData, variantData] = await Promise.all([
        fetch("/api/scm/warehouse-transfers", { cache: "no-store" }).then((response) =>
          readJson<WarehouseTransfer[]>(response, "Failed to load warehouse transfers"),
        ),
        fetch("/api/warehouses", { cache: "no-store" }).then((response) =>
          readJson<Warehouse[]>(response, "Failed to load warehouses"),
        ),
        fetch("/api/product-variants", { cache: "no-store" }).then((response) =>
          readJson<ProductVariant[]>(response, "Failed to load product variants"),
        ),
      ]);
      setTransfers(Array.isArray(transferData) ? transferData : []);
      setWarehouses(Array.isArray(warehouseData) ? warehouseData : []);
      setVariants(Array.isArray(variantData) ? variantData : []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load warehouse transfer data");
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canRead) {
      void loadData();
    }
  }, [canRead]);

  const visibleTransfers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transfers.filter((transfer) => {
      if (statusFilter && transfer.status !== statusFilter) return false;
      if (!query) return true;
      return (
        transfer.transferNumber.toLowerCase().includes(query) ||
        transfer.sourceWarehouse.name.toLowerCase().includes(query) ||
        transfer.destinationWarehouse.name.toLowerCase().includes(query)
      );
    });
  }, [search, statusFilter, transfers]);

  const createTransfer = async () => {
    if (!sourceWarehouseId || !destinationWarehouseId) {
      toast.error("Source and destination warehouses are required");
      return;
    }
    if (sourceWarehouseId === destinationWarehouseId) {
      toast.error("Source and destination warehouses must be different");
      return;
    }

    const payloadItems = items
      .map((item) => ({
        productVariantId: Number(item.productVariantId),
        quantityRequested: Number(item.quantityRequested),
        description: item.description.trim(),
      }))
      .filter((item) => Number.isInteger(item.productVariantId) && item.productVariantId > 0 && Number.isInteger(item.quantityRequested) && item.quantityRequested > 0);

    if (payloadItems.length === 0) {
      toast.error("At least one valid transfer line is required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/scm/warehouse-transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceWarehouseId: Number(sourceWarehouseId),
          destinationWarehouseId: Number(destinationWarehouseId),
          requiredBy: requiredBy || null,
          note,
          items: payloadItems,
        }),
      });
      await readJson(response, "Failed to create warehouse transfer");
      toast.success("Warehouse transfer created");
      setSourceWarehouseId("");
      setDestinationWarehouseId("");
      setRequiredBy("");
      setNote("");
      setItems([emptyLine()]);
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create warehouse transfer");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (transferId: number, action: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/scm/warehouse-transfers/${transferId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await readJson(response, `Failed to ${action} warehouse transfer`);
      toast.success(`Warehouse transfer ${action}ed`);
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || `Failed to ${action} warehouse transfer`);
    } finally {
      setSaving(false);
    }
  };

  const updateItem = (index: number, key: keyof DraftItem, value: string) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  };

  const statusOptions = [
    "DRAFT",
    "SUBMITTED",
    "APPROVED",
    "PARTIALLY_DISPATCHED",
    "DISPATCHED",
    "PARTIALLY_RECEIVED",
    "RECEIVED",
    "CANCELLED",
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Warehouse Transfers</h1>
        <p className="text-sm text-muted-foreground">
          Approve, dispatch, and receive internal stock movement between warehouses.
        </p>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Warehouse Transfer</CardTitle>
            <CardDescription>
              Start a transfer request from one warehouse to another, then submit it for approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>Source Warehouse</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={sourceWarehouseId}
                  onChange={(event) => setSourceWarehouseId(event.target.value)}
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Destination Warehouse</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={destinationWarehouseId}
                  onChange={(event) => setDestinationWarehouseId(event.target.value)}
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Required By</Label>
                <Input
                  type="datetime-local"
                  value={requiredBy}
                  onChange={(event) => setRequiredBy(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Note</Label>
                <Textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Transfer Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setItems((current) => [...current, emptyLine()])}
                >
                  Add Line
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[2fr_1fr_2fr_auto]">
                  <div className="space-y-2">
                    <Label>Variant</Label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={item.productVariantId}
                      onChange={(event) => updateItem(index, "productVariantId", event.target.value)}
                    >
                      <option value="">Select variant</option>
                      {variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.product?.name ?? "Variant"} ({variant.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantityRequested}
                      onChange={(event) => updateItem(index, "quantityRequested", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(event) => updateItem(index, "description", event.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={items.length === 1}
                      onClick={() =>
                        setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button onClick={() => void createTransfer()} disabled={saving}>
              {saving ? "Saving..." : "Create Transfer"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Transfer Queue</CardTitle>
          <CardDescription>
            Monitor transfer requests and progress through approval, dispatch, and receipt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
            <Input
              placeholder="Search transfer number or warehouse..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading warehouse transfers...</p>
          ) : visibleTransfers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No warehouse transfers found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transfer</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleTransfers.map((transfer) => {
                  const requested = totalQuantity(transfer.items, "quantityRequested");
                  const dispatched = totalQuantity(transfer.items, "quantityDispatched");
                  const received = totalQuantity(transfer.items, "quantityReceived");
                  return (
                    <TableRow key={transfer.id}>
                      <TableCell className="align-top">
                        <div className="font-medium">{transfer.transferNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          Requested {formatDate(transfer.requestedAt)}
                        </div>
                        {transfer.note ? (
                          <div className="mt-1 text-xs text-muted-foreground">{transfer.note}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        <div>{transfer.sourceWarehouse.name}</div>
                        <div className="text-muted-foreground">
                          to {transfer.destinationWarehouse.name}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="font-medium">{transfer.status}</div>
                        {transfer.requiredBy ? (
                          <div className="text-xs text-muted-foreground">
                            Need by {formatDate(transfer.requiredBy)}
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        <div>Requested: {requested}</div>
                        <div>Dispatched: {dispatched}</div>
                        <div>Received: {received}</div>
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          {transfer.items.map((item) => (
                            <div key={item.id}>
                              {item.productVariant.sku}: {item.quantityRequested}/{item.quantityDispatched}/{item.quantityReceived}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-xs text-muted-foreground">
                        <div>Submitted: {formatDate(transfer.submittedAt)}</div>
                        <div>Approved: {formatDate(transfer.approvedAt)}</div>
                        <div>Dispatched: {formatDate(transfer.dispatchedAt)}</div>
                        <div>Received: {formatDate(transfer.receivedAt)}</div>
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          {canManage && transfer.status === "DRAFT" ? (
                            <Button size="sm" variant="outline" onClick={() => void runAction(transfer.id, "submit")} disabled={saving}>
                              Submit
                            </Button>
                          ) : null}
                          {canApprove && transfer.status === "SUBMITTED" ? (
                            <Button size="sm" variant="outline" onClick={() => void runAction(transfer.id, "approve")} disabled={saving}>
                              Approve
                            </Button>
                          ) : null}
                          {canManage && ["APPROVED", "PARTIALLY_DISPATCHED", "PARTIALLY_RECEIVED"].includes(transfer.status) ? (
                            <Button size="sm" variant="outline" onClick={() => void runAction(transfer.id, "dispatch")} disabled={saving}>
                              Dispatch
                            </Button>
                          ) : null}
                          {canManage && ["DISPATCHED", "PARTIALLY_DISPATCHED", "PARTIALLY_RECEIVED"].includes(transfer.status) ? (
                            <Button size="sm" variant="outline" onClick={() => void runAction(transfer.id, "receive")} disabled={saving}>
                              Receive
                            </Button>
                          ) : null}
                          {canManage && ["DRAFT", "SUBMITTED", "APPROVED"].includes(transfer.status) ? (
                            <Button size="sm" variant="ghost" onClick={() => void runAction(transfer.id, "cancel")} disabled={saving}>
                              Cancel
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
