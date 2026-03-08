"use client";

import { useEffect, useState } from "react";
import WarehouseFormModal from "@/components/Settings/WarehouseFormModal";
import WarehouseSkeleton from "@/components/ui/WarehouseSkeleton";
import { Warehouse } from "@/lib/types/warehouse";

export default function WarehousePage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadWarehouses = async () => {
    setLoading(true);
    const res = await fetch("/api/warehouses");
    const data = await res.json();
    setWarehouses(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Warehouse Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary px-4 py-2 rounded"
        >
          Add Warehouse
        </button>
      </div>

      <div className="card-theme border rounded-lg p-4 space-y-3">
        {loading ? (
          <WarehouseSkeleton />
        ) : (
          warehouses.map((w) => (
            <div
              key={w.id}
              className="flex justify-between items-center border-b py-2"
            >
              <div>
                <p className="font-medium">{w.name}</p>
                <p className="text-sm text-muted-foreground">
                  Code: {w.code}
                </p>
                {w.address && (
                  <p className="text-xs text-muted-foreground">
                    Location: {w.address.location}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingWarehouse(w)}
                  className="btn-primary px-3 py-1 rounded text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={async () => {
                    if (confirm(`Are you sure you want to delete ${w.name}?`)) {
                      await fetch(`/api/warehouses/${w.id}`, {
                        method: "DELETE",
                      });
                      loadWarehouses();
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

      {showAddModal && (
        <WarehouseFormModal
          onClose={() => setShowAddModal(false)}
          refresh={loadWarehouses}
        />
      )}

      {editingWarehouse && (
        <WarehouseFormModal
          onClose={() => setEditingWarehouse(null)}
          refresh={loadWarehouses}
          editingWarehouse={editingWarehouse}
        />
      )}
    </div>
  );
}