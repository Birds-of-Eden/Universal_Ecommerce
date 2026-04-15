"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Warehouse = {
  id: number;
  name: string;
  code: string;
};

type MaterialRequest = {
  id: number;
  requestNumber: string;
  warehouseId: number;
  status: string;
  purpose: string | null;
  requiredBy: string | null;
  warehouse: Warehouse;
  items: Array<{
    id: number;
    quantityRequested: number;
    quantityReleased: number;
    productVariantId: number;
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

type MaterialRelease = {
  id: number;
  releaseNumber: string;
  challanNumber: string | null;
  waybillNumber: string | null;
  materialRequestId: number;
  warehouseId: number;
  status: string;
  note: string | null;
  releasedAt: string;
  warehouse: Warehouse;
  releasedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  materialRequest: {
    id: number;
    requestNumber: string;
    status: string;
    createdBy: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  };
  items: Array<{
    id: number;
    materialRequestItemId: number;
    quantityReleased: number;
    unitCost: string | null;
    productVariant: {
      id: number;
      sku: string;
      product: {
        id: number;
        name: string;
      };
    };
    assetRegisters: Array<{
      id: number;
      assetTag: string;
      status: string;
    }>;
  }>;
};

type ReleaseDraftItem = {
  materialRequestItemId: number;
  productName: string;
  sku: string;
  quantityRequested: number;
  quantityReleased: number;
  remainingQty: number;
  quantityToRelease: string;
};

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || fallback);
  }
  return payload as T;
}

