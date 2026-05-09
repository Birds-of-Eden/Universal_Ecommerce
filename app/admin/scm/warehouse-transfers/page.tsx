"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Plus, RefreshCw } from "lucide-react";
import { ScmStatCard } from "@/components/admin/scm/ScmStatCard";
import { ScmStatusChip } from "@/components/admin/scm/ScmStatusChip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Warehouse = {
  id: number;
  name: string;
  code: string;
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
  const searchParams = useSearchParams();
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
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [transfers, setTransfers] = useState<WarehouseTransfer[]>([]);

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setStatusFilter(searchParams.get("status") || "");
  }, [searchParams]);

  const loadData = async () => {
    setLoading(true);
    try {
      const transferData = await fetch("/api/scm/warehouse-transfers", { cache: "no-store" }).then((response) =>
          readJson<WarehouseTransfer[]>(response, "Failed to load warehouse transfers"),
      );
      setTransfers(Array.isArray(transferData) ? transferData : []);
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Warehouse Transfers</h1>
          <p className="text-sm text-muted-foreground">
            Approve, dispatch, and receive internal stock movement between warehouses.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage ? (
            <Button asChild>
              <Link href="/admin/scm/warehouse-transfers/new">
                <Plus className="mr-2 h-4 w-4" />
                New Transfer
              </Link>
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <ScmStatCard label="Total" value={String(transfers.length)} hint="Visible transfer queue" />
        <ScmStatCard label="Pending Approval" value={String(transfers.filter((t) => t.status === "SUBMITTED").length)} hint="Waiting for approval" />
        <ScmStatCard label="In Transit" value={String(transfers.filter((t) => ["APPROVED", "PARTIALLY_DISPATCHED", "DISPATCHED", "PARTIALLY_RECEIVED"].includes(t.status)).length)} hint="Still active between warehouses" />
        <ScmStatCard label="Received" value={String(transfers.filter((t) => t.status === "RECEIVED").length)} hint="Completed internal movement" />
      </div>

      <Card className="overflow-hidden">
  <CardHeader className="space-y-2">
    <CardTitle>Transfer Queue</CardTitle>
    <CardDescription>
      Monitor transfer requests and progress through approval, dispatch, and
      receipt.
    </CardDescription>
  </CardHeader>

  <CardContent className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_auto]">
      <Input
        className="sm:col-span-2 lg:col-span-1"
        placeholder="Search transfer number or warehouse..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <select
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
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

      <Button
        className="w-full sm:w-auto"
        variant="outline"
        onClick={() => void loadData()}
        disabled={loading}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Refresh
      </Button>
    </div>

    {loading ? (
      <p className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
        Loading warehouse transfers...
      </p>
    ) : visibleTransfers.length === 0 ? (
      <p className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
        No warehouse transfers found.
      </p>
    ) : (
      <>
        {/* Desktop / Large Tablet Table */}
        <div className="hidden overflow-x-auto rounded-xl border border-border/60 lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Transfer</TableHead>
                <TableHead className="min-w-[180px]">Route</TableHead>
                <TableHead className="min-w-[150px]">Status</TableHead>
                <TableHead className="min-w-[240px]">Items</TableHead>
                <TableHead className="min-w-[190px]">Timeline</TableHead>
                <TableHead className="min-w-[240px] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {visibleTransfers.map((transfer) => {
                const requested = totalQuantity(
                  transfer.items,
                  "quantityRequested",
                );
                const dispatched = totalQuantity(
                  transfer.items,
                  "quantityDispatched",
                );
                const received = totalQuantity(
                  transfer.items,
                  "quantityReceived",
                );

                return (
                  <TableRow key={transfer.id}>
                    <TableCell className="align-top">
                      <div className="font-medium">
                        {transfer.transferNumber}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Requested {formatDate(transfer.requestedAt)}
                      </div>

                      {transfer.note ? (
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {transfer.note}
                        </div>
                      ) : null}
                    </TableCell>

                    <TableCell className="align-top text-sm">
                      <div className="font-medium">
                        {transfer.sourceWarehouse.name}
                      </div>
                      <div className="text-muted-foreground">
                        to {transfer.destinationWarehouse.name}
                      </div>
                    </TableCell>

                    <TableCell className="align-top">
                      <ScmStatusChip status={transfer.status} />

                      {transfer.requiredBy ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Need by {formatDate(transfer.requiredBy)}
                        </div>
                      ) : null}
                    </TableCell>

                    <TableCell className="align-top text-sm">
                      <div className="grid gap-1">
                        <div>Requested: {requested}</div>
                        <div>Dispatched: {dispatched}</div>
                        <div>Received: {received}</div>
                      </div>

                      <div className="mt-2 max-h-24 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                        {transfer.items.map((item) => (
                          <div key={item.id} className="break-words">
                            {item.productVariant.sku}:{" "}
                            {item.quantityRequested}/
                            {item.quantityDispatched}/
                            {item.quantityReceived}
                          </div>
                        ))}
                      </div>
                    </TableCell>

                    <TableCell className="align-top text-xs text-muted-foreground">
                      <div>Submitted: {formatDate(transfer.submittedAt)}</div>
                      <div>Approved: {formatDate(transfer.approvedAt)}</div>
                      <div>
                        Dispatched: {formatDate(transfer.dispatchedAt)}
                      </div>
                      <div>Received: {formatDate(transfer.receivedAt)}</div>
                    </TableCell>

                    <TableCell className="align-top text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link
                            href={`/admin/scm/warehouse-transfers/${transfer.id}`}
                          >
                            Open Detail
                          </Link>
                        </Button>

                        {canManage && transfer.status === "DRAFT" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void runAction(transfer.id, "submit")
                            }
                            disabled={saving}
                          >
                            Submit
                          </Button>
                        ) : null}

                        {canApprove && transfer.status === "SUBMITTED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void runAction(transfer.id, "approve")
                            }
                            disabled={saving}
                          >
                            Approve
                          </Button>
                        ) : null}

                        {canManage &&
                        [
                          "APPROVED",
                          "PARTIALLY_DISPATCHED",
                          "PARTIALLY_RECEIVED",
                        ].includes(transfer.status) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void runAction(transfer.id, "dispatch")
                            }
                            disabled={saving}
                          >
                            Dispatch
                          </Button>
                        ) : null}

                        {canManage &&
                        [
                          "DISPATCHED",
                          "PARTIALLY_DISPATCHED",
                          "PARTIALLY_RECEIVED",
                        ].includes(transfer.status) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              void runAction(transfer.id, "receive")
                            }
                            disabled={saving}
                          >
                            Receive
                          </Button>
                        ) : null}

                        {canManage &&
                        ["DRAFT", "SUBMITTED", "APPROVED"].includes(
                          transfer.status,
                        ) ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              void runAction(transfer.id, "cancel")
                            }
                            disabled={saving}
                          >
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
        </div>

        {/* Mobile / Tablet Cards */}
        <div className="grid gap-4 lg:hidden">
          {visibleTransfers.map((transfer) => {
            const requested = totalQuantity(
              transfer.items,
              "quantityRequested",
            );
            const dispatched = totalQuantity(
              transfer.items,
              "quantityDispatched",
            );
            const received = totalQuantity(
              transfer.items,
              "quantityReceived",
            );

            return (
              <div
                key={transfer.id}
                className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
              >
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="break-words text-sm font-bold text-foreground sm:text-base">
                        {transfer.transferNumber}
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        Requested {formatDate(transfer.requestedAt)}
                      </div>

                      {transfer.note ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {transfer.note}
                        </div>
                      ) : null}
                    </div>

                    <div className="w-fit">
                      <ScmStatusChip status={transfer.status} />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-muted/30 p-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Route
                      </div>
                      <div className="mt-1 text-sm font-semibold text-foreground">
                        {transfer.sourceWarehouse.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        to {transfer.destinationWarehouse.name}
                      </div>
                    </div>

                    <div className="rounded-xl bg-muted/30 p-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Required By
                      </div>
                      <div className="mt-1 text-sm font-semibold text-foreground">
                        {transfer.requiredBy
                          ? formatDate(transfer.requiredBy)
                          : "N/A"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-muted/30 p-3 sm:col-span-2">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Quantity
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-background p-2">
                          <div className="text-xs text-muted-foreground">
                            Requested
                          </div>
                          <div className="font-bold">{requested}</div>
                        </div>

                        <div className="rounded-lg bg-background p-2">
                          <div className="text-xs text-muted-foreground">
                            Dispatched
                          </div>
                          <div className="font-bold">{dispatched}</div>
                        </div>

                        <div className="rounded-lg bg-background p-2">
                          <div className="text-xs text-muted-foreground">
                            Received
                          </div>
                          <div className="font-bold">{received}</div>
                        </div>
                      </div>

                      <div className="mt-3 max-h-28 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                        {transfer.items.map((item) => (
                          <div key={item.id} className="break-words">
                            {item.productVariant.sku}:{" "}
                            {item.quantityRequested}/
                            {item.quantityDispatched}/
                            {item.quantityReceived}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl bg-muted/30 p-3 sm:col-span-2">
                      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Timeline
                      </div>

                      <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        <div>
                          Submitted: {formatDate(transfer.submittedAt)}
                        </div>
                        <div>Approved: {formatDate(transfer.approvedAt)}</div>
                        <div>
                          Dispatched: {formatDate(transfer.dispatchedAt)}
                        </div>
                        <div>Received: {formatDate(transfer.receivedAt)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link
                        href={`/admin/scm/warehouse-transfers/${transfer.id}`}
                      >
                        Open Detail
                      </Link>
                    </Button>

                    {canManage && transfer.status === "DRAFT" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void runAction(transfer.id, "submit")}
                        disabled={saving}
                      >
                        Submit
                      </Button>
                    ) : null}

                    {canApprove && transfer.status === "SUBMITTED" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void runAction(transfer.id, "approve")}
                        disabled={saving}
                      >
                        Approve
                      </Button>
                    ) : null}

                    {canManage &&
                    [
                      "APPROVED",
                      "PARTIALLY_DISPATCHED",
                      "PARTIALLY_RECEIVED",
                    ].includes(transfer.status) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void runAction(transfer.id, "dispatch")}
                        disabled={saving}
                      >
                        Dispatch
                      </Button>
                    ) : null}

                    {canManage &&
                    [
                      "DISPATCHED",
                      "PARTIALLY_DISPATCHED",
                      "PARTIALLY_RECEIVED",
                    ].includes(transfer.status) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void runAction(transfer.id, "receive")}
                        disabled={saving}
                      >
                        Receive
                      </Button>
                    ) : null}

                    {canManage &&
                    ["DRAFT", "SUBMITTED", "APPROVED"].includes(
                      transfer.status,
                    ) ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void runAction(transfer.id, "cancel")}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    )}
  </CardContent>
</Card>
    </div>
  );
}
