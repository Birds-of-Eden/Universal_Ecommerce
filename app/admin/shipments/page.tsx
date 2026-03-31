"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ShipmentCreateForm from "@/components/admin/shipments/ShipmentCreateForm";
import {
  AssignDeliveryManModal,
  type DeliveryManAssignmentOption,
} from "@/components/admin/shipments/AssignDeliveryManModal";
import { AssignmentStatusBadge } from "@/components/delivery/AssignmentStatusBadge";
import { StatusTimeline } from "@/components/delivery/StatusTimeline";
import type { ShipmentDeliveryAssignmentSummary } from "@/components/delivery/types";
import ShipmentsSkeleton from "@/components/ui/ShipmentsSkeleton";

type ShipmentStatusType =
  | "PENDING"
  | "ASSIGNED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "RETURNED"
  | "CANCELLED";

type ShipmentRow = {
  id: number;
  orderId: number;
  warehouseId: number | null;
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
  deliveryAssignments?: ShipmentDeliveryAssignmentSummary[];
};

const STATUS_OPTIONS: Array<"ALL" | ShipmentStatusType> = [
  "ALL",
  "PENDING",
  "ASSIGNED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "FAILED",
  "RETURNED",
  "CANCELLED",
];

const NEXT_STATUS_MAP: Record<ShipmentStatusType, ShipmentStatusType[]> = {
  PENDING: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED", "RETURNED", "CANCELLED"],
  DELIVERED: [],
  FAILED: ["ASSIGNED", "CANCELLED"],
  RETURNED: [],
  CANCELLED: [],
};

interface ShipmentsQueryState {
  filter: "ALL" | ShipmentStatusType;
  search: string;
}

