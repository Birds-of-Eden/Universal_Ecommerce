"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ShipmentCreateForm from "@/components/admin/shipments/ShipmentCreateForm";

type ShipmentStatusType =
  | "PENDING"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "RETURNED"
  | "CANCELLED";

type ShipmentRow = {
  id: number;
  orderId: number;
  courier: string;
  status: ShipmentStatusType;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  courierStatus?: string | null;
  lastSyncedAt?: string | null;
  expectedDate?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  order?: {
    id: number;
    name: string;
    phone_number: string;
    status: string;
    paymentStatus: string;
  };
};

const STATUS_OPTIONS: Array<"ALL" | ShipmentStatusType> = [
  "ALL",
  "PENDING",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "RETURNED",
  "CANCELLED",
];

const NEXT_STATUS_MAP: Record<ShipmentStatusType, ShipmentStatusType[]> = {
  PENDING: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "RETURNED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RETURNED", "CANCELLED"],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
};

export default function AdminShipmentsPage() {
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | ShipmentStatusType>("ALL");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const loadShipments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query = filter === "ALL" ? "" : `&status=${filter}`;
      const res = await fetch(`/api/shipments?page=1&limit=200${query}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load shipments");
      setShipments(Array.isArray(data?.shipments) ? data.shipments : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load shipments");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  const filteredShipments = useMemo(() => {
    if (!search.trim()) return shipments;
    const term = search.toLowerCase();
    return shipments.filter((s) => {
      return (
        String(s.id).includes(term) ||
        String(s.orderId).includes(term) ||
        (s.trackingNumber || "").toLowerCase().includes(term) ||
        (s.courier || "").toLowerCase().includes(term) ||
        (s.order?.name || "").toLowerCase().includes(term)
      );
    });
  }, [shipments, search]);

  const shipmentStats = useMemo(() => {
    const total = shipments.length;
    const pending = shipments.filter((s) => s.status === "PENDING").length;
    const inTransit = shipments.filter(
      (s) => s.status === "IN_TRANSIT" || s.status === "OUT_FOR_DELIVERY",
    ).length;
    const delivered = shipments.filter((s) => s.status === "DELIVERED").length;
    return { total, pending, inTransit, delivered };
  }, [shipments]);

  const updateShipmentStatus = async (
    shipmentId: number,
    nextStatus: ShipmentStatusType,
  ) => {
    try {
      setUpdatingId(shipmentId);
      const res = await fetch(`/api/shipments/${shipmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to update shipment status");
      await loadShipments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update shipment status");
    } finally {
      setUpdatingId(null);
    }
  };

  const statusPill = (status: ShipmentStatusType) => {
    const cls =
      status === "DELIVERED"
        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
        : status === "CANCELLED" || status === "RETURNED"
          ? "bg-destructive/10 text-destructive border-destructive/20"
          : "bg-blue-500/10 text-blue-600 border-blue-500/20";
    return (
      <span className={`rounded-full border px-2 py-1 text-[11px] font-medium ${cls}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
        <h1 className="text-2xl font-bold text-foreground">Shipment Operations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          International-style flow: create, dispatch, track, and complete shipment lifecycle.
        </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Create Shipment
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-xl font-semibold text-foreground">{shipmentStats.total}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-xl font-semibold text-amber-600">{shipmentStats.pending}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">In Transit</p>
          <p className="text-xl font-semibold text-blue-600">{shipmentStats.inTransit}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Delivered</p>
          <p className="text-xl font-semibold text-emerald-600">{shipmentStats.delivered}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 md:p-6 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-foreground">Shipment Queue</h2>
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by shipment/order/tracking/courier..."
              className="h-9 min-w-[280px] rounded-md border border-border bg-background px-3 text-sm"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as "ALL" | ShipmentStatusType)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadShipments}
              className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
            >
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading shipments...</p>
        ) : filteredShipments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No shipments found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-2 py-2">Shipment</th>
                  <th className="px-2 py-2">Order</th>
                  <th className="px-2 py-2">Courier</th>
                  <th className="px-2 py-2">Tracking</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map((shipment) => {
                  const nextStatuses = NEXT_STATUS_MAP[shipment.status] || [];
                  return (
                    <tr key={shipment.id} className="border-b border-border/60">
                      <td className="px-2 py-3">
                        <p className="font-medium text-foreground">#{shipment.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(shipment.createdAt).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-2 py-3">
                        <p className="text-foreground">#{shipment.orderId}</p>
                        <p className="text-xs text-muted-foreground">
                          {shipment.order?.name || "N/A"}
                        </p>
                      </td>
                      <td className="px-2 py-3">
                        <p className="text-foreground">{shipment.courier || "-"}</p>
                        <p className="text-xs text-muted-foreground">
                          {shipment.courierStatus || "-"}
                        </p>
                      </td>
                      <td className="px-2 py-3">
                        <p className="text-foreground">{shipment.trackingNumber || "-"}</p>
                        {shipment.trackingUrl && (
                          <a
                            href={shipment.trackingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary underline"
                          >
                            Open tracking
                          </a>
                        )}
                      </td>
                      <td className="px-2 py-3">{statusPill(shipment.status)}</td>
                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-2">
                          {nextStatuses.length === 0 ? (
                            <span className="text-xs text-muted-foreground">No actions</span>
                          ) : (
                            nextStatuses.map((nextStatus) => (
                              <button
                                key={nextStatus}
                                type="button"
                                disabled={updatingId === shipment.id}
                                onClick={() => updateShipmentStatus(shipment.id, nextStatus)}
                                className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted disabled:opacity-60"
                              >
                                {updatingId === shipment.id
                                  ? "Updating..."
                                  : `Mark ${nextStatus}`}
                              </button>
                            ))
                          )}
                          <a
                            href={`/admin/orders`}
                            className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted"
                          >
                            Open Order
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="w-full max-w-4xl rounded-2xl">
            <div className="p-4">
              <ShipmentCreateForm
                onCreated={async () => {
                  await loadShipments();
                  setCreateModalOpen(false);
                }}
                onClose={() => setCreateModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
