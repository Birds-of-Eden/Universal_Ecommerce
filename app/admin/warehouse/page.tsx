"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  ChevronDown,
  Loader2,
  PackageCheck,
  RefreshCw,
  Truck,
  Warehouse,
  Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import WarehouseDashboardSkeleton from "@/components/ui/WarehouseDashboardSkeleton";
import WarehouseLocationPicker from "@/components/Settings/WarehouseLocationPicker";
import { WarehouseMapData } from "@/lib/types/warehouse";

type WarehouseOption = {
  id: number;
  name: string;
  code: string;
  isDefault: boolean;
};

type WarehouseCard = {
  warehouseId: number;
  name: string;
  code: string;
  isDefault: boolean;
  totalUnits: number;
  reservedUnits: number;
  lowStockItems: number;
  pendingShipments: number;
  deliveredToday: number;
};

type DashboardData = {
  selectedWarehouseIds: number[];
  warehouses: WarehouseOption[];
  summary: {
    totalWarehouses: number;
    totalUnits: number;
    reservedUnits: number;
    lowStockItems: number;
    pendingShipments: number;
    deliveredToday: number;
    ordersInQueue: number;
  };
  warehouseCards: WarehouseCard[];
  lowStock: Array<{
    warehouseId: number;
    variantId: number;
    sku: string | null;
    productName: string;
    available: number;
    threshold: number;
  }>;
  recentShipments: Array<{
    id: number;
    warehouseId: number | null;
    orderId: number;
    status: string;
    courier: string;
    trackingNumber: string | null;
    createdAt: string;
    customerName: string;
    orderStatus: string;
  }>;
  recentLogs: Array<{
    id: number;
    createdAt: string;
    change: number;
    reason: string;
    productName: string;
    warehouseName: string;
    warehouseCode: string;
  }>;
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function WarehouseDashboardPage() {
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [mapData, setMapData] = useState<WarehouseMapData[]>([]);
  const [mapLoading, setMapLoading] = useState(true);

  const fetchDashboard = useCallback(
    async (nextWarehouseId?: string, showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError("");

        const params = new URLSearchParams();
        // Use nextWarehouseId if provided, otherwise use current warehouseId
        // Empty string means "all warehouses" - don't set the parameter
        const resolvedWarehouseId = nextWarehouseId !== undefined ? nextWarehouseId : warehouseId;
        if (resolvedWarehouseId) {
          params.set("warehouseId", resolvedWarehouseId);
        }

        const response = await fetch(
          `/api/admin/warehouse-dashboard${params.size > 0 ? `?${params}` : ""}`,
          {
            cache: "no-store",
          },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            payload?.error || "Failed to load warehouse dashboard",
          );
        }

        setData(payload);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load warehouse dashboard",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [warehouseId],
  );

  const loadMapData = useCallback(async () => {
    setMapLoading(true);
    try {
      const res = await fetch("/api/warehouses/map");
      const data = await res.json();
      setMapData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load map data:", error);
      setMapData([]);
    } finally {
      setMapLoading(false);
    }
  }, []);

  // Filter map data based on selected warehouse
  const filteredMapData = useMemo(() => {
    if (!mapData.length) return [];
    
    if (!warehouseId || warehouseId === "all") {
      return mapData;
    }
    
    return mapData.filter(warehouse => String(warehouse.id) === warehouseId);
  }, [mapData, warehouseId]);

  useEffect(() => {
    fetchDashboard();
    loadMapData();
  }, [fetchDashboard, loadMapData]);

  const selectedWarehouseLabel = useMemo(() => {
    if (!data) return "All assigned warehouses";

    if (data.selectedWarehouseIds.length === 0) {
      return "All assigned warehouses";
    }

    const selectedWarehouses = data.warehouses.filter((warehouse) =>
      data.selectedWarehouseIds.includes(warehouse.id),
    );

    if (selectedWarehouses.length === 1) {
      const selected = selectedWarehouses[0];
      return `${selected.name} (${selected.code})`;
    }

    if (selectedWarehouses.length > 1) {
      return `${selectedWarehouses.length} warehouses selected`;
    }

    return "Assigned warehouses";
  }, [data]);

  const summaryCards = useMemo(
    () => [
      {
        title: "Warehouse Scope",
        value: String(data?.summary.totalWarehouses ?? 0),
        note: selectedWarehouseLabel,
        icon: Warehouse,
      },
      {
        title: "Units On Hand",
        value: String(data?.summary.totalUnits ?? 0),
        note: `${data?.summary.reservedUnits ?? 0} reserved units`,
        icon: Boxes,
      },
      {
        title: "Pending Shipments",
        value: String(data?.summary.pendingShipments ?? 0),
        note: `${data?.summary.ordersInQueue ?? 0} still pending`,
        icon: Truck,
      },
      {
        title: "Low Stock Alerts",
        value: String(data?.summary.lowStockItems ?? 0),
        note: `${data?.summary.deliveredToday ?? 0} delivered today`,
        icon: AlertTriangle,
      },
    ],
    [data, selectedWarehouseLabel],
  );

  const warehouseCardItems = useMemo(() => {
    if (!data?.warehouseCards.length) return null;

    return data.warehouseCards.map((card) => (
      <div
        key={card.warehouseId}
        className="grid gap-3 rounded-2xl border bg-background p-4 md:grid-cols-5"
      >
        <div className="md:col-span-2">
          <p className="font-medium text-foreground">
            {card.name} ({card.code})
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {card.isDefault ? "Default warehouse" : "Operational warehouse"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Units
          </p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {card.totalUnits}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Reserved
          </p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {card.reservedUnits}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Shipments
          </p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {card.pendingShipments} pending
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {card.lowStockItems} low-stock alerts
          </p>
        </div>
      </div>
    ));
  }, [data?.warehouseCards]);

  const lowStockItems = useMemo(() => {
    if (!data?.lowStock.length) return null;

    return data.lowStock.map((item) => (
      <div
        key={`${item.warehouseId}:${item.variantId}`}
        className="rounded-2xl border bg-background p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">{item.productName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.sku || "No SKU"} · Warehouse #{item.warehouseId}
            </p>
          </div>
          <div className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700">
            {item.available} left
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Threshold: {item.threshold} units
        </p>
      </div>
    ));
  }, [data?.lowStock]);

  const recentShipmentItems = useMemo(() => {
    if (!data?.recentShipments.length) return null;

    return data.recentShipments.map((shipment) => (
      <div key={shipment.id} className="rounded-2xl border bg-background p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">
              Shipment #{shipment.id} for Order #{shipment.orderId}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {shipment.customerName || "Unknown customer"} · {shipment.courier}
            </p>
          </div>
          <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {shipment.status}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>Order: {shipment.orderStatus || "-"}</span>
          <span>Tracking: {shipment.trackingNumber || "-"}</span>
          <span>{formatDateTime(shipment.createdAt)}</span>
        </div>
      </div>
    ));
  }, [data?.recentShipments]);

  const recentLogItems = useMemo(() => {
    if (!data?.recentLogs.length) return null;

    return data.recentLogs.map((log) => (
      <div key={log.id} className="rounded-2xl border bg-background p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">{log.productName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {log.warehouseName} ({log.warehouseCode || "-"})
            </p>
          </div>
          <div
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              log.change >= 0
                ? "bg-emerald-500/10 text-emerald-700"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {log.change > 0 ? `+${log.change}` : log.change}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{log.reason}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {formatDateTime(log.createdAt)}
        </p>
      </div>
    ));
  }, [data?.recentLogs]);

  if (loading) {
    return <WarehouseDashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="space-y-6">
        <section className="rounded-3xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/70">
                Warehouse Operations
              </p>
              <h1 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
                Warehouse Dashboard
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Monitor assigned warehouse activity, shipment queue, and stock
                health from a single scoped workspace.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="min-w-[240px] justify-between rounded-2xl px-4 py-3 text-sm font-medium"
                  >
                    <span className="truncate">{selectedWarehouseLabel}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-[280px] rounded-2xl"
                >
                  <DropdownMenuLabel>Warehouse scope</DropdownMenuLabel>
                  <DropdownMenuRadioGroup
                    value={warehouseId || "all"}
                    onValueChange={(value) => {
                      const nextWarehouseId = value === "all" ? "" : value;
                      setWarehouseId(nextWarehouseId);
                      void fetchDashboard(nextWarehouseId);
                    }}
                  >
                    <DropdownMenuRadioItem value="all">
                      All assigned
                    </DropdownMenuRadioItem>
                    <DropdownMenuSeparator />
                    {data?.warehouses.map((warehouse) => (
                      <DropdownMenuRadioItem
                        key={warehouse.id}
                        value={String(warehouse.id)}
                      >
                        {warehouse.name} ({warehouse.code})
                        {warehouse.isDefault ? " - Default" : ""}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                onClick={() => void fetchDashboard(undefined, true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
          </div>
          {error ? (
            <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <article
              key={card.title}
              className="rounded-3xl border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    {card.value}
                  </p>
                </div>
                <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{card.note}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-3xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Warehouse Coverage
                </h2>
                <p className="text-sm text-muted-foreground">
                  Assigned warehouses with current stock and shipment pressure.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {warehouseCardItems ? (
                warehouseCardItems
              ) : (
                <div className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No assigned warehouses found for this dashboard.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-3xl border bg-card p-5 shadow-sm">
            {mapLoading ? (
              <div className="mt-4 animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-96 bg-gray-200 rounded mt-4"></div>
              </div>
            ) : filteredMapData.length === 0 ? (
              <div className="mt-4 text-center py-8">
                <Map className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">
                  {warehouseId && warehouseId !== "all" 
                    ? "Selected warehouse has no location data. Add GPS coordinates to see it on the map."
                    : "No warehouses with location data found. Add GPS coordinates to warehouses to see them on the map."
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {filteredMapData.length} warehouse(s) found with location data
                  {warehouseId && warehouseId !== "all" && " for selected warehouse"}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50" id="map-error-boundary" style={{ display: 'none' }}>
                    <div className="text-center">
                      <Map className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">Map failed to load. Please refresh the page.</p>
                    </div>
                  </div>
                  <WarehouseLocationPicker
                    readonly
                    markers={filteredMapData.map((warehouse) => ({
                      id: warehouse.id,
                      name: warehouse.name,
                      code: warehouse.code,
                      label: warehouse.mapLabel,
                      latitude: warehouse.latitude ?? 0,
                      longitude: warehouse.longitude ?? 0,
                      district: warehouse.district,
                      area: warehouse.area,
                      coverageRadiusKm: warehouse.coverageRadiusKm ?? null,
                    }))}
                    title="Warehouse Coverage Map"
                    heightClassName="h-96"
                    onError={() => {
                      const errorBoundary = document.getElementById('map-error-boundary');
                      if (errorBoundary) {
                        errorBoundary.style.display = 'flex';
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-3xl border bg-card p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Low Stock Watchlist
              </h2>
              <p className="text-sm text-muted-foreground">
                Variants at or below their warehouse threshold.
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {lowStockItems ? (
                lowStockItems
              ) : (
                <div className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No low-stock alerts in the current warehouse scope.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-3xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Recent Inventory Activity
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              {recentLogItems ? (
                recentLogItems
              ) : (
                <div className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No recent inventory events found.
                </div>
              )}
            </div>
          </article>
        </section>

        <section>
          <article className="rounded-3xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                Recent Shipments
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              {recentShipmentItems ? (
                recentShipmentItems
              ) : (
                <div className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No shipment activity found for this scope.
                </div>
              )}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