function formatDateTime(value: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function formatMoney(value: string | number | null | undefined) {
  return Number(value || 0).toFixed(2);
}

export default function MaterialReleasesPage() {
  const { data: session } = useSession();
  const permissions = Array.isArray((session?.user as any)?.permissions)
    ? ((session?.user as any).permissions as string[])
    : [];

  const canRead = permissions.some((permission) =>
    [
      "material_releases.read",
      "material_releases.manage",
      "material_requests.read",
      "material_requests.approve_admin",
    ].includes(permission),
  );
  const canManage = permissions.includes("material_releases.manage");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [materialReleases, setMaterialReleases] = useState<MaterialRelease[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [materialRequestId, setMaterialRequestId] = useState("");
  const [note, setNote] = useState("");
  const [challanNumber, setChallanNumber] = useState("");
  const [waybillNumber, setWaybillNumber] = useState("");
  const [releaseItems, setReleaseItems] = useState<ReleaseDraftItem[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [requestData, releaseData] = await Promise.all([
        fetch("/api/scm/material-requests", { cache: "no-store" }).then((res) =>
          readJson<MaterialRequest[]>(res, "Failed to load material requests"),
        ),
        fetch("/api/scm/material-releases", { cache: "no-store" }).then((res) =>
          readJson<MaterialRelease[]>(res, "Failed to load material releases"),
        ),
      ]);

      setMaterialRequests(Array.isArray(requestData) ? requestData : []);
      setMaterialReleases(Array.isArray(releaseData) ? releaseData : []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load material release data");
      setMaterialRequests([]);
      setMaterialReleases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canRead) {
      void loadData();
    }
  }, [canRead]);

  const releasableRequests = useMemo(
    () =>
      materialRequests.filter((request) =>
        ["ADMIN_APPROVED", "PARTIALLY_RELEASED"].includes(request.status),
      ),
    [materialRequests],
  );

  const selectedMaterialRequest = useMemo(
    () => releasableRequests.find((request) => request.id === Number(materialRequestId)) ?? null,
    [materialRequestId, releasableRequests],
  );

  useEffect(() => {
    if (!selectedMaterialRequest) {
      setReleaseItems([]);
      return;
    }

    const nextItems = selectedMaterialRequest.items.map((item) => {
      const remainingQty = Math.max(0, item.quantityRequested - item.quantityReleased);
      return {
        materialRequestItemId: item.id,
        productName: item.productVariant.product.name,
        sku: item.productVariant.sku,
        quantityRequested: item.quantityRequested,
        quantityReleased: item.quantityReleased,
        remainingQty,
        quantityToRelease: remainingQty > 0 ? String(remainingQty) : "",
      };
    });

    setReleaseItems(nextItems);
  }, [selectedMaterialRequest]);

  const visibleReleases = useMemo(() => {
    const query = search.trim().toLowerCase();
    return materialReleases.filter((release) => {
      if (statusFilter !== "ALL" && release.status !== statusFilter) return false;
      if (!query) return true;
      return (
        release.releaseNumber.toLowerCase().includes(query) ||
        (release.challanNumber || "").toLowerCase().includes(query) ||
        (release.waybillNumber || "").toLowerCase().includes(query) ||
        release.materialRequest.requestNumber.toLowerCase().includes(query) ||
        release.warehouse.name.toLowerCase().includes(query)
      );
    });
  }, [materialReleases, search, statusFilter]);

  const updateReleaseItem = (index: number, value: string) => {
    setReleaseItems((current) =>
      current.map((item, idx) => (idx === index ? { ...item, quantityToRelease: value } : item)),
    );
  };

  const createRelease = async () => {
    if (!selectedMaterialRequest) {
      toast.error("Material request is required");
      return;
    }

    const payloadItems = releaseItems
      .map((item) => ({
        materialRequestItemId: item.materialRequestItemId,
        quantityReleased: Number(item.quantityToRelease),
      }))
      .filter(
        (item) => Number.isInteger(item.quantityReleased) && item.quantityReleased > 0,
      );

    if (payloadItems.length === 0) {
      toast.error("No valid release quantity found");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/scm/material-releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialRequestId: selectedMaterialRequest.id,
          note,
          challanNumber: challanNumber || null,
          waybillNumber: waybillNumber || null,
          items: payloadItems,
        }),
      });

      await readJson(response, "Failed to issue material release");
      toast.success("Material release issued");
      setMaterialRequestId("");
      setNote("");
      setChallanNumber("");
      setWaybillNumber("");
      setReleaseItems([]);
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to issue material release");
    } finally {
      setSaving(false);
    }
  };

  if (!canRead) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Forbidden</CardTitle>
            <CardDescription>
              You do not have permission to access material releases.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Material Releases</h1>
        <p className="text-sm text-muted-foreground">
          Issue release notes from approved material requests and post warehouse stock-out.
        </p>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Issue Material Release</CardTitle>
            <CardDescription>
              Select an admin-approved request, define release quantities, and generate challan/waybill.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2 xl:col-span-2">
                <Label>Material Request</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={materialRequestId}
                  onChange={(event) => setMaterialRequestId(event.target.value)}
                >
                  <option value="">Select request</option>
                  {releasableRequests.map((request) => (
                    <option key={request.id} value={request.id}>
                      {request.requestNumber} - {request.warehouse.name} ({request.status})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Challan No (optional)</Label>
                <Input
                  value={challanNumber}
                  onChange={(event) => setChallanNumber(event.target.value)}
                  placeholder="Auto if empty"
                />
              </div>
              <div className="space-y-2">
                <Label>Waybill No (optional)</Label>
                <Input
                  value={waybillNumber}
                  onChange={(event) => setWaybillNumber(event.target.value)}
                  placeholder="Auto if empty"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Note</Label>
              <Input value={note} onChange={(event) => setNote(event.target.value)} />
            </div>

            {selectedMaterialRequest ? (
              <div className="rounded-lg border">
                <div className="border-b px-4 py-3 text-sm text-muted-foreground">
                  Request: {selectedMaterialRequest.requestNumber} | Warehouse: {selectedMaterialRequest.warehouse.name} | Required By: {formatDateTime(selectedMaterialRequest.requiredBy)}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Released</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Release Qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {releaseItems.map((item, index) => (
                      <TableRow key={item.materialRequestItemId}>
                        <TableCell>
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-xs text-muted-foreground">{item.sku}</div>
                        </TableCell>
                        <TableCell>{item.quantityRequested}</TableCell>
                        <TableCell>{item.quantityReleased}</TableCell>
                        <TableCell>{item.remainingQty}</TableCell>
                        <TableCell className="w-40">
                          <Input
                            type="number"
                            min={0}
                            max={item.remainingQty}
                            value={item.quantityToRelease}
                            onChange={(event) => updateReleaseItem(index, event.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}

            <Button onClick={() => void createRelease()} disabled={saving}>
              {saving ? "Issuing..." : "Issue Release"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Release Register</CardTitle>
          <CardDescription>
            Track issued release notes, line-level stock-out, and generated asset tags.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
            <Input
              placeholder="Search release/challan/waybill/request/warehouse..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">All statuses</option>
              <option value="ISSUED">ISSUED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading material releases...</p>
          ) : visibleReleases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No material releases found.</p>
          ) : (
            <div className="space-y-4">
              {visibleReleases.map((release) => {
                const totalQty = release.items.reduce(
                  (sum, item) => sum + item.quantityReleased,
                  0,
                );
                const totalCost = release.items.reduce(
                  (sum, item) => sum + Number(item.unitCost || 0) * item.quantityReleased,
                  0,
                );

                return (
                  <Card key={release.id}>
                    <CardHeader className="gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg">{release.releaseNumber}</CardTitle>
                          <CardDescription>
                            Request {release.materialRequest.requestNumber} | {release.warehouse.name}
                          </CardDescription>
                        </div>
                        <div className="rounded-full border px-3 py-1 text-xs font-medium">
                          {release.status}
                        </div>
                      </div>
                      <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                        <div>Released At: {formatDateTime(release.releasedAt)}</div>
                        <div>Challan: {release.challanNumber || "N/A"}</div>
                        <div>Waybill: {release.waybillNumber || "N/A"}</div>
                        <div>Released By: {release.releasedBy?.name || release.releasedBy?.email || "N/A"}</div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {release.note ? (
                        <p className="text-sm text-muted-foreground">{release.note}</p>
                      ) : null}

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Unit Cost</TableHead>
                            <TableHead>Line Cost</TableHead>
                            <TableHead>Asset Tags</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {release.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="font-medium">{item.productVariant.product.name}</div>
                                <div className="text-xs text-muted-foreground">{item.productVariant.sku}</div>
                              </TableCell>
                              <TableCell>{item.quantityReleased}</TableCell>
                              <TableCell>{formatMoney(item.unitCost)}</TableCell>
                              <TableCell>
                                {formatMoney(Number(item.unitCost || 0) * item.quantityReleased)}
                              </TableCell>
                              <TableCell>
                                {item.assetRegisters.length > 0 ? (
                                  <div className="space-y-1 text-xs">
                                    {item.assetRegisters.slice(0, 4).map((asset) => (
                                      <div key={asset.id}>{asset.assetTag}</div>
                                    ))}
                                    {item.assetRegisters.length > 4 ? (
                                      <div className="text-muted-foreground">
                                        +{item.assetRegisters.length - 4} more
                                      </div>
                                    ) : null}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">N/A</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <div className="grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
                        <div>Total Qty: {totalQty}</div>
                        <div>Total Cost: {formatMoney(totalCost)}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
