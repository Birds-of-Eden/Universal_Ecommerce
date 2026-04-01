"use client";

import { useEffect, useState } from "react";
import { Map, List } from "lucide-react";
import WarehouseFormModal from "@/components/Settings/WarehouseFormModal";
import WarehouseLocationPicker from "@/components/Settings/WarehouseLocationPicker";
import WarehouseSkeleton from "@/components/ui/WarehouseSkeleton";
import { Warehouse, WarehouseMapData } from "@/lib/types/warehouse";

export default function WarehousePage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [mapData, setMapData] = useState<WarehouseMapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapLoading, setMapLoading] = useState(true);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMapView, setShowMapView] = useState(false);

  const loadWarehouses = async () => {
    setLoading(true);
    const res = await fetch("/api/warehouses");
    const data = await res.json();
    setWarehouses(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const loadMapData = async () => {
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
  };

  useEffect(() => {
    loadWarehouses();
    loadMapData();
  }, []);

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Warehouse Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMapView(!showMapView)}
            className="btn-secondary px-4 py-2 rounded flex items-center gap-2"
          >
            {showMapView ? (
              <>
                <List className="w-4 h-4" />
                List View
              </>
            ) : (
              <>
                <Map className="w-4 h-4" />
                Map View
              </>
            )}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary px-4 py-2 rounded"
          >
            Add Warehouse
          </button>
        </div>
      </div>

      {showMapView ? (
        <div className="card-theme border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Warehouse Locations</h2>
          {mapLoading ? (
            <div className="animate-pulse space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          ) : mapData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No warehouses with location data found. Add GPS coordinates to warehouses to see them on the map.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {mapData.length} warehouse(s) found with location data
              </div>

              <WarehouseLocationPicker
                readonly
                markers={mapData.map((warehouse) => ({
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
                heightClassName="h-[660px]"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {mapData.map((warehouse) => (
                  <div
                    key={warehouse.id}
                    className="rounded-lg border border-border bg-background p-3 text-sm"
                  >
                    <div className="font-medium mb-1">
                      {warehouse.mapLabel || warehouse.name}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Code: {warehouse.code}</div>
                      {(warehouse.district || warehouse.area) ? (
                        <div>{[warehouse.area, warehouse.district].filter(Boolean).join(", ")}</div>
                      ) : null}
                      <div>
                        {warehouse.latitude?.toFixed(4)}, {warehouse.longitude?.toFixed(4)}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        window.open(
                          `https://www.google.com/maps?q=${warehouse.latitude},${warehouse.longitude}`,
                          "_blank",
                        );
                      }}
                      className="mt-2 text-xs btn-primary px-2 py-1 rounded"
                    >
                      Open in Google Maps
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card-theme border rounded-lg p-4 space-y-3">
          {loading ? (
            <WarehouseSkeleton />
          ) : (
            warehouses.map((warehouse) => (
              <div
                key={warehouse.id}
                className="flex justify-between items-center border-b py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  window.location.href = `/admin/settings/warehouses/${warehouse.id}`;
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{warehouse.name}</p>
                    {warehouse.isDefault ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        Default
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Code: {warehouse.code}
                  </p>

                  <div className="text-xs text-muted-foreground space-y-1">
                    {warehouse.address?.location ? (
                      <p>Address: {warehouse.address.location}</p>
                    ) : null}

                    {warehouse.division || warehouse.district || warehouse.area ? (
                      <p>
                        {[warehouse.division, warehouse.district, warehouse.area]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    ) : null}

                    {warehouse.latitude && warehouse.longitude ? (
                      <p>
                        GPS: {warehouse.latitude.toFixed(4)}, {warehouse.longitude.toFixed(4)}
                      </p>
                    ) : null}

                    {warehouse.mapLabel ? <p>Map Label: {warehouse.mapLabel}</p> : null}
                  </div>
                </div>

                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      window.location.href = `/admin/settings/warehouses/${warehouse.id}`;
                    }}
                    className="btn-secondary px-3 py-1 rounded text-sm"
                  >
                    Details
                  </button>
                  {warehouse.latitude && warehouse.longitude && warehouse.isMapEnabled ? (
                    <button
                      onClick={() => {
                        window.open(
                          `https://www.google.com/maps?q=${warehouse.latitude},${warehouse.longitude}`,
                          "_blank",
                        );
                      }}
                      className="btn-secondary px-3 py-1 rounded text-sm"
                      title="View on Map"
                    >
                      Map
                    </button>
                  ) : null}
                  <button
                    onClick={() => setEditingWarehouse(warehouse)}
                    className="btn-primary px-3 py-1 rounded text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete ${warehouse.name}?`)) {
                        await fetch(`/api/warehouses/${warehouse.id}`, {
                          method: "DELETE",
                        });
                        loadWarehouses();
                        loadMapData();
                      }
                    }}
                    className="btn-danger px-3 py-1 rounded text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showAddModal ? (
        <WarehouseFormModal
          onClose={() => setShowAddModal(false)}
          refresh={() => {
            loadWarehouses();
            loadMapData();
          }}
        />
      ) : null}

      {editingWarehouse ? (
        <WarehouseFormModal
          onClose={() => setEditingWarehouse(null)}
          refresh={() => {
            loadWarehouses();
            loadMapData();
          }}
          editingWarehouse={editingWarehouse}
        />
      ) : null}
    </div>
  );
}