const shipmentsCache = new Map<"ALL" | ShipmentStatusType, ShipmentRow[]>();
let lastShipmentsQueryState: ShipmentsQueryState = {
  filter: "ALL",
  search: "",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shipmentStatusPill(status: ShipmentStatusType) {
  const className =
    status === "DELIVERED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "FAILED" || status === "CANCELLED" || status === "RETURNED"
        ? "border-red-200 bg-red-50 text-red-700"
        : status === "ASSIGNED"
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${className}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function AdminShipmentsPage() {
  const [filter, setFilter] = useState<"ALL" | ShipmentStatusType>(
    lastShipmentsQueryState.filter,
  );
  const [search, setSearch] = useState(lastShipmentsQueryState.search);
  const [shipments, setShipments] = useState<ShipmentRow[]>(
    () => shipmentsCache.get(lastShipmentsQueryState.filter) ?? [],
  );
  const [loading, setLoading] = useState(
    () => !shipmentsCache.has(lastShipmentsQueryState.filter),
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<number[]>([]);
  const [deliveryMen, setDeliveryMen] = useState<DeliveryManAssignmentOption[]>([]);
  const [loadingDeliveryMen, setLoadingDeliveryMen] = useState(true);

  const loadShipments = useCallback(
    async (force = false) => {
      lastShipmentsQueryState = {
        filter,
        search: lastShipmentsQueryState.search,
      };

      if (!force) {
        const cached = shipmentsCache.get(filter);
        if (cached) {
          setShipments(cached);
          setLoading(false);
          setError(null);
          return;
        }
      }

      try {
        setLoading(true);
        setError(null);
        const query = filter === "ALL" ? "" : `&status=${filter}`;
        const res = await fetch(`/api/shipments?page=1&limit=200${query}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to load shipments");
        const nextShipments = Array.isArray(data?.shipments) ? data.shipments : [];
        shipmentsCache.set(filter, nextShipments);
        setShipments(nextShipments);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load shipments",
        );
      } finally {
        setLoading(false);
      }
    },
    [filter],
  );

  const loadDeliveryMen = useCallback(async () => {
    try {
      setLoadingDeliveryMen(true);
      const response = await fetch("/api/delivery-men?status=ACTIVE&limit=200", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) {
        throw new Error(payload.message || "Failed to load delivery men");
      }

      const nextDeliveryMen = Array.isArray(payload.data?.deliveryMen)
        ? payload.data.deliveryMen
        : [];

      setDeliveryMen(
        nextDeliveryMen.map((deliveryMan: any) => ({
          id: deliveryMan.id,
          fullName: deliveryMan.fullName,
          phone: deliveryMan.phone,
          employeeCode: deliveryMan.employeeCode ?? null,
          warehouse: deliveryMan.warehouse
            ? {
                id: deliveryMan.warehouse.id,
                name: deliveryMan.warehouse.name,
                code: deliveryMan.warehouse.code,
              }
            : null,
        })),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load delivery men",
      );
    } finally {
      setLoadingDeliveryMen(false);
    }
  }, []);

  useEffect(() => {
    void loadShipments();
  }, [loadShipments]);

  useEffect(() => {
    void loadDeliveryMen();
  }, [loadDeliveryMen]);

  useEffect(() => {
    lastShipmentsQueryState = {
      ...lastShipmentsQueryState,
      search,
    };
  }, [search]);

  const filteredShipments = useMemo(() => {
    if (!search.trim()) return shipments;
    const term = search.toLowerCase();
    return shipments.filter((shipment) => {
      return (
        String(shipment.id).includes(term) ||
        String(shipment.orderId).includes(term) ||
        (shipment.trackingNumber || "").toLowerCase().includes(term) ||
        (shipment.courier || "").toLowerCase().includes(term) ||
        (shipment.order?.name || "").toLowerCase().includes(term)
      );
    });
  }, [shipments, search]);

  const selectedShipments = useMemo(
    () => filteredShipments.filter((shipment) => selectedShipmentIds.includes(shipment.id)),
    [filteredShipments, selectedShipmentIds],
  );

  const allVisibleSelected =
    filteredShipments.length > 0 &&
    filteredShipments.every((shipment) => selectedShipmentIds.includes(shipment.id));

  const shipmentStats = useMemo(() => {
    const total = shipments.length;
    const pending = shipments.filter(
      (shipment) => shipment.status === "PENDING" || shipment.status === "ASSIGNED",
    ).length;
    const inTransit = shipments.filter(
      (shipment) =>
        shipment.status === "IN_TRANSIT" ||
        shipment.status === "OUT_FOR_DELIVERY",
    ).length;
    const delivered = shipments.filter(
      (shipment) => shipment.status === "DELIVERED",
    ).length;
    return { total, pending, inTransit, delivered };
  }, [shipments]);

  async function updateShipmentStatus(
    shipmentId: number,
    nextStatus: ShipmentStatusType,
  ) {
    try {
      setUpdatingId(shipmentId);
      setError(null);
      setNotice(null);

      const response = await fetch(`/api/shipments/${shipmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to update shipment status");
      }

      setNotice(`Shipment #${shipmentId} marked as ${nextStatus.replace(/_/g, " ").toLowerCase()}.`);
      shipmentsCache.clear();
      await loadShipments(true);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update shipment status",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  function toggleShipmentSelection(shipmentId: number) {
    setSelectedShipmentIds((current) =>
      current.includes(shipmentId)
        ? current.filter((id) => id !== shipmentId)
        : [...current, shipmentId],
    );
  }

  function toggleSelectAllVisible() {
    setSelectedShipmentIds((current) => {
      if (allVisibleSelected) {
        return current.filter(
          (shipmentId) => !filteredShipments.some((shipment) => shipment.id === shipmentId),
        );
      }

      const nextIds = new Set(current);
      filteredShipments.forEach((shipment) => nextIds.add(shipment.id));
      return [...nextIds];
    });
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Shipment Operations
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-foreground">
                Shipment Operations
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Create shipments, assign delivery men, track pickup proof, and monitor the
                operational status from a single workflow.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {selectedShipmentIds.length ? (
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(true)}
                  className="btn-outline rounded-xl px-4 py-3 text-sm font-medium"
                >
                  Assign Selected ({selectedShipmentIds.length})
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="btn-primary rounded-xl px-4 py-3 text-sm font-medium"
              >
                Create Shipment
              </button>
            </div>
          </div>

          {notice ? (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total Shipments" value={shipmentStats.total} />
          <SummaryCard label="Pending / Assigned" value={shipmentStats.pending} />
          <SummaryCard label="In Transit" value={shipmentStats.inTransit} />
          <SummaryCard label="Delivered" value={shipmentStats.delivered} />
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                className="btn-outline rounded-xl px-4 py-2 text-sm font-medium"
              >
                {allVisibleSelected ? "Unselect Visible" : "Select Visible"}
              </button>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by shipment, order, courier, tracking, or customer..."
                className="input-theme min-w-[280px] rounded-xl border border-border bg-background px-4 py-3 text-sm"
              />
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as "ALL" | ShipmentStatusType)}
                className="input-theme rounded-xl border border-border bg-background px-4 py-3 text-sm"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                shipmentsCache.clear();
                void loadShipments(true);
              }}
              className="btn-outline rounded-xl px-4 py-3 text-sm font-medium"
            >
              Refresh
            </button>
          </div>
        </section>

        {loading || loadingDeliveryMen ? (
          <ShipmentsSkeleton />
        ) : filteredShipments.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-16 text-center">
            <p className="text-lg font-medium text-foreground">No shipments found.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Adjust the filters or create a new shipment to begin assignment flow.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredShipments.map((shipment) => {
              const currentAssignment = shipment.deliveryAssignments?.[0] ?? null;
              const nextStatuses = NEXT_STATUS_MAP[shipment.status] ?? [];
              const selected = selectedShipmentIds.includes(shipment.id);

              return (
                <article
                  key={shipment.id}
                  className="rounded-3xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleShipmentSelection(shipment.id)}
                        className="mt-1 h-4 w-4 rounded border-border"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-semibold text-foreground">
                            Shipment #{shipment.id}
                          </h2>
                          {shipmentStatusPill(shipment.status)}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Order #{shipment.orderId} · {shipment.order?.name || "Unknown customer"} ·{" "}
                          {formatDateTime(shipment.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedShipmentIds([shipment.id]);
                          setAssignModalOpen(true);
                        }}
                        className="btn-outline rounded-xl px-4 py-2 text-sm font-medium"
                      >
                        {currentAssignment ? "Reassign" : "Assign Delivery Man"}
                      </button>
                      <a
                        href="/admin/orders"
                        className="btn-outline rounded-xl px-4 py-2 text-sm font-medium"
                      >
                        Open Orders
                      </a>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 xl:grid-cols-[0.95fr_0.95fr_1.1fr]">
                    <section className="rounded-2xl border border-border bg-background p-4">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Order & Courier
                      </h3>
                      <div className="mt-4 space-y-2 text-sm">
                        <p className="font-medium text-foreground">
                          {shipment.order?.name || "Unknown customer"}
                        </p>
                        <p className="text-muted-foreground">
                          {shipment.order?.phone_number || "No phone"}
                        </p>
                        <p className="text-muted-foreground">
                          Courier: {shipment.courier || "-"}
                        </p>
                        <p className="text-muted-foreground">
                          Tracking: {shipment.trackingNumber || "Not available"}
                        </p>
                        <p className="text-muted-foreground">
                          Order status: {shipment.order?.status || "-"}
                        </p>
                      </div>
                    </section>

                    <section className="rounded-2xl border border-border bg-background p-4">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Delivery Assignment
                      </h3>
                      {currentAssignment ? (
                        <div className="mt-4 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <AssignmentStatusBadge status={currentAssignment.status} />
                            <span className="text-xs text-muted-foreground">
                              {formatDateTime(currentAssignment.assignedAt)}
                            </span>
                          </div>
                          <div className="text-sm">
                            <p className="font-medium text-foreground">
                              {currentAssignment.deliveryMan.fullName}
                            </p>
                            <p className="text-muted-foreground">
                              {currentAssignment.deliveryMan.phone}
                              {currentAssignment.deliveryMan.employeeCode
                                ? ` · ${currentAssignment.deliveryMan.employeeCode}`
                                : ""}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Pickup proof:{" "}
                            {currentAssignment.pickupProof?.confirmedAt
                              ? `Submitted ${formatDateTime(
                                  currentAssignment.pickupProof.confirmedAt,
                                )}`
                              : "Pending"}
                          </p>
                          {currentAssignment.rejectionReason ? (
                            <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                              Rejected: {currentAssignment.rejectionReason}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-4 rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                          No delivery man assigned yet.
                        </div>
                      )}
                    </section>

                    <section className="rounded-2xl border border-border bg-background p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Shipment Actions
                        </h3>
                        {shipment.trackingUrl ? (
                          <a
                            href={shipment.trackingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-primary underline"
                          >
                            Open Tracking
                          </a>
                        ) : null}
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {nextStatuses.length ? (
                          nextStatuses.map((nextStatus) => (
                            <button
                              key={nextStatus}
                              type="button"
                              disabled={updatingId === shipment.id}
                              onClick={() => void updateShipmentStatus(shipment.id, nextStatus)}
                              className="btn-outline rounded-full px-3 py-2 text-xs font-medium disabled:opacity-60"
                            >
                              {updatingId === shipment.id
                                ? "Updating..."
                                : `Mark ${nextStatus.replace(/_/g, " ")}`}
                            </button>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No manual shipment actions available.
                          </span>
                        )}
                      </div>
                    </section>
                  </div>

                  {currentAssignment?.logs?.length ? (
                    <section className="mt-5 space-y-3">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Recent Delivery History
                      </h3>
                      <StatusTimeline logs={currentAssignment.logs} compact />
                    </section>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {createModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl">
            <ShipmentCreateForm
              onCreated={async () => {
                shipmentsCache.clear();
                await loadShipments(true);
                setCreateModalOpen(false);
                setNotice("Shipment created successfully.");
              }}
              onClose={() => setCreateModalOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <AssignDeliveryManModal
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
        shipments={selectedShipments.map((shipment) => ({
          id: shipment.id,
          orderId: shipment.orderId,
          courier: shipment.courier,
          warehouseId: shipment.warehouseId,
        }))}
        deliveryMen={deliveryMen}
        onAssigned={async (message) => {
          setNotice(message);
          setSelectedShipmentIds([]);
          shipmentsCache.clear();
          await loadShipments(true);
        }}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-foreground">{value}</p>
    </article>
  );
}
