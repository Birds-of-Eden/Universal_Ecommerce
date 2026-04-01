"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type WarehouseDetailsResponse = {
  warehouse: any;
  summary: {
    totalUnits: number;
    reservedUnits: number;
    availableUnits: number;
    productVariants: number;
    distinctProducts: number;
    lowStockItems: number;
    outOfStockItems: number;
    shipments: { total: number; byStatus: Record<string, number> };
    deliveredToday: number;
    soldUnits: number;
    deliveryMen: { count: number };
    deliveryAssignments: { total: number; byStatus: Record<string, number> };
    staff: { count: number };
  };
  stockLevels: Array<{
    id: number;
    quantity: number;
    reserved: number;
    available: number;
    updatedAt: string;
    variant: {
      id: number;
      sku: string | null;
      lowStockThreshold: number;
      product: {
        id: number;
        name: string;
        type: string;
      };
    };
  }>;
};

function FieldRow({ label, value }: { label: string; value: any }) {
  const rendered =
    value === null || value === undefined || value === ""
      ? "-"
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);

  return (
    <div className="grid grid-cols-1 gap-1 rounded-lg border border-border bg-background px-3 py-2 text-sm md:grid-cols-[220px_1fr]">
      <div className="font-medium text-foreground">{label}</div>
      <div className="break-words text-muted-foreground">{rendered}</div>
    </div>
  );
}

export default function WarehouseDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [data, setData] = useState<WarehouseDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`/api/warehouses/${id}/details`, {
          cache: "no-store",
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload?.error || "Failed to load warehouse details");
        }
        setData(payload);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Failed to load warehouse details",
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      void run();
    }
  }, [id]);

  const warehouseFields = useMemo(() => {
    const warehouse = data?.warehouse;
    if (!warehouse) return [] as Array<{ key: string; value: any }>;
    return Object.keys(warehouse)
      .sort()
      .map((key) => ({ key, value: warehouse[key] }));
  }, [data?.warehouse]);

  const shipmentStatusItems = useMemo(() => {
    const byStatus = data?.summary.shipments.byStatus;
    if (!byStatus) return null;

    return Object.entries(byStatus)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([status, count]) => (
        <div
          key={status}
          className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <span className="text-muted-foreground">{status}</span>
          <span className="font-medium text-foreground">{count}</span>
        </div>
      ));
  }, [data?.summary.shipments.byStatus]);

  const assignmentStatusItems = useMemo(() => {
    const byStatus = data?.summary.deliveryAssignments.byStatus;
    if (!byStatus) return null;

    return Object.entries(byStatus)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([status, count]) => (
        <div
          key={status}
          className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <span className="text-muted-foreground">{status}</span>
          <span className="font-medium text-foreground">{count}</span>
        </div>
      ));
  }, [data?.summary.deliveryAssignments.byStatus]);

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Warehouse Details
            {data?.warehouse?.name ? `: ${data.warehouse.name}` : ""}
          </h1>
          {data?.warehouse?.code ? (
            <p className="text-sm text-muted-foreground">
              Code: {data.warehouse.code}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              window.location.href = "/admin/settings/warehouses";
            }}
            className="btn-secondary px-4 py-2 rounded"
          >
            Back
          </button>
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="btn-primary px-4 py-2 rounded"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card-theme border rounded-lg p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      ) : error ? (
        <div className="card-theme border rounded-lg p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="card-theme border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Products</p>
              <p className="text-2xl font-bold">
                {data.summary.distinctProducts}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.summary.productVariants} variants
              </p>
            </div>
            <div className="card-theme border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Stock Units</p>
              <p className="text-2xl font-bold">{data.summary.totalUnits}</p>
              <p className="text-xs text-muted-foreground">
                {data.summary.availableUnits} available ·{" "}
                {data.summary.reservedUnits} reserved
              </p>
            </div>
            <div className="card-theme border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Sold Units</p>
              <p className="text-2xl font-bold">{data.summary.soldUnits}</p>
              <p className="text-xs text-muted-foreground">
                Delivered shipment items
              </p>
            </div>
            <div className="card-theme border rounded-lg p-4">
              <p className="text-xs text-muted-foreground">Delivery Men</p>
              <p className="text-2xl font-bold">
                {data.summary.deliveryMen.count}
              </p>
              <p className="text-xs text-muted-foreground">
                Staff: {data.summary.staff.count}
              </p>
            </div>
          </div>

          <div className="card-theme border rounded-lg p-4 space-y-3">
            <h2 className="text-lg font-semibold">
              Products in this Warehouse
            </h2>

            {data.stockLevels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No stock levels found for this warehouse.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-2 py-2">Product</th>
                      <th className="px-2 py-2">Type</th>
                      <th className="px-2 py-2">SKU</th>
                      <th className="px-2 py-2">Qty</th>
                      <th className="px-2 py-2">Reserved</th>
                      <th className="px-2 py-2">Available</th>
                      <th className="px-2 py-2">Low Stock Threshold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stockLevels.map((level) => (
                      <tr key={level.id} className="border-b border-border/60">
                        <td className="px-2 py-3 font-medium text-foreground">
                          {level.variant.product.name}
                        </td>
                        <td className="px-2 py-3 text-muted-foreground">
                          {level.variant.product.type}
                        </td>
                        <td className="px-2 py-3 text-muted-foreground">
                          {level.variant.sku || "-"}
                        </td>
                        <td className="px-2 py-3 text-foreground">
                          {level.quantity}
                        </td>
                        <td className="px-2 py-3 text-foreground">
                          {level.reserved}
                        </td>
                        <td className="px-2 py-3 text-foreground">
                          {level.available}
                        </td>
                        <td className="px-2 py-3 text-muted-foreground">
                          {level.variant.lowStockThreshold}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <div className="card-theme border rounded-lg p-4 space-y-3">
              <h2 className="text-lg font-semibold">Shipments</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold text-foreground">
                    {data.summary.shipments.total}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Delivered today: {data.summary.deliveredToday}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Issues</p>
                  <p className="text-xl font-bold text-foreground">
                    {data.summary.lowStockItems} low stock
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.summary.outOfStockItems} out of stock
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {shipmentStatusItems}
              </div>
            </div>

            <div className="card-theme border rounded-lg p-4 space-y-3">
              <h2 className="text-lg font-semibold">Delivery Assignments</h2>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-foreground">
                  {data.summary.deliveryAssignments.total}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {assignmentStatusItems}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
