"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Warehouse = { id: number; name: string; code: string };
type Supplier = { id: number; name: string; code: string };
type Variant = { id: number; sku: string; product?: { name: string } };
type Rfq = {
  id: number;
  rfqNumber: string;
  status: string;
  requestedAt: string;
  submissionDeadline: string | null;
  note: string | null;
  warehouse: Warehouse;
  items: Array<{
    id: number;
    quantityRequested: number;
    description: string | null;
    targetUnitCost: string | null;
    productVariant: { sku: string; product: { name: string } };
  }>;
  supplierInvites: Array<{ supplierId: number; supplier: Supplier; status: string }>;
  quotations: Array<{ id: number; supplierId: number; supplier: Supplier; total: string; currency: string }>;
  award: { purchaseOrderId: number | null; supplier: Supplier; supplierQuotationId: number } | null;
};

type DraftLine = {
  productVariantId: string;
  quantityRequested: string;
  targetUnitCost: string;
  description: string;
};

const emptyLine = (): DraftLine => ({
  productVariantId: "",
  quantityRequested: "1",
  targetUnitCost: "",
  description: "",
});

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((payload as { error?: string }).error || fallback);
  return payload as T;
}

export default function RfqPage() {
  const { data: session } = useSession();
  const permissions = Array.isArray((session?.user as any)?.permissions)
    ? ((session?.user as any).permissions as string[])
    : [];
  const canManage = permissions.includes("rfq.manage");
  const canApprove = permissions.includes("rfq.approve");
  const canConvertPo = permissions.includes("purchase_orders.manage");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [warehouseId, setWarehouseId] = useState("");
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  const [inviteSupplier, setInviteSupplier] = useState<Record<number, string>>({});
  const [quoteSupplier, setQuoteSupplier] = useState<Record<number, string>>({});
  const [quoteUnitCost, setQuoteUnitCost] = useState<Record<number, string>>({});
  const [quoteNote, setQuoteNote] = useState<Record<number, string>>({});
  const [awardQuoteId, setAwardQuoteId] = useState<Record<number, string>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [rfqRes, warehouseRes, variantRes, supplierRes] = await Promise.all([
        fetch("/api/scm/rfqs", { cache: "no-store" }),
        fetch("/api/warehouses", { cache: "no-store" }),
        fetch("/api/product-variants", { cache: "no-store" }),
        fetch("/api/scm/suppliers", { cache: "no-store" }),
      ]);
      const [rfqData, warehouseData, variantData] = await Promise.all([
        readJson<Rfq[]>(rfqRes, "Failed to load RFQs"),
        readJson<Warehouse[]>(warehouseRes, "Failed to load warehouses"),
        readJson<Variant[]>(variantRes, "Failed to load variants"),
      ]);
      const supplierData = supplierRes.ok ? await readJson<Supplier[]>(supplierRes, "Failed to load suppliers") : [];
      setRfqs(rfqData);
      setWarehouses(warehouseData);
      setVariants(variantData);
      setSuppliers(supplierData);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load RFQ data");
      setRfqs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rfqs.filter((rfq) => {
      if (status !== "ALL" && rfq.status !== status) return false;
      if (!q) return true;
      return (
        rfq.rfqNumber.toLowerCase().includes(q) ||
        rfq.warehouse.name.toLowerCase().includes(q) ||
        rfq.supplierInvites.some((item) => item.supplier.name.toLowerCase().includes(q))
      );
    });
  }, [rfqs, search, status]);

  const patchAction = async (rfqId: number, action: string, extra?: Record<string, unknown>) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/scm/rfqs/${rfqId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...(extra || {}) }),
      });
      await readJson(response, `Failed to ${action}`);
      toast.success(`RFQ ${action} done`);
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || `Failed to ${action}`);
    } finally {
      setSaving(false);
    }
  };

  const createRfq = async () => {
    const validLines = lines
      .map((line) => ({
        productVariantId: Number(line.productVariantId),
        quantityRequested: Number(line.quantityRequested),
        targetUnitCost: line.targetUnitCost ? Number(line.targetUnitCost) : null,
        description: line.description,
      }))
      .filter((line) => Number.isInteger(line.productVariantId) && line.productVariantId > 0 && Number.isInteger(line.quantityRequested) && line.quantityRequested > 0);

    if (!warehouseId || validLines.length === 0) {
      toast.error("Warehouse and valid RFQ lines are required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/scm/rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: Number(warehouseId),
          submissionDeadline: submissionDeadline || null,
          note,
          items: validLines,
        }),
      });
      await readJson(response, "Failed to create RFQ");
      toast.success("RFQ draft created");
      setWarehouseId("");
      setSubmissionDeadline("");
      setNote("");
      setLines([emptyLine()]);
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create RFQ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">RFQ Management</h1>
          <p className="text-sm text-muted-foreground">Create RFQ, invite suppliers, collect quotes, award, and convert to PO.</p>
        </div>
        <div className="flex gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search RFQ..." className="w-full md:w-72" />
          <Button variant="outline" onClick={() => void loadData()} disabled={loading}>Refresh</Button>
        </div>
      </div>

      {canManage ? (
        <Card>
          <CardHeader><CardTitle>Create RFQ Draft</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div><Label>Warehouse</Label><select className="w-full rounded-md border bg-background px-3 py-2" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}><option value="">Select warehouse</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}</select></div>
              <div><Label>Submission Deadline</Label><Input type="date" value={submissionDeadline} onChange={(e) => setSubmissionDeadline(e.target.value)} /></div>
              <div><Label>Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
            </div>
            {lines.map((line, index) => (
              <div key={index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[2fr_1fr_1fr_2fr_auto]">
                <select className="rounded-md border bg-background px-3 py-2" value={line.productVariantId} onChange={(e) => setLines((cur) => cur.map((item, i) => i === index ? { ...item, productVariantId: e.target.value } : item))}><option value="">Variant</option>{variants.map((v) => <option key={v.id} value={v.id}>{v.product?.name || "Variant"} ({v.sku})</option>)}</select>
                <Input type="number" min="1" value={line.quantityRequested} onChange={(e) => setLines((cur) => cur.map((item, i) => i === index ? { ...item, quantityRequested: e.target.value } : item))} />
                <Input type="number" min="0" step="0.01" placeholder="Target cost" value={line.targetUnitCost} onChange={(e) => setLines((cur) => cur.map((item, i) => i === index ? { ...item, targetUnitCost: e.target.value } : item))} />
                <Input placeholder="Description" value={line.description} onChange={(e) => setLines((cur) => cur.map((item, i) => i === index ? { ...item, description: e.target.value } : item))} />
                <Button variant="outline" disabled={lines.length === 1} onClick={() => setLines((cur) => cur.filter((_, i) => i !== index))}>Remove</Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setLines((cur) => [...cur, emptyLine()])}>Add Line</Button>
              <Button onClick={() => void createRfq()} disabled={saving}>{saving ? "Saving..." : "Create Draft"}</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>RFQ Register</CardTitle>
          <select className="w-full rounded-md border bg-background px-3 py-2 md:w-52" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ALL">All statuses</option><option value="DRAFT">DRAFT</option><option value="SUBMITTED">SUBMITTED</option><option value="CLOSED">CLOSED</option><option value="AWARDED">AWARDED</option><option value="CANCELLED">CANCELLED</option>
          </select>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? <p className="text-sm text-muted-foreground">Loading RFQs...</p> : visible.length === 0 ? <p className="text-sm text-muted-foreground">No RFQ found.</p> : visible.map((rfq) => (
            <div key={rfq.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div><div className="font-semibold">{rfq.rfqNumber}</div><div className="text-sm text-muted-foreground">{rfq.warehouse.name} • {rfq.status} • Invites {rfq.supplierInvites.length} • Quotes {rfq.quotations.length}</div></div>
                <div className="flex flex-wrap gap-2">
                  {canManage && rfq.status === "DRAFT" ? <Button size="sm" variant="outline" onClick={() => void patchAction(rfq.id, "submit")}>Submit</Button> : null}
                  {canManage && ["SUBMITTED", "AWARDED"].includes(rfq.status) ? <Button size="sm" variant="outline" onClick={() => void patchAction(rfq.id, "close")}>Close</Button> : null}
                  {canManage && ["DRAFT", "SUBMITTED", "CLOSED"].includes(rfq.status) ? <Button size="sm" variant="outline" onClick={() => void patchAction(rfq.id, "cancel")}>Cancel</Button> : null}
                  {canConvertPo && rfq.status === "AWARDED" && rfq.award && !rfq.award.purchaseOrderId ? <Button size="sm" onClick={() => void patchAction(rfq.id, "convert_to_po")}>Convert To PO</Button> : null}
                </div>
              </div>

              {canManage && ["DRAFT", "SUBMITTED"].includes(rfq.status) ? (
                <div className="flex gap-2">
                  <select className="rounded-md border bg-background px-3 py-2 text-sm" value={inviteSupplier[rfq.id] || ""} onChange={(e) => setInviteSupplier((cur) => ({ ...cur, [rfq.id]: e.target.value }))}>
                    <option value="">Invite supplier</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                  </select>
                  <Button variant="outline" size="sm" onClick={() => void patchAction(rfq.id, "invite_suppliers", { supplierIds: [Number(inviteSupplier[rfq.id] || 0)] })}>Invite</Button>
                </div>
              ) : null}

              {canManage && ["SUBMITTED", "CLOSED", "AWARDED"].includes(rfq.status) ? (
                <div className="grid gap-2 rounded-lg border p-3 md:grid-cols-5">
                  <select className="rounded-md border bg-background px-3 py-2 text-sm" value={quoteSupplier[rfq.id] || ""} onChange={(e) => setQuoteSupplier((cur) => ({ ...cur, [rfq.id]: e.target.value }))}>
                    <option value="">Quote supplier</option>
                    {(rfq.supplierInvites.length > 0 ? rfq.supplierInvites.map((x) => x.supplier) : suppliers).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                  </select>
                  <Input type="number" min="0" step="0.01" placeholder="Unit cost for all lines" value={quoteUnitCost[rfq.id] || ""} onChange={(e) => setQuoteUnitCost((cur) => ({ ...cur, [rfq.id]: e.target.value }))} />
                  <Input placeholder="Quotation note" value={quoteNote[rfq.id] || ""} onChange={(e) => setQuoteNote((cur) => ({ ...cur, [rfq.id]: e.target.value }))} />
                  <Button size="sm" onClick={() => void patchAction(rfq.id, "submit_quotation", { supplierId: Number(quoteSupplier[rfq.id] || 0), quotationNote: quoteNote[rfq.id] || "", taxTotal: 0, items: rfq.items.map((item) => ({ rfqItemId: item.id, quantityQuoted: item.quantityRequested, unitCost: Number(quoteUnitCost[rfq.id] || item.targetUnitCost || 0), description: item.description || "" })) })}>Submit Quotation</Button>
                </div>
              ) : null}

              {canApprove && rfq.quotations.length > 0 ? (
                <div className="flex gap-2">
                  <select className="rounded-md border bg-background px-3 py-2 text-sm" value={awardQuoteId[rfq.id] || ""} onChange={(e) => setAwardQuoteId((cur) => ({ ...cur, [rfq.id]: e.target.value }))}>
                    <option value="">Select quotation</option>
                    {rfq.quotations.map((q) => <option key={q.id} value={q.id}>{q.supplier.name} • {q.total} {q.currency}</option>)}
                  </select>
                  <Button size="sm" onClick={() => void patchAction(rfq.id, "award", { quotationId: Number(awardQuoteId[rfq.id] || 0) })}>Award</Button>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
