"use client";

import { useEffect, useState } from "react";
import WarehouseForm from "@/components/Settings/WarehouseForm";

type Warehouse = {
  id: number;
  name: string;
  code: string;
  address?: {
    location: string;
  } | null;
  isDefault: boolean;
};

export default function WarehousePage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

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
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Warehouse Management</h1>

      <WarehouseForm 
        refresh={loadWarehouses} 
        editingWarehouse={editingWarehouse} 
        setEditingWarehouse={setEditingWarehouse} 
      />

      <div className="card-theme border rounded-lg p-4 space-y-3">
        {loading ? (
          <p>Loading...</p>
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
    </div>
  );
}