"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadFile } from "@/lib/upload-file";

type Warehouse = { id: number; name: string; code: string };
type Supplier = { id: number; name: string; code: string };
type SupplierCategory = { id: number; name: string; code: string };
type Variant = { id: number; sku: string; product?: { name: string } };
type PurchaseRequisition = {
  id: number;
  requisitionNumber: string;
  warehouseId: number;
  title: string | null;
  purpose: string | null;
  budgetCode: string | null;
  boqReference: string | null;
  specification: string | null;
};
type Rfq = {
  id: number;
  rfqNumber: string;
  status: string;
  requestedAt: string;
  submissionDeadline: string | null;
  isBlindReviewActive?: boolean;
  quotationSubmissionCount?: number;
  quotationsVisibleAt?: string | null;
  note: string | null;
  scopeOfWork?: string | null;
  termsAndConditions?: string | null;
  boqDetails?: string | null;
  technicalSpecifications?: string | null;
  evaluationCriteria?: string | null;
  resubmissionAllowed?: boolean;
  resubmissionRound?: number;
  warehouse: Warehouse;
  purchaseRequisition?: {
    id: number;
    requisitionNumber: string;
    status: string;
  } | null;
  categoryTargets?: Array<{
    id: number;
    supplierCategoryId: number;
    supplierCategory: SupplierCategory;
  }>;
  attachments?: Array<{
    id: number;
    label: string | null;
    fileUrl: string;
    fileName: string | null;
  }>;
  items: Array<{
    id: number;
    quantityRequested: number;
    description: string | null;
    targetUnitCost: string | null;
    productVariant: { sku: string; product: { name: string } };
  }>;
  supplierInvites: Array<{ supplierId: number; supplier: Supplier; status: string }>;
  quotations: Array<{
    id: number;
    supplierId: number;
    supplier: Supplier;
    total: string;
    currency: string;
    revisionNo?: number;
    quotedAt?: string;
    technicalProposal?: string | null;
    financialProposal?: string | null;
    note?: string | null;
    attachments?: Array<{
      id: number;
      proposalType: "TECHNICAL" | "FINANCIAL" | "SUPPORTING";
      label: string | null;
      fileUrl: string;
      fileName: string | null;
    }>;
  }>;
  award: { purchaseOrderId: number | null; supplier: Supplier; supplierQuotationId: number } | null;
};

type DraftLine = {
  productVariantId: string;
  quantityRequested: string;
  targetUnitCost: string;
  description: string;
};

