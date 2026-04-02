"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Supplier = {
  id: number;
  code: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  leadTimeDays: number | null;
  paymentTermsDays: number | null;
  currency: string;
  taxNumber: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type SupplierFormState = {
  code: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  leadTimeDays: string;
  paymentTermsDays: string;
  currency: string;
  taxNumber: string;
  notes: string;
  isActive: boolean;
};

const emptyForm: SupplierFormState = {
  code: "",
  name: "",
  contactName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "BD",
  leadTimeDays: "",
  paymentTermsDays: "",
  currency: "BDT",
  taxNumber: "",
  notes: "",
  isActive: true,
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "Request failed");
  }
  return data as T;
}

export default function SuppliersPage() {
  const { data: session } = useSession();
  const globalPermissions = Array.isArray((session?.user as any)?.globalPermissions)
    ? ((session?.user as any).globalPermissions as string[])
    : [];
  const canManage = globalPermissions.includes("suppliers.manage");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SupplierFormState>(emptyForm);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      const data = await getJson<Supplier[]>(
        `/api/scm/suppliers${params.size ? `?${params.toString()}` : ""}`,
      );
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load suppliers");
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return suppliers;
    return suppliers.filter((supplier) =>
      [supplier.name, supplier.code, supplier.contactName, supplier.email, supplier.phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [search, suppliers]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const populateForm = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setForm({
      code: supplier.code,
      name: supplier.name,
      contactName: supplier.contactName || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      city: supplier.city || "",
      country: supplier.country || "BD",
      leadTimeDays: supplier.leadTimeDays?.toString() || "",
      paymentTermsDays: supplier.paymentTermsDays?.toString() || "",
      currency: supplier.currency || "BDT",
      taxNumber: supplier.taxNumber || "",
      notes: supplier.notes || "",
      isActive: supplier.isActive,
    });
  };

  const saveSupplier = async () => {
    if (!form.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }

    try {
      setSaving(true);
      const url = editingId
        ? `/api/scm/suppliers/${editingId}`
        : "/api/scm/suppliers";
      const method = editingId ? "PATCH" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          leadTimeDays: form.leadTimeDays || null,
          paymentTermsDays: form.paymentTermsDays || null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "Save failed");
      }

      toast.success(editingId ? "Supplier updated" : "Supplier created");
      resetForm();
      await loadSuppliers();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Maintain supplier master data for purchasing.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search suppliers..."
            className="w-full md:w-72"
          />
          <Button variant="outline" onClick={() => void loadSuppliers()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Supplier" : "Create Supplier"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Acme Traders Ltd"
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
                placeholder="ACME"
              />
            </div>
            <div>
              <Label>Contact Name</Label>
              <Input
                value={form.contactName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, contactName: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              />
            </div>
            <div>
              <Label>Tax Number</Label>
              <Input
                value={form.taxNumber}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, taxNumber: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>Lead Time (Days)</Label>
              <Input
                type="number"
                min="0"
                value={form.leadTimeDays}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, leadTimeDays: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>Payment Terms (Days)</Label>
              <Input
                type="number"
                min="0"
                value={form.paymentTermsDays}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, paymentTermsDays: event.target.value }))
                }
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={form.city}
                onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
              />
            </div>
            <div>
              <Label>Country</Label>
              <Input
                value={form.country}
                onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Input
                value={form.currency}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, currency: event.target.value.toUpperCase() }))
                }
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                  }
                />
                Active Supplier
              </label>
            </div>
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Textarea
                value={form.address}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, address: event.target.value }))
                }
                rows={3}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                rows={4}
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button onClick={() => void saveSupplier()} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Supplier" : "Create Supplier"}
              </Button>
              <Button variant="outline" onClick={resetForm} disabled={saving}>
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Supplier Directory</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading suppliers...</p>
          ) : filteredSuppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suppliers found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div className="font-medium">{supplier.name}</div>
                        <div className="text-xs text-muted-foreground">{supplier.code}</div>
                      </TableCell>
                      <TableCell>
                        <div>{supplier.contactName || "-"}</div>
                        <div className="text-xs text-muted-foreground">
                          {[supplier.email, supplier.phone].filter(Boolean).join(" | ") || "-"}
                        </div>
                      </TableCell>
                      <TableCell>{supplier.leadTimeDays ?? "-"}</TableCell>
                      <TableCell>{supplier.paymentTermsDays ?? "-"}</TableCell>
                      <TableCell>{supplier.isActive ? "Active" : "Inactive"}</TableCell>
                      <TableCell className="text-right">
                        {canManage ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => populateForm(supplier)}
                          >
                            Edit
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
