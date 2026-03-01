"use client";

import CourierForm from "@/components/Settings/CourierForm";
import { useEffect, useState } from "react";

type Courier = {
  id: number;
  name: string;
  type: "PATHAO" | "REDX" | "STADFAST" | "CUSTOM";
  baseUrl: string;
  apiKey?: string;
  secretKey?: string;
  clientId?: string;
  isActive: boolean;
};

export default function CourierPage() {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);

  const loadCouriers = async () => {
    setLoading(true);
    const res = await fetch("/api/couriers");
    const data = await res.json();
    setCouriers(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    loadCouriers();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Courier Management</h1>

      <CourierForm refresh={loadCouriers} editingCourier={editingCourier} setEditingCourier={setEditingCourier} />

      <div className="card-theme border rounded-lg p-4">
        {loading ? (
          <p>Loading...</p>
        ) : (
          couriers.map((c) => (
            <div key={c.id} className="flex justify-between items-center border-b py-3">
              <div className="flex-1">
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-muted-foreground">
                  {c.type} | {c.baseUrl}
                </p>
                <p className="text-xs text-muted-foreground">
                  Status: {c.isActive ? "Active" : "Inactive"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingCourier(c)}
                  className="btn-primary px-3 py-1 rounded text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={async () => {
                    if (confirm(`Are you sure you want to delete ${c.name}?`)) {
                      await fetch(`/api/couriers/${c.id}`, {
                        method: "DELETE",
                      });
                      loadCouriers();
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
