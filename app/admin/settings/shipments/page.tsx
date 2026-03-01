"use client";

import { useEffect, useState } from "react";
import ShipmentTable from "@/components/Settings/ShipmentTable";
import ShipmentFormModal from "@/components/Settings/ShipmentFormModal";

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchShipments = async () => {
    setLoading(true);
    const res = await fetch("/api/shipment");
    const data = await res.json();
    setShipments(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Shipments</h1>
        <button
          onClick={() => setOpen(true)}
          className="bg-black text-white px-4 py-2 rounded"
        >
          Create Shipment
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <ShipmentTable shipments={shipments} refresh={fetchShipments} />
      )}

      {open && (
        <ShipmentFormModal
          onClose={() => setOpen(false)}
          refresh={fetchShipments}
        />
      )}
    </div>
  );
}