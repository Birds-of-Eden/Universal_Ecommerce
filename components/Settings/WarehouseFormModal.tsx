"use client";

import { useState, useEffect } from "react";
import { Warehouse, type WarehouseForm } from "@/lib/types/warehouse";

interface WarehouseFormModalProps {
  onClose: () => void;
  refresh: () => void;
  editingWarehouse?: Warehouse | null;
}

export default function WarehouseFormModal({ onClose, refresh, editingWarehouse }: WarehouseFormModalProps) {
  const [form, setForm] = useState<WarehouseForm>({
    name: "",
    code: "",
    address: "",
    isDefault: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset form when editingWarehouse changes
  useEffect(() => {
    if (editingWarehouse) {
      setForm({
        name: editingWarehouse.name,
        code: editingWarehouse.code,
        address: editingWarehouse.address?.location || "",
        isDefault: editingWarehouse.isDefault,
      });
    } else {
      setForm({
        name: "",
        code: "",
        address: "",
        isDefault: false,
      });
    }
    setError(null);
    setSuccess(null);
  }, [editingWarehouse]);

  const isEditing = !!editingWarehouse;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validation
    if (!form.name.trim()) {
      setError("Warehouse name is required");
      setLoading(false);
      return;
    }
    if (!form.code.trim()) {
      setError("Warehouse code is required");
      setLoading(false);
      return;
    }

    try {
      const url = isEditing ? `/api/warehouses/${editingWarehouse.id}` : "/api/warehouses";
      const method = isEditing ? "PATCH" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          address: form.address ? { location: form.address } : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || `Failed to ${isEditing ? "update" : "create"} warehouse`);
      }

      setSuccess(`Warehouse ${isEditing ? "updated" : "created"} successfully!`);
      refresh();
      
      // Close modal after successful submission
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div className="card-theme p-6 rounded-lg w-[500px] max-w-[90vw] border shadow-lg max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            {isEditing ? "Edit Warehouse" : "Add Warehouse"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Warehouse Name
            </label>
            <input
              placeholder="Warehouse Name"
              className="input-theme border p-2 rounded w-full"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Unique Code
            </label>
            <input
              placeholder="Unique Code"
              className="input-theme border p-2 rounded w-full"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Address
            </label>
            <input
              placeholder="Address"
              className="input-theme border p-2 rounded w-full"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isDefault" className="text-sm font-medium">
              Default Warehouse
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-sm">
              {success}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border rounded"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Warehouse" : "Save Warehouse")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