type DraftAttachment = {
  file: File;
  label: string;
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

function fmtDate(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
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
  const [supplierCategories, setSupplierCategories] = useState<SupplierCategory[]>([]);
  const [approvedRequisitions, setApprovedRequisitions] = useState<PurchaseRequisition[]>([]);

  const [warehouseId, setWarehouseId] = useState("");
  const [purchaseRequisitionId, setPurchaseRequisitionId] = useState("");
  const [useRequisitionItems, setUseRequisitionItems] = useState(true);
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [note, setNote] = useState("");
  const [scopeOfWork, setScopeOfWork] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [boqDetails, setBoqDetails] = useState("");
  const [technicalSpecifications, setTechnicalSpecifications] = useState("");
  const [evaluationCriteria, setEvaluationCriteria] = useState(
    "Technical compliance, lead time, pricing, service capability",
  );
  const [resubmissionAllowed, setResubmissionAllowed] = useState(true);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);

  const [inviteSupplier, setInviteSupplier] = useState<Record<number, string>>({});
  const [inviteCategory, setInviteCategory] = useState<Record<number, string>>({});
  const [quoteSupplier, setQuoteSupplier] = useState<Record<number, string>>({});
  const [quoteUnitCost, setQuoteUnitCost] = useState<Record<number, string>>({});
  const [quoteNote, setQuoteNote] = useState<Record<number, string>>({});
  const [awardQuoteId, setAwardQuoteId] = useState<Record<number, string>>({});
  const [resubmissionReason, setResubmissionReason] = useState<Record<number, string>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [rfqRes, warehouseRes, variantRes, supplierRes, categoryRes, requisitionRes] =
        await Promise.all([
        fetch("/api/scm/rfqs", { cache: "no-store" }),
        fetch("/api/warehouses", { cache: "no-store" }),
        fetch("/api/product-variants", { cache: "no-store" }),
        fetch("/api/scm/suppliers", { cache: "no-store" }),
        fetch("/api/scm/supplier-categories?active=true", { cache: "no-store" }),
        fetch("/api/scm/purchase-requisitions?status=APPROVED", { cache: "no-store" }),
      ]);
      const [rfqData, warehouseData, variantData] = await Promise.all([
        readJson<Rfq[]>(rfqRes, "Failed to load RFQs"),
        readJson<Warehouse[]>(warehouseRes, "Failed to load warehouses"),
        readJson<Variant[]>(variantRes, "Failed to load variants"),
      ]);
      const supplierData = supplierRes.ok
        ? await readJson<Supplier[]>(supplierRes, "Failed to load suppliers")
        : [];
      const categoryData = categoryRes.ok
        ? await readJson<SupplierCategory[]>(
            categoryRes,
            "Failed to load supplier categories",
          )
        : [];
      const requisitionData = requisitionRes.ok
        ? await readJson<PurchaseRequisition[]>(
            requisitionRes,
            "Failed to load approved MRFs",
          )
        : [];
      setRfqs(rfqData);
      setWarehouses(warehouseData);
      setVariants(variantData);
      setSuppliers(supplierData);
      setSupplierCategories(categoryData);
      setApprovedRequisitions(requisitionData);
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

  const selectedRequisition = useMemo(
    () =>
      approvedRequisitions.find(
        (requisition) => requisition.id === Number(purchaseRequisitionId),
      ) ?? null,
    [approvedRequisitions, purchaseRequisitionId],
  );

  useEffect(() => {
    if (!selectedRequisition) return;
    setWarehouseId(String(selectedRequisition.warehouseId));
    setScopeOfWork((current) => current || selectedRequisition.purpose || "");
    setBoqDetails((current) => current || selectedRequisition.boqReference || "");
    setTechnicalSpecifications(
      (current) => current || selectedRequisition.specification || "",
    );
  }, [selectedRequisition]);

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
    const shouldSendManualItems = !purchaseRequisitionId || !useRequisitionItems;
    const validLines = lines
      .map((line) => ({
        productVariantId: Number(line.productVariantId),
        quantityRequested: Number(line.quantityRequested),
        targetUnitCost: line.targetUnitCost ? Number(line.targetUnitCost) : null,
        description: line.description,
      }))
      .filter((line) => Number.isInteger(line.productVariantId) && line.productVariantId > 0 && Number.isInteger(line.quantityRequested) && line.quantityRequested > 0);

    if (!warehouseId) {
      toast.error("Warehouse is required");
      return;
    }
    if (shouldSendManualItems && validLines.length === 0) {
      toast.error("MRF auto-pull off হলে valid RFQ lines required");
      return;
    }

    setSaving(true);
    const uploadedAttachments: Array<{
      fileUrl: string;
      fileName: string | null;
      mimeType: string | null;
      fileSize: number | null;
      label: string;
    }> = [];
    try {
      for (const attachment of attachments) {
        const fileUrl = await uploadFile(attachment.file);
        uploadedAttachments.push({
          fileUrl,
          fileName: attachment.file.name,
          mimeType: attachment.file.type || null,
          fileSize: attachment.file.size,
          label: attachment.label.trim(),
        });
      }

      const response = await fetch("/api/scm/rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: Number(warehouseId),
          purchaseRequisitionId: purchaseRequisitionId ? Number(purchaseRequisitionId) : null,
          submissionDeadline: submissionDeadline || null,
          note,
          scopeOfWork,
          termsAndConditions,
          boqDetails,
          technicalSpecifications,
          evaluationCriteria,
          resubmissionAllowed,
          categoryIds: selectedCategoryIds.map((value) => Number(value)),
          attachments: uploadedAttachments,
          items: shouldSendManualItems ? validLines : [],
        }),
      });
      await readJson(response, "Failed to create RFQ");
      toast.success("RFQ draft created");
      setWarehouseId("");
      setPurchaseRequisitionId("");
      setUseRequisitionItems(true);
      setSubmissionDeadline("");
      setNote("");
      setScopeOfWork("");
      setTermsAndConditions("");
      setBoqDetails("");
      setTechnicalSpecifications("");
      setEvaluationCriteria("Technical compliance, lead time, pricing, service capability");
      setResubmissionAllowed(true);
      setSelectedCategoryIds([]);
      setAttachments([]);
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
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Approved MRF</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={purchaseRequisitionId}
                  onChange={(e) => setPurchaseRequisitionId(e.target.value)}
                >
                  <option value="">Select approved MRF</option>
                  {approvedRequisitions.map((requisition) => (
                    <option key={requisition.id} value={requisition.id}>
                      {requisition.requisitionNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div><Label>Warehouse</Label><select className="w-full rounded-md border bg-background px-3 py-2" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}><option value="">Select warehouse</option>{warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}</select></div>
              <div><Label>Submission Deadline</Label><Input type="date" value={submissionDeadline} onChange={(e) => setSubmissionDeadline(e.target.value)} /></div>
            </div>

            {purchaseRequisitionId ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useRequisitionItems}
                  onChange={(e) => setUseRequisitionItems(e.target.checked)}
                />
                Auto-pull items from approved MRF
              </label>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div><Label>Scope</Label><Textarea rows={3} value={scopeOfWork} onChange={(e) => setScopeOfWork(e.target.value)} /></div>
              <div><Label>Terms & Conditions</Label><Textarea rows={3} value={termsAndConditions} onChange={(e) => setTermsAndConditions(e.target.value)} /></div>
              <div><Label>BoQ / Reference</Label><Textarea rows={2} value={boqDetails} onChange={(e) => setBoqDetails(e.target.value)} /></div>
              <div><Label>Technical Specifications</Label><Textarea rows={2} value={technicalSpecifications} onChange={(e) => setTechnicalSpecifications(e.target.value)} /></div>
              <div><Label>Evaluation Criteria</Label><Textarea rows={2} value={evaluationCriteria} onChange={(e) => setEvaluationCriteria(e.target.value)} /></div>
              <div><Label>Note</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
            </div>

            <div className="space-y-2">
              <Label>Vendor Categories</Label>
              <div className="grid gap-2 md:grid-cols-3">
                {supplierCategories.map((category) => {
                  const checked = selectedCategoryIds.includes(String(category.id));
                  return (
                    <label key={category.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedCategoryIds((current) =>
                            checked
                              ? current.filter((value) => value !== String(category.id))
                              : [...current, String(category.id)],
                          )
                        }
                      />
                      {category.name} ({category.code})
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>RFQ Attachments</Label>
              <Input
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setAttachments((current) => [...current, { file, label: "" }]);
                  event.target.value = "";
                }}
              />
              {attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map((attachment, index) => (
                    <div key={`${attachment.file.name}-${index}`} className="grid gap-2 rounded-md border p-2 md:grid-cols-[2fr_2fr_auto]">
                      <div className="text-sm">{attachment.file.name}</div>
                      <Input
                        placeholder="Label (optional)"
                        value={attachment.label}
                        onChange={(event) =>
                          setAttachments((current) =>
                            current.map((item, i) =>
                              i === index ? { ...item, label: event.target.value } : item,
                            ),
                          )
                        }
                      />
                      <Button variant="outline" size="sm" onClick={() => setAttachments((current) => current.filter((_, i) => i !== index))}>Remove</Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {!useRequisitionItems || !purchaseRequisitionId ? (
              <>
                {lines.map((line, index) => (
                  <div key={index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[2fr_1fr_1fr_2fr_auto]">
                    <select className="rounded-md border bg-background px-3 py-2" value={line.productVariantId} onChange={(e) => setLines((cur) => cur.map((item, i) => i === index ? { ...item, productVariantId: e.target.value } : item))}><option value="">Variant</option>{variants.map((v) => <option key={v.id} value={v.id}>{v.product?.name || "Variant"} ({v.sku})</option>)}</select>
                    <Input type="number" min="1" value={line.quantityRequested} onChange={(e) => setLines((cur) => cur.map((item, i) => i === index ? { ...item, quantityRequested: e.target.value } : item))} />
                    <Input type="number" min="0" step="0.01" placeholder="Target cost" value={line.targetUnitCost} onChange={(e) => setLines((cur) => cur.map((item, i) => i === index ? { ...item, targetUnitCost: e.target.value } : item))} />
                    <Input placeholder="Description" value={line.description} onChange={(e) => setLines((cur) => cur.map((item, i) => i === index ? { ...item, description: e.target.value } : item))} />
                    <Button variant="outline" disabled={lines.length === 1} onClick={() => setLines((cur) => cur.filter((_, i) => i !== index))}>Remove</Button>
                  </div>
                ))}
              </>
            ) : null}

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={resubmissionAllowed} onChange={(e) => setResubmissionAllowed(e.target.checked)} />
              Allow proposal resubmission
            </label>

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
                <div>
                  <div className="font-semibold">{rfq.rfqNumber}</div>
                  <div className="text-sm text-muted-foreground">
                    {rfq.warehouse.name} • {rfq.status} • Invites {rfq.supplierInvites.length} • Quotes {rfq.quotationSubmissionCount ?? rfq.quotations.length}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    MRF: {rfq.purchaseRequisition?.requisitionNumber || "N/A"} • Round: {rfq.resubmissionRound ?? 0}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canManage && rfq.status === "DRAFT" ? <Button size="sm" variant="outline" onClick={() => void patchAction(rfq.id, "submit")}>Submit</Button> : null}
                  {canManage && ["SUBMITTED", "AWARDED"].includes(rfq.status) ? <Button size="sm" variant="outline" onClick={() => void patchAction(rfq.id, "close")}>Close</Button> : null}
                  {canManage && ["DRAFT", "SUBMITTED", "CLOSED"].includes(rfq.status) ? <Button size="sm" variant="outline" onClick={() => void patchAction(rfq.id, "cancel")}>Cancel</Button> : null}
                  {canConvertPo && rfq.status === "AWARDED" && rfq.award && !rfq.award.purchaseOrderId ? <Button size="sm" onClick={() => void patchAction(rfq.id, "convert_to_po")}>Convert To PO</Button> : null}
                </div>
              </div>

              {(rfq.categoryTargets?.length || 0) > 0 ? (
                <div className="text-xs text-muted-foreground">
                  Categories: {(rfq.categoryTargets || []).map((target) => `${target.supplierCategory.name} (${target.supplierCategory.code})`).join(", ")}
                </div>
              ) : null}
              {(rfq.attachments?.length || 0) > 0 ? (
                <div className="space-y-1 text-xs">
                  {(rfq.attachments || []).map((attachment) => (
                    <a
                      key={attachment.id}
                      href={attachment.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-primary underline"
                    >
                      {attachment.label || attachment.fileName || "Attachment"}
                    </a>
                  ))}
                </div>
              ) : null}
              {rfq.isBlindReviewActive ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  Blind review active. Technical/financial proposal details are hidden until{" "}
                  {fmtDate(rfq.quotationsVisibleAt || rfq.submissionDeadline)}.
                </div>
              ) : null}

              {canManage && ["DRAFT", "SUBMITTED"].includes(rfq.status) ? (
                <div className="flex gap-2">
                  <select className="rounded-md border bg-background px-3 py-2 text-sm" value={inviteSupplier[rfq.id] || ""} onChange={(e) => setInviteSupplier((cur) => ({ ...cur, [rfq.id]: e.target.value }))}>
                    <option value="">Invite supplier</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                  </select>
                  <select className="rounded-md border bg-background px-3 py-2 text-sm" value={inviteCategory[rfq.id] || ""} onChange={(e) => setInviteCategory((cur) => ({ ...cur, [rfq.id]: e.target.value }))}>
                    <option value="">Invite by category</option>{supplierCategories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
                  <Button variant="outline" size="sm" onClick={() => void patchAction(rfq.id, "invite_suppliers", { supplierIds: inviteSupplier[rfq.id] ? [Number(inviteSupplier[rfq.id])] : [], categoryIds: inviteCategory[rfq.id] ? [Number(inviteCategory[rfq.id])] : undefined })}>Invite</Button>
                </div>
              ) : null}

              {canManage && !rfq.isBlindReviewActive && ["SUBMITTED", "CLOSED", "AWARDED"].includes(rfq.status) ? (
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

              {!rfq.isBlindReviewActive && rfq.quotations.length > 0 ? (
                <div className="space-y-2 rounded-lg border p-3">
                  <div className="text-xs font-medium text-muted-foreground">
                    Evaluation View (post-deadline unlock)
                  </div>
                  <div className="space-y-2">
                    {rfq.quotations.map((q) => (
                      <div key={q.id} className="rounded-md border p-2 text-xs">
                        <div className="font-medium">
                          {q.supplier.name} ({q.supplier.code}) • {q.total} {q.currency}
                          {q.revisionNo ? ` • Rev ${q.revisionNo}` : ""}
                        </div>
                        {q.technicalProposal ? (
                          <div className="text-muted-foreground">
                            Technical: {q.technicalProposal}
                          </div>
                        ) : null}
                        {q.financialProposal ? (
                          <div className="text-muted-foreground">
                            Financial: {q.financialProposal}
                          </div>
                        ) : null}
                        {q.note ? (
                          <div className="text-muted-foreground">Note: {q.note}</div>
                        ) : null}
                        {(q.attachments?.length || 0) > 0 ? (
                          <div className="mt-1 space-y-1">
                            {q.attachments?.map((attachment) => (
                              <a
                                key={attachment.id}
                                href={attachment.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block text-primary underline"
                              >
                                [{attachment.proposalType}]{" "}
                                {attachment.label || attachment.fileName || "Attachment"}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {canApprove && !rfq.isBlindReviewActive && rfq.quotations.length > 0 ? (
                <div className="flex gap-2">
                  <select className="rounded-md border bg-background px-3 py-2 text-sm" value={awardQuoteId[rfq.id] || ""} onChange={(e) => setAwardQuoteId((cur) => ({ ...cur, [rfq.id]: e.target.value }))}>
                    <option value="">Select quotation</option>
                    {rfq.quotations.map((q) => <option key={q.id} value={q.id}>{q.supplier.name} • {q.total} {q.currency}{q.revisionNo ? ` • Rev ${q.revisionNo}` : ""}</option>)}
                  </select>
                  <Button size="sm" onClick={() => void patchAction(rfq.id, "award", { quotationId: Number(awardQuoteId[rfq.id] || 0) })}>Award</Button>
                </div>
              ) : null}

              {canManage && ["SUBMITTED", "CLOSED", "AWARDED"].includes(rfq.status) && (rfq.resubmissionAllowed ?? true) ? (
                <div className="grid gap-2 rounded-lg border p-3 md:grid-cols-[3fr_auto]">
                  <Input
                    placeholder="Resubmission reason"
                    value={resubmissionReason[rfq.id] || ""}
                    onChange={(e) =>
                      setResubmissionReason((cur) => ({ ...cur, [rfq.id]: e.target.value }))
                    }
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      void patchAction(rfq.id, "request_resubmission", {
                        resubmissionReason: resubmissionReason[rfq.id] || "",
                      })
                    }
                  >
                    Request Resubmission
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
