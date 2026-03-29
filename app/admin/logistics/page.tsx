"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ShipmentsSkeleton from "@/components/ui/ShipmentsSkeleton";

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
  warehouseId?: number | null;
  courier: string;
  courierStatus?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  status: ShipmentStatusType;
  expectedDate?: string | null;
  assignedAt?: string | null;
  pickedAt?: string | null;
  outForDeliveryAt?: string | null;
  deliveredAt?: string | null;
  estimatedCost?: string | number | null;
  actualCost?: string | number | null;
  thirdPartyCost?: string | number | null;
  handlingCost?: string | number | null;
  packagingCost?: string | number | null;
  fuelCost?: string | number | null;
  dispatchNote?: string | null;
  priority?: number | null;
  createdAt: string;
  assignedTo?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
  shippingRate?: {
    id: number;
    area?: string | null;
    district?: string | null;
    baseCost?: string | number | null;
  } | null;
  order?: {
    id: number;
    name?: string | null;
    phone_number?: string | null;
    status?: string | null;
    paymentStatus?: string | null;
  } | null;
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

const currency = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 0,
});

function toAmount(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatAmount(value: number) {
  return currency.format(value || 0);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
}

function statusPill(status: ShipmentStatusType) {
  const cls =
    status === "DELIVERED"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
      : status === "CANCELLED" || status === "RETURNED"
        ? "border-rose-500/20 bg-rose-500/10 text-rose-700"
        : status === "OUT_FOR_DELIVERY"
          ? "border-amber-500/20 bg-amber-500/10 text-amber-700"
          : "border-sky-500/20 bg-sky-500/10 text-sky-700";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

export default function LogisticsPage() {
  const [filter, setFilter] = useState<"ALL" | ShipmentStatusType>("ALL");
  const [search, setSearch] = useState("");
  const [shipments, setShipments] = useState<ShipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadShipments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query = filter === "ALL" ? "" : `&status=${filter}`;
      const res = await fetch(`/api/shipments?page=1&limit=200${query}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to load logistics shipments");
      setShipments(Array.isArray(data?.shipments) ? data.shipments : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load logistics shipments");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  const filteredShipments = useMemo(() => {
    if (!search.trim()) return shipments;
    const term = search.trim().toLowerCase();
    return shipments.filter((shipment) => {
      return (
        String(shipment.id).includes(term) ||
        String(shipment.orderId).includes(term) ||
        (shipment.courier || "").toLowerCase().includes(term) ||
        (shipment.trackingNumber || "").toLowerCase().includes(term) ||
        (shipment.order?.name || "").toLowerCase().includes(term) ||
        (shipment.assignedTo?.name || "").toLowerCase().includes(term)
      );
    });
  }, [search, shipments]);

  const costSummary = useMemo(() => {
    const estimated = filteredShipments.reduce(
      (sum, item) => sum + toAmount(item.estimatedCost),
      0,
    );
    const actual = filteredShipments.reduce(
      (sum, item) => sum + toAmount(item.actualCost),
      0,
    );
    const thirdParty = filteredShipments.reduce(
      (sum, item) => sum + toAmount(item.thirdPartyCost),
      0,
    );
    const handling = filteredShipments.reduce(
      (sum, item) =>
        sum +
        toAmount(item.handlingCost) +
        toAmount(item.packagingCost) +
        toAmount(item.fuelCost),
      0,
    );
    const variance = actual - estimated;

    return {
      estimated,
      actual,
      thirdParty,
      handling,
      variance,
    };
  }, [filteredShipments]);

  const managementSummary = useMemo(() => {
    const assigned = filteredShipments.filter((item) => item.assignedTo).length;
    const unassigned = filteredShipments.filter((item) => !item.assignedTo).length;
    const outForDelivery = filteredShipments.filter(
      (item) => item.status === "OUT_FOR_DELIVERY",
    ).length;
    const atRisk = filteredShipments.filter((item) => {
      if (item.status === "DELIVERED" || item.status === "CANCELLED") return false;
      if (!item.expectedDate) return item.status === "PENDING" || item.status === "IN_TRANSIT";
      return new Date(item.expectedDate).getTime() < Date.now();
    }).length;

    return {
      assigned,
      unassigned,
      outForDelivery,
      atRisk,
    };
  }, [filteredShipments]);

  const priorityShipments = useMemo(() => {
    return [...filteredShipments]
      .sort((a, b) => (b.priority || 0) - (a.priority || 0) || b.id - a.id)
      .slice(0, 5);
  }, [filteredShipments]);

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
      if (!res.ok) throw new Error(data?.error || "Failed to update shipment");
      await loadShipments();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update shipment");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full flex-col gap-6 p-4 md:p-6">
        <section className="grid gap-4 lg:grid-cols-[1.4fr,1fr]">
          <div className="rounded-[24px] border border-border bg-card p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Logistics Delivery Cost</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cost visibility across shipment estimate, actual spend, and handling overhead.
                </p>
              </div>
              <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-700">
                {filteredShipments.length} shipments
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {formatAmount(costSummary.estimated)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Actual</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {formatAmount(costSummary.actual)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Variance</p>
                <p
                  className={`mt-2 text-2xl font-semibold ${
                    costSummary.variance > 0 ? "text-amber-600" : "text-emerald-600"
                  }`}
                >
                  {formatAmount(costSummary.variance)}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Internal handling
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {formatAmount(costSummary.handling)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-dashed border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Third-party delivery cost
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {formatAmount(costSummary.thirdParty)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Courier and outsourced delivery spend recorded across the filtered shipments.
                </p>
              </div>
              <div className="rounded-2xl border border-dashed border-border bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Cost tracking coverage
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  {filteredShipments.filter((item) => item.actualCost || item.estimatedCost).length}/
                  {filteredShipments.length}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Shipments already carrying estimate or actual cost values in the new schema.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-border bg-card p-5 md:p-6">
            <h2 className="text-lg font-semibold text-foreground">Logistics Management</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Assignment, dispatch pressure, out-for-delivery load, and shipments needing follow-up.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Assigned</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {managementSummary.assigned}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Unassigned</p>
                <p className="mt-2 text-2xl font-semibold text-rose-600">
                  {managementSummary.unassigned}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Out for delivery
                </p>
                <p className="mt-2 text-2xl font-semibold text-amber-600">
                  {managementSummary.outForDelivery}
                </p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">At risk</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {managementSummary.atRisk}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-border/70 bg-background p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Priority Watchlist</h3>
                <span className="text-xs text-muted-foreground">Top 5 by priority</span>
              </div>
              <div className="mt-3 space-y-3">
                {priorityShipments.length ? (
                  priorityShipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="rounded-2xl border border-border/70 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">
                            Shipment #{shipment.id} · Order #{shipment.orderId}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {shipment.assignedTo?.name || "Unassigned"} · {shipment.courier}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
                          P{shipment.priority || 0}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No prioritized shipments found for the current filter.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-border bg-card p-5 md:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Shipment Operations Queue</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Dispatch notes, cost data, assignment owner, and next status action in a single table.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by shipment, order, assignee, courier..."
                className="h-10 min-w-[260px] rounded-full border border-border bg-background px-4 text-sm outline-none ring-0"
              />
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as "ALL" | ShipmentStatusType)}
                className="h-10 rounded-full border border-border bg-background px-4 text-sm"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-5 overflow-x-auto">
            {loading ? (
              <ShipmentsSkeleton />
            ) : !filteredShipments.length ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
                <p className="text-base font-medium text-foreground">No logistics shipment found.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try another status filter or create shipments from the shipment admin page.
                </p>
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-3">Shipment</th>
                    <th className="px-3 py-3">Management</th>
                    <th className="px-3 py-3">Delivery Cost</th>
                    <th className="px-3 py-3">Timeline</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments.map((shipment) => {
                    const nextStatuses = NEXT_STATUS_MAP[shipment.status] || [];
                    return (
                      <tr key={shipment.id} className="border-b border-border/60 align-top">
                        <td className="px-3 py-4">
                          <p className="font-semibold text-foreground">#{shipment.id}</p>
                          <p className="mt-1 text-muted-foreground">Order #{shipment.orderId}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {shipment.order?.name || "Unknown customer"}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {shipment.trackingNumber || "Tracking pending"}
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          <p className="font-medium text-foreground">
                            {shipment.assignedTo?.name || "Unassigned"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Assigned: {formatDateTime(shipment.assignedAt)}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Note: {shipment.dispatchNote || "No dispatch note"}
                          </p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Warehouse: {shipment.warehouseId || "-"} · Priority {shipment.priority || 0}
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          <p className="font-medium text-foreground">
                            Est. {formatAmount(toAmount(shipment.estimatedCost))}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Actual {formatAmount(toAmount(shipment.actualCost))}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            3P {formatAmount(toAmount(shipment.thirdPartyCost))}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Internal{" "}
                            {formatAmount(
                              toAmount(shipment.handlingCost) +
                                toAmount(shipment.packagingCost) +
                                toAmount(shipment.fuelCost),
                            )}
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          <p className="text-xs text-muted-foreground">
                            Picked: {formatDateTime(shipment.pickedAt)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            OFD: {formatDateTime(shipment.outForDeliveryAt)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            ETA: {formatDateTime(shipment.expectedDate)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Delivered: {formatDateTime(shipment.deliveredAt)}
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          {statusPill(shipment.status)}
                          <p className="mt-2 text-xs text-muted-foreground">
                            {shipment.courier} {shipment.courierStatus ? `· ${shipment.courierStatus}` : ""}
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex flex-wrap gap-2">
                            {nextStatuses.length ? (
                              nextStatuses.map((nextStatus) => (
                                <button
                                  key={nextStatus}
                                  type="button"
                                  disabled={updatingId === shipment.id}
                                  onClick={() => updateShipmentStatus(shipment.id, nextStatus)}
                                  className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {updatingId === shipment.id ? "Updating..." : nextStatus}
                                </button>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No next action</span>
                            )}
                            {shipment.trackingUrl ? (
                              <a
                                href={shipment.trackingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-700"
                              >
                                Track
                              </a>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
