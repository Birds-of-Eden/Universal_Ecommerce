"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { RefreshCw } from "lucide-react";
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

type PurchaseOrder = {
  id: number;
  poNumber: string;
  status: string;
  warehouse: {
    id: number;
    name: string;
    code: string;
  };
  supplier: {
    id: number;
    name: string;
    code: string;
  };
  items: Array<{
    id: number;
    quantityOrdered: number;
    quantityReceived: number;
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

type GoodsReceipt = {
  id: number;
  receiptNumber: string;
  status: string;
  receivedAt: string;
  warehouse: {
    id: number;
    name: string;
    code: string;
  };
  purchaseOrder: {
    id: number;
    poNumber: string;
    supplier: {
      name: string;
    };
  };
  items: Array<{
    id: number;
    quantityReceived: number;
    productVariant: {
      sku: string;
      product: {
        name: string;
      };
    };
  }>;
};

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || fallbackMessage);
  }
  return data as T;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  return readJson<T>(response, "Request failed");
}

export default function GoodsReceiptsPage() {
  const { data: session } = useSession();
  const permissions = Array.isArray((session?.user as any)?.permissions)
    ? ((session?.user as any).permissions as string[])
    : [];
  const canManage = permissions.includes("goods_receipts.manage");

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState("");
  const [receiptNote, setReceiptNote] = useState("");
  const [quantityDraft, setQuantityDraft] = useState<Record<number, string>>({});

  const loadPageData = async () => {
    try {
      setLoading(true);
      const [purchaseOrderData, receiptData] = await Promise.all([
        getJson<PurchaseOrder[]>("/api/scm/purchase-orders"),
        getJson<GoodsReceipt[]>("/api/scm/goods-receipts"),
      ]);
      setPurchaseOrders(Array.isArray(purchaseOrderData) ? purchaseOrderData : []);
      setReceipts(Array.isArray(receiptData) ? receiptData : []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load receipt data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPageData();
  }, []);

  const eligiblePurchaseOrders = useMemo(() => {
    return purchaseOrders.filter((purchaseOrder) =>
      ["APPROVED", "PARTIALLY_RECEIVED"].includes(purchaseOrder.status),
    );
  }, [purchaseOrders]);

  const selectedPurchaseOrder = useMemo(() => {
    const purchaseOrderId = Number(selectedPurchaseOrderId);
    if (!Number.isInteger(purchaseOrderId) || purchaseOrderId <= 0) return null;
    return eligiblePurchaseOrders.find((purchaseOrder) => purchaseOrder.id === purchaseOrderId) || null;
  }, [eligiblePurchaseOrders, selectedPurchaseOrderId]);

  useEffect(() => {
    if (!selectedPurchaseOrder) {
      setQuantityDraft({});
      return;
    }
    setQuantityDraft(
      Object.fromEntries(
        selectedPurchaseOrder.items.map((item) => [
          item.id,
          String(Math.max(item.quantityOrdered - item.quantityReceived, 0)),
        ]),
      ),
    );
  }, [selectedPurchaseOrder]);

  const postReceipt = async () => {
    if (!selectedPurchaseOrder) {
      toast.error("Select a purchase order");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/scm/goods-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId: selectedPurchaseOrder.id,
          note: receiptNote,
          items: selectedPurchaseOrder.items
            .map((item) => ({
              purchaseOrderItemId: item.id,
              quantityReceived: Number(quantityDraft[item.id] || 0),
            }))
            .filter((item) => item.quantityReceived > 0),
        }),
      });
      await readJson(response, "Failed to post goods receipt");
      toast.success("Goods receipt posted");
      setReceiptNote("");
      setSelectedPurchaseOrderId("");
      setQuantityDraft({});
      await loadPageData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to post goods receipt");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goods Receipts</h1>
          <p className="text-sm text-muted-foreground">
            Receive stock against approved purchase orders.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadPageData()} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Post Goods Receipt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Purchase Order</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2"
                value={selectedPurchaseOrderId}
                onChange={(event) => setSelectedPurchaseOrderId(event.target.value)}
              >
                <option value="">Select approved purchase order</option>
                {eligiblePurchaseOrders.map((purchaseOrder) => (
                  <option key={purchaseOrder.id} value={purchaseOrder.id}>
                    {purchaseOrder.poNumber} • {purchaseOrder.supplier.name} • {purchaseOrder.warehouse.code}
                  </option>
                ))}
              </select>
            </div>

            {selectedPurchaseOrder ? (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">
                  {selectedPurchaseOrder.supplier.name} • {selectedPurchaseOrder.warehouse.name} • {selectedPurchaseOrder.status}
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Ordered</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead>Remaining</TableHead>
                        <TableHead>Receive Now</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPurchaseOrder.items.map((item) => {
                        const remaining = Math.max(
                          item.quantityOrdered - item.quantityReceived,
                          0,
                        );
                        return (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium">{item.productVariant.product.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.productVariant.sku}
                              </div>
                            </TableCell>
                            <TableCell>{item.quantityOrdered}</TableCell>
                            <TableCell>{item.quantityReceived}</TableCell>
                            <TableCell>{remaining}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max={remaining}
                                value={quantityDraft[item.id] ?? "0"}
                                onChange={(event) =>
                                  setQuantityDraft((prev) => ({
                                    ...prev,
                                    [item.id]: event.target.value,
                                  }))
                                }
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div>
                  <Label>Receipt Note</Label>
                  <Textarea
                    rows={4}
                    value={receiptNote}
                    onChange={(event) => setReceiptNote(event.target.value)}
                  />
                </div>
                <Button onClick={() => void postReceipt()} disabled={saving}>
                  {saving ? "Posting..." : "Post Goods Receipt"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select an approved purchase order to receive stock.
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Receipt Register</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading goods receipts...</p>
          ) : receipts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No goods receipts found.</p>
          ) : (
            <div className="space-y-4">
              {receipts.map((receipt) => (
                <div key={receipt.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-lg font-semibold">{receipt.receiptNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {receipt.purchaseOrder.poNumber} • {receipt.purchaseOrder.supplier.name}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(receipt.receivedAt).toLocaleString()} • {receipt.warehouse.code}
                    </div>
                  </div>
                  <div className="mt-4 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Qty Received</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receipt.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium">{item.productVariant.product.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.productVariant.sku}
                              </div>
                            </TableCell>
                            <TableCell>{item.quantityReceived}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
