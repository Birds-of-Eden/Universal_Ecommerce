"use client";

import { useState, useEffect } from "react";

type CourierForm = {
  name: string;
  type: "PATHAO" | "REDX" | "STEADFAST" | "CUSTOM";
  baseUrl: string;
  apiKey: string;
  secretKey: string;
  clientId: string;
};

type Courier = {
  id: number;
  name: string;
  type: "PATHAO" | "REDX" | "STEADFAST" | "CUSTOM";
  baseUrl: string;
  apiKey?: string;
  secretKey?: string;
  clientId?: string;
  isActive: boolean;
};

interface CourierFormProps {
  refresh: () => void;
  editingCourier?: Courier | null;
  setEditingCourier?: (courier: Courier | null) => void;
}

export default function CourierForm({ refresh, editingCourier, setEditingCourier }: CourierFormProps) {
  const [form, setForm] = useState<CourierForm>({
    name: "",
    type: "PATHAO",
    baseUrl: "",
    apiKey: "",
    secretKey: "",
    clientId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset form when editingCourier changes
  useEffect(() => {
    if (editingCourier) {
      setForm({
        name: editingCourier.name,
        type: editingCourier.type,
        baseUrl: editingCourier.baseUrl,
        apiKey: editingCourier.apiKey || "",
        secretKey: editingCourier.secretKey || "",
        clientId: editingCourier.clientId || "",
      });
    } else {
      setForm({
        name: "",
        type: "PATHAO",
        baseUrl: "",
        apiKey: "",
        secretKey: "",
        clientId: "",
      });
    }
    setError(null);
    setSuccess(null);
  }, [editingCourier]);

  const isEditing = !!editingCourier;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validation
    if (!form.name.trim()) {
      setError("Courier name is required");
      setLoading(false);
      return;
    }
    if (!form.baseUrl.trim()) {
      setError("Base URL is required");
      setLoading(false);
      return;
    }

    try {
      const url = isEditing ? `/api/couriers/${editingCourier.id}` : "/api/couriers";
      const method = isEditing ? "PATCH" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEditing ? "update" : "create"} courier`);
      }

      setSuccess(`Courier ${isEditing ? "updated" : "created"} successfully!`);
      refresh();
      
      if (isEditing && setEditingCourier) {
        setEditingCourier(null);
      } else {
        setForm({
          name: "",
          type: "PATHAO",
          baseUrl: "",
          apiKey: "",
          secretKey: "",
          clientId: "",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card-theme border p-4 rounded-lg space-y-3"
    >
      <h2 className="font-semibold">{isEditing ? "Edit Courier" : "Add Courier"}</h2>

      <input
        placeholder="Courier Name"
        className="input-theme border p-2 rounded w-full"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        required
      />

      <select
        className="input-theme border p-2 rounded w-full"
        value={form.type}
        onChange={(e) => setForm({ ...form, type: e.target.value as CourierForm["type"] })}
      >
        <option value="PATHAO">Pathao</option>
        <option value="REDX">RedX</option>
        <option value="STEADFAST">Steadfast</option>
        <option value="CUSTOM">Custom</option>
      </select>

      <input
        placeholder="Base URL (e.g., https://api.pathao.com)"
        className="input-theme border p-2 rounded w-full"
        value={form.baseUrl}
        onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
        required
      />

      <input
        placeholder="API Key"
        className="input-theme border p-2 rounded w-full"
        value={form.apiKey}
        onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
      />

      <input
        placeholder="Secret Key (optional)"
        className="input-theme border p-2 rounded w-full"
        value={form.secretKey}
        onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
      />

      <input
        placeholder="Client ID (optional)"
        className="input-theme border p-2 rounded w-full"
        value={form.clientId}
        onChange={(e) => setForm({ ...form, clientId: e.target.value })}
      />

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

      {isEditing && (
        <button
          type="button"
          onClick={() => setEditingCourier && setEditingCourier(null)}
          className="btn-secondary px-4 py-2 rounded"
        >
          Cancel
        </button>
      )}
      <button 
        type="submit"
        disabled={loading}
        className="btn-primary px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (isEditing ? "Updating..." : "Creating...") : (isEditing ? "Update Courier" : "Save Courier")}
      </button>
    </form>
  );
}
