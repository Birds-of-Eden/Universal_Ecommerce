"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Plus,
  Edit3,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface VatRate {
  id: number;
  VatClassId: number;
  countryCode: string;
  regionCode?: string | null;
  rate: number | string;
  inclusive: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

interface VatClass {
  id: number;
  name: string;
  code: string;
  description?: string;
  rates?: VatRate[];
}

export default function VatClasses() {
  const [vatClasses, setVatClasses] = useState<VatClass[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VatClass | null>(null);

  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateClass, setRateClass] = useState<VatClass | null>(null);
  const [editingRate, setEditingRate] = useState<VatRate | null>(null);

  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
  });

  const [rateForm, setRateForm] = useState({
    countryCode: "BD",
    regionCode: "",
    ratePercent: "",
    inclusive: false,
    startDate: "",
    endDate: "",
  });

  /* =========================
     LOAD DATA
  ========================= */
  const loadVatClasses = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/vat-classes");
      const data = await res.json();
      setVatClasses(data || []);
    } catch (err) {
      toast.error("Failed to load VAT classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVatClasses();
  }, []);

  /* =========================
     MODAL
  ========================= */
  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", code: "", description: "" });
    setModalOpen(true);
  };

  const openEdit = (vat: VatClass) => {
    setEditing(vat);
    setForm({
      name: vat.name,
      code: vat.code,
      description: vat.description || "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const toPercentString = (rate: number | string) => {
    const n = typeof rate === "string" ? Number(rate) : rate;
    if (!Number.isFinite(n)) return "";
    return (n * 100).toString();
  };

  const openAddRate = (vat: VatClass) => {
    setRateClass(vat);
    setEditingRate(null);
    setRateForm({
      countryCode: "BD",
      regionCode: "",
      ratePercent: "",
      inclusive: false,
      startDate: "",
      endDate: "",
    });
    setRateModalOpen(true);
  };

  const openEditRate = (vat: VatClass, rate: VatRate) => {
    setRateClass(vat);
    setEditingRate(rate);
    setRateForm({
      countryCode: rate.countryCode || "BD",
      regionCode: rate.regionCode || "",
      ratePercent: toPercentString(rate.rate),
      inclusive: !!rate.inclusive,
      startDate: rate.startDate ? String(rate.startDate).slice(0, 10) : "",
      endDate: rate.endDate ? String(rate.endDate).slice(0, 10) : "",
    });
    setRateModalOpen(true);
  };

  const closeRateModal = () => {
    setRateModalOpen(false);
    setRateClass(null);
    setEditingRate(null);
  };

  /* =========================
     SUBMIT
  ========================= */
  const handleSubmit = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Name and Code required");
      return;
    }

    try {
      if (editing) {
        const res = await fetch(`/api/vat-classes/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error);
        }

        toast.success("Updated successfully");
      } else {
        const res = await fetch(`/api/vat-classes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error);
        }

        toast.success("Created successfully");
      }

      closeModal();
      loadVatClasses();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    }
  };

  const handleRateSubmit = async () => {
    if (!rateClass) return;

    const countryCode = rateForm.countryCode.trim().toUpperCase();
    if (countryCode.length !== 2) {
      toast.error("Country code must be 2 letters (e.g. BD)");
      return;
    }

    const percent = Number(rateForm.ratePercent);
    if (!Number.isFinite(percent) || percent < 0) {
      toast.error("Rate must be a number (e.g. 7.5)");
      return;
    }

    const payload = {
      VatClassId: rateClass.id,
      countryCode,
      regionCode: rateForm.regionCode.trim() || null,
      rate: percent / 100,
      inclusive: rateForm.inclusive,
      startDate: rateForm.startDate || null,
      endDate: rateForm.endDate || null,
    };

    try {
      if (editingRate) {
        const res = await fetch(`/api/vat-rates/${editingRate.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error);
        }

        toast.success("Rate updated");
      } else {
        const res = await fetch(`/api/vat-rates`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error);
        }

        toast.success("Rate created");
      }

      closeRateModal();
      loadVatClasses();
    } catch (err: any) {
      toast.error(err.message || "Failed to save rate");
    }
  };

  const handleRateDelete = async (rateId: number) => {
    if (!confirm("Delete this VAT rate?")) return;

    try {
      const res = await fetch(`/api/vat-rates/${rateId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success("Rate deleted");
      loadVatClasses();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  };

  /* =========================
     DELETE
  ========================= */
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this VAT class?")) return;

    try {
      await fetch(`/api/vat-classes/${id}`, {
        method: "DELETE",
      });

      toast.success("Deleted successfully");
      loadVatClasses();
    } catch {
      toast.error("Delete failed");
    }
  };

  /* =========================
     UI
  ========================= */
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold">VAT Classes</h1>
        <Button onClick={openAdd}>
          <Plus size={16} className="mr-2" />
          Add VAT Class
        </Button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {vatClasses.map((vat) => (
            <Card key={vat.id}>
              <CardContent className="p-6 space-y-3">
                <h3 className="font-bold text-lg">{vat.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Code: {vat.code}
                </p>
                <p className="text-sm">
                  {vat.description || "No description"}
                </p>

                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Rates</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openAddRate(vat)}
                    >
                      <Plus size={14} className="mr-1" />
                      Add Rate
                    </Button>
                  </div>

                  {(vat.rates || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No rates yet</p>
                  ) : (
                    <div className="space-y-2">
                      {(vat.rates || []).map((r) => (
                        <div
                          key={r.id}
                          className="border rounded-lg p-3 flex items-start justify-between gap-3"
                        >
                          <div className="text-sm">
                            <div className="font-medium">
                              {r.countryCode}
                              {r.regionCode ? `-${r.regionCode}` : ""} •{" "}
                              {toPercentString(r.rate)}%
                              {r.inclusive ? " (inclusive)" : ""}
                            </div>
                            {(r.startDate || r.endDate) && (
                              <div className="text-muted-foreground">
                                {r.startDate ? String(r.startDate).slice(0, 10) : "—"}{" "}
                                to{" "}
                                {r.endDate ? String(r.endDate).slice(0, 10) : "—"}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditRate(vat, r)}
                            >
                              <Edit3 size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRateDelete(r.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(vat)}
                  >
                    <Edit3 size={14} />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(vat.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-card p-6 rounded-xl w-[400px] space-y-4 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg">
                {editing ? "Edit VAT Class" : "New VAT Class"}
              </h2>
              <Button size="icon" variant="ghost" onClick={closeModal}>
                <X size={18} />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Code *</Label>
                <Input
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              <Button
                onClick={handleSubmit}
                className="w-full"
              >
                {editing ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RATE MODAL */}
      {rateModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4"
          onClick={closeRateModal}
        >
          <div
            className="bg-card p-6 rounded-xl w-[520px] space-y-4 border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg">
                {editingRate ? "Edit VAT Rate" : "New VAT Rate"}
              </h2>
              <Button size="icon" variant="ghost" onClick={closeRateModal}>
                <X size={18} />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Class: {rateClass?.name} ({rateClass?.code})
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Country Code *</Label>
                <Input
                  value={rateForm.countryCode}
                  onChange={(e) =>
                    setRateForm({ ...rateForm, countryCode: e.target.value })
                  }
                  placeholder="BD"
                />
              </div>

              <div>
                <Label>Region Code</Label>
                <Input
                  value={rateForm.regionCode}
                  onChange={(e) =>
                    setRateForm({ ...rateForm, regionCode: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Rate (%) *</Label>
                <Input
                  type="number"
                  value={rateForm.ratePercent}
                  onChange={(e) =>
                    setRateForm({ ...rateForm, ratePercent: e.target.value })
                  }
                  placeholder="7.5"
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  id="inclusive"
                  type="checkbox"
                  checked={rateForm.inclusive}
                  onChange={(e) =>
                    setRateForm({ ...rateForm, inclusive: e.target.checked })
                  }
                />
                <Label htmlFor="inclusive">Inclusive</Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={rateForm.startDate}
                  onChange={(e) =>
                    setRateForm({ ...rateForm, startDate: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={rateForm.endDate}
                  onChange={(e) =>
                    setRateForm({ ...rateForm, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            <Button onClick={handleRateSubmit} className="w-full">
              {editingRate ? "Update Rate" : "Create Rate"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
