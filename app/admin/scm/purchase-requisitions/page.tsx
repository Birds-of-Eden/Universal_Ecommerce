"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { Paperclip, Plus, RefreshCw, Trash2 } from "lucide-react";
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
import { uploadFile } from "@/lib/upload-file";

type Warehouse = {
  id: number;
  name: string;
  code: string;
};

type Supplier = {
  id: number;
  name: string;
  code: string;
};

type Variant = {
  id: number;
  sku: string;
  productId: number;
  stock: number;
  product?: {
    id: number;
    name: string;
  };
};

type PurchaseRequisition = {
  id: number;
  requisitionNumber: string;
  status: string;
  title: string | null;
  purpose: string | null;
  budgetCode: string | null;
  boqReference: string | null;
  specification: string | null;
  planningNote: string | null;
  estimatedAmount: string | null;
  endorsementRequiredCount: number;
  requestedAt: string;
  neededBy: string | null;
  budgetClearedAt: string | null;
  endorsedAt: string | null;
  routedToProcurementAt: string | null;
  assignedProcurementOfficerId: string | null;
  assignedProcurementOfficer: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  note: string | null;
  attachments: Array<{
    id: number;
    fileUrl: string;
    fileName: string;
    mimeType: string | null;
    fileSize: number | null;
    note: string | null;
    createdAt: string;
  }>;
  approvalEvents: Array<{
    id: number;
    stage: string;
    decision: string;
    note: string | null;
    actedAt: string;
    actedBy: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  }>;
  warehouse: Warehouse;
  items: Array<{
    id: number;
    description: string | null;
    quantityRequested: number;
    quantityApproved: number | null;
    productVariant: {
      id: number;
      sku: string;
      product: {
        id: number;
        name: string;
      };
    };
  }>;
  purchaseOrders: Array<{
    id: number;
    poNumber: string;
    status: string;
    supplier: Supplier;
  }>;
};

type DraftItem = {
  productVariantId: string;
  quantityRequested: string;
  description: string;
};

type RequisitionAttachmentDraft = {
  file?: File;
  fileUrl?: string;
  fileName: string;
  mimeType?: string;
  fileSize?: number;
  note?: string;
};

type ConversionForm = {
  supplierId: string;
  expectedAt: string;
  notes: string;
  unitCosts: Record<number, string>;
};

const emptyLine = (): DraftItem => ({
  productVariantId: "",
  quantityRequested: "1",
  description: "",
});

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || fallbackMessage);
  }
  return data as T;
}

export default function PurchaseRequisitionsPage() {
  const { data: session } = useSession();
  const permissions = Array.isArray((session?.user as any)?.permissions)
    ? ((session?.user as any).permissions as string[])
    : [];

  const canManage = permissions.includes("purchase_requisitions.manage");
  const canApprove = permissions.includes("purchase_requisitions.approve");
  const canBudgetClear = permissions.includes("mrf.budget_clear");
  const canEndorse = permissions.includes("mrf.endorse");
  const canFinalApprove = permissions.includes("mrf.final_approve");
  const canConvert = permissions.includes("purchase_orders.manage");

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [warehouseId, setWarehouseId] = useState("");
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [budgetCode, setBudgetCode] = useState("");
  const [boqReference, setBoqReference] = useState("");
  const [specification, setSpecification] = useState("");
  const [planningNote, setPlanningNote] = useState("");
  const [estimatedAmount, setEstimatedAmount] = useState("");
  const [endorsementRequiredCount, setEndorsementRequiredCount] = useState("1");
  const [neededBy, setNeededBy] = useState("");
  const [note, setNote] = useState("");
  const [attachments, setAttachments] = useState<RequisitionAttachmentDraft[]>([]);
  const [items, setItems] = useState<DraftItem[]>([emptyLine()]);
  const [conversionForms, setConversionForms] = useState<Record<number, ConversionForm>>({});

  const loadPageData = async () => {
    try {
      setLoading(true);
      const [requisitionsRes, warehousesRes, variantsRes, suppliersRes] = await Promise.all([
        fetch("/api/scm/purchase-requisitions", { cache: "no-store" }),
        fetch("/api/warehouses", { cache: "no-store" }),
        fetch("/api/product-variants", { cache: "no-store" }),
        fetch("/api/scm/suppliers", { cache: "no-store" }),
      ]);

      const [requisitionData, warehouseData, variantData, supplierData] = await Promise.all([
        readJson<PurchaseRequisition[]>(requisitionsRes, "Failed to load purchase requisitions"),
        readJson<Warehouse[]>(warehousesRes, "Failed to load warehouses"),
        readJson<Variant[]>(variantsRes, "Failed to load variants"),
        suppliersRes.ok
          ? readJson<Supplier[]>(suppliersRes, "Failed to load suppliers")
          : Promise.resolve([]),
      ]);

      setRequisitions(Array.isArray(requisitionData) ? requisitionData : []);
      setWarehouses(Array.isArray(warehouseData) ? warehouseData : []);
      setVariants(Array.isArray(variantData) ? variantData : []);
      setSuppliers(Array.isArray(supplierData) ? supplierData : []);
      setConversionForms((current) => {
        const next = { ...current };
        for (const requisition of Array.isArray(requisitionData) ? requisitionData : []) {
          if (!next[requisition.id]) {
            next[requisition.id] = {
              supplierId: "",
              expectedAt: requisition.neededBy ? requisition.neededBy.slice(0, 10) : "",
              notes: requisition.note || "",
              unitCosts: Object.fromEntries(
                requisition.items.map((item) => [item.id, ""]),
              ),
            };
          }
        }
        return next;
      });
    } catch (error: any) {
      toast.error(error?.message || "Failed to load requisition data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPageData();
  }, []);

  const visibleRequisitions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requisitions.filter((requisition) => {
      const matchesStatus =
        statusFilter === "ALL" || requisition.status === statusFilter;
      if (!matchesStatus) return false;
      if (!query) return true;
      return (
        requisition.requisitionNumber.toLowerCase().includes(query) ||
        requisition.warehouse.name.toLowerCase().includes(query)
      );
    });
  }, [requisitions, search, statusFilter]);

  const resetForm = () => {
    setWarehouseId("");
    setTitle("");
    setPurpose("");
    setBudgetCode("");
    setBoqReference("");
    setSpecification("");
    setPlanningNote("");
    setEstimatedAmount("");
    setEndorsementRequiredCount("1");
    setNeededBy("");
    setNote("");
    setAttachments([]);
    setItems([emptyLine()]);
  };

  const updateItem = (
    index: number,
    key: keyof DraftItem,
    value: string,
  ) => {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    );
  };

  const addAttachmentRows = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next = [...files].slice(0, 20).map((file) => ({
      file,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      note: "",
    }));
    setAttachments((prev) => [...prev, ...next].slice(0, 20));
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateAttachmentNote = (index: number, value: string) => {
    setAttachments((prev) =>
      prev.map((attachment, itemIndex) =>
        itemIndex === index ? { ...attachment, note: value } : attachment,
      ),
    );
  };

  const deleteLocalUpload = (fileUrl: string) => {
    if (!fileUrl.startsWith("/upload/")) return Promise.resolve();
    return fetch(
      `/api/delete-file?path=${encodeURIComponent(fileUrl.replace(/^\//, ""))}`,
      { method: "DELETE" },
    ).catch(() => undefined);
  };

  const createRequisition = async () => {
    if (!warehouseId) {
      toast.error("Warehouse is required");
      return;
    }

    const uploadedFileUrls: string[] = [];
    try {
      setSaving(true);
      const uploadedAttachments = [];
      for (const attachment of attachments) {
        if (!attachment.file) continue;
        const fileUrl = await uploadFile(attachment.file);
        uploadedFileUrls.push(fileUrl);
        uploadedAttachments.push({
          fileUrl,
          fileName: attachment.fileName || attachment.file.name,
          mimeType: attachment.mimeType || attachment.file.type || null,
          fileSize: attachment.fileSize || attachment.file.size || null,
          note: attachment.note?.trim() || null,
        });
      }

      const response = await fetch("/api/scm/purchase-requisitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: Number(warehouseId),
          title,
          purpose,
          budgetCode,
          boqReference,
          specification,
          planningNote,
          estimatedAmount: estimatedAmount || null,
          endorsementRequiredCount: Number(endorsementRequiredCount || 1),
          neededBy: neededBy || null,
          note,
          attachments: uploadedAttachments,
          items: items.map((item) => ({
            productVariantId: Number(item.productVariantId),
            quantityRequested: Number(item.quantityRequested),
            description: item.description,
          })),
        }),
      });
      await readJson(response, "Failed to create purchase requisition");
      toast.success("Purchase requisition created");
      resetForm();
      await loadPageData();
    } catch (error: any) {
      await Promise.all(uploadedFileUrls.map((fileUrl) => deleteLocalUpload(fileUrl)));
      toast.error(error?.message || "Failed to create purchase requisition");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (requisitionId: number, action: string) => {
    try {
      setSaving(true);
      const response = await fetch(`/api/scm/purchase-requisitions/${requisitionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await readJson(response, `Failed to ${action} purchase requisition`);
      toast.success(`Purchase requisition action completed: ${action}`);
      await loadPageData();
    } catch (error: any) {
      toast.error(error?.message || `Failed to ${action} purchase requisition`);
    } finally {
      setSaving(false);
    }
  };

  const updateConversionForm = (
    requisitionId: number,
    updater: (form: ConversionForm) => ConversionForm,
  ) => {
    setConversionForms((current) => ({
      ...current,
      [requisitionId]: updater(
        current[requisitionId] || {
          supplierId: "",
          expectedAt: "",
          notes: "",
          unitCosts: {},
        },
      ),
    }));
  };

  const convertToPurchaseOrder = async (requisition: PurchaseRequisition) => {
    const form = conversionForms[requisition.id];
    if (!form?.supplierId) {
      toast.error("Supplier is required for PO conversion");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/scm/purchase-requisitions/${requisition.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "convert",
          supplierId: Number(form.supplierId),
          expectedAt: form.expectedAt || null,
          notes: form.notes,
          unitCosts: requisition.items.map((item) => ({
            itemId: item.id,
            unitCost: Number(form.unitCosts[item.id]),
          })),
        }),
      });
      await readJson(response, "Failed to convert requisition to purchase order");
      toast.success("Purchase order created from requisition");
      await loadPageData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to convert requisition");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchase Requisitions</h1>
          <p className="text-sm text-muted-foreground">
            Capture internal warehouse demand and route it for procurement approval.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search requisition number or warehouse..."
            className="w-full md:w-80"
          />
          <Button variant="outline" onClick={() => void loadPageData()} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Purchase Requisition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-dashed p-4">
              <div className="mb-2 text-sm font-semibold">Project Procurement Planning</div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>MRF Title</Label>
                  <Input value={title} onChange={(event) => setTitle(event.target.value)} />
                </div>
                <div>
                  <Label>Warehouse</Label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2"
                    value={warehouseId}
                    onChange={(event) => setWarehouseId(event.target.value)}
                  >
                    <option value="">Select warehouse</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.name} ({warehouse.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Purpose</Label>
                  <Input value={purpose} onChange={(event) => setPurpose(event.target.value)} />
                </div>
                <div>
                  <Label>Needed By</Label>
                  <Input
                    type="date"
                    value={neededBy}
                    onChange={(event) => setNeededBy(event.target.value)}
                  />
                </div>
                <div>
                  <Label>Budget Code</Label>
                  <Input
                    value={budgetCode}
                    onChange={(event) => setBudgetCode(event.target.value)}
                  />
                </div>
                <div>
                  <Label>BOQ Reference</Label>
                  <Input
                    value={boqReference}
                    onChange={(event) => setBoqReference(event.target.value)}
                  />
                </div>
                <div>
                  <Label>Estimated Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={estimatedAmount}
                    onChange={(event) => setEstimatedAmount(event.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Required Endorsements</Label>
                  <Input
                    type="number"
                    min="1"
                    value={endorsementRequiredCount}
                    onChange={(event) => setEndorsementRequiredCount(event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Specification</Label>
                <Textarea
                  rows={4}
                  value={specification}
                  onChange={(event) => setSpecification(event.target.value)}
                  placeholder="Technical specification / quality requirements..."
                />
              </div>
              <div>
                <Label>Planning Note</Label>
                <Textarea
                  rows={4}
                  value={planningNote}
                  onChange={(event) => setPlanningNote(event.target.value)}
                  placeholder="Procurement planning assumptions..."
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setItems((prev) => [...prev, emptyLine()])}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Line
                </Button>
              </div>

              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-lg border p-3 md:grid-cols-[2fr_1fr_2fr_auto]"
                >
                  <div>
                    <Label>Variant</Label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2"
                      value={item.productVariantId}
                      onChange={(event) =>
                        updateItem(index, "productVariantId", event.target.value)
                      }
                    >
                      <option value="">Select variant</option>
                      {variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.product?.name || "Variant"} ({variant.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantityRequested}
                      onChange={(event) =>
                        updateItem(index, "quantityRequested", event.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(event) =>
                        updateItem(index, "description", event.target.value)
                      }
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setItems((prev) =>
                          prev.length === 1
                            ? prev
                            : prev.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Supporting Documents</Label>
                <div className="text-xs text-muted-foreground">Up to 20 files</div>
              </div>
              <Input
                type="file"
                multiple
                onChange={(event) => addAttachmentRows(event.target.files)}
              />
              {attachments.length > 0 ? (
                <div className="space-y-2">
                  {attachments.map((attachment, index) => (
                    <div
                      key={`${attachment.fileName}-${index}`}
                      className="grid gap-2 rounded-md border p-2 md:grid-cols-[2fr_3fr_auto]"
                    >
                      <div className="text-sm text-muted-foreground">
                        {attachment.fileName}
                      </div>
                      <Input
                        placeholder="Attachment note (optional)"
                        value={attachment.note || ""}
                        onChange={(event) =>
                          updateAttachmentNote(index, event.target.value)
                        }
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetForm} disabled={saving}>
                Clear
              </Button>
              <Button onClick={() => void createRequisition()} disabled={saving}>
                {saving ? "Saving..." : "Create Draft"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Requisition Register</CardTitle>
          <select
            className="w-full rounded-md border bg-background px-3 py-2 md:w-56"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="BUDGET_CLEARED">Budget Cleared</option>
            <option value="ENDORSED">Endorsed</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CONVERTED">Converted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading purchase requisitions...</p>
          ) : visibleRequisitions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchase requisitions found.</p>
          ) : (
            <div className="space-y-4">
              {visibleRequisitions.map((requisition) => {
                const conversionForm = conversionForms[requisition.id] || {
                  supplierId: "",
                  expectedAt: requisition.neededBy ? requisition.neededBy.slice(0, 10) : "",
                  notes: requisition.note || "",
                  unitCosts: {},
                };

                return (
                  <div key={requisition.id} className="rounded-lg border p-4">
	                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
	                      <div>
	                        <div className="text-lg font-semibold">{requisition.requisitionNumber}</div>
	                        {requisition.title ? (
	                          <div className="text-sm font-medium">{requisition.title}</div>
	                        ) : null}
	                        <div className="text-sm text-muted-foreground">
	                          {requisition.warehouse.name}
	                        </div>
	                        <div className="text-xs text-muted-foreground">
	                          {new Date(requisition.requestedAt).toLocaleDateString()} • {requisition.status}
	                        </div>
	                      </div>
	                      <div className="flex flex-wrap gap-2">
	                        {requisition.status === "DRAFT" && canManage ? (
	                          <Button
	                            variant="outline"
	                            size="sm"
	                            onClick={() => void changeStatus(requisition.id, "submit")}
	                          >
	                            Submit
	                          </Button>
	                        ) : null}
	                        {requisition.status === "SUBMITTED" && canBudgetClear ? (
	                          <Button
	                            variant="outline"
	                            size="sm"
	                            onClick={() => void changeStatus(requisition.id, "budget_clear")}
	                          >
	                            Budget Clear
	                          </Button>
	                        ) : null}
	                        {requisition.status === "BUDGET_CLEARED" && canEndorse ? (
	                          <Button
	                            variant="outline"
	                            size="sm"
	                            onClick={() => void changeStatus(requisition.id, "endorse")}
	                          >
	                            Endorse
	                          </Button>
	                        ) : null}
	                        {requisition.status === "ENDORSED" && (canFinalApprove || canApprove) ? (
	                          <>
	                            <Button
	                              variant="outline"
	                              size="sm"
	                              onClick={() => void changeStatus(requisition.id, "final_approve")}
	                            >
	                              Final Approve
	                            </Button>
	                            <Button
	                              variant="outline"
	                              size="sm"
	                              onClick={() => void changeStatus(requisition.id, "reject")}
                            >
                              Reject
                            </Button>
	                          </>
	                        ) : null}
	                        {["SUBMITTED", "BUDGET_CLEARED"].includes(requisition.status) &&
	                        (canBudgetClear || canEndorse || canFinalApprove || canApprove) ? (
	                          <Button
	                            variant="outline"
	                            size="sm"
	                            onClick={() => void changeStatus(requisition.id, "reject")}
	                          >
	                            Reject
	                          </Button>
	                        ) : null}
	                        {["DRAFT", "SUBMITTED", "BUDGET_CLEARED", "ENDORSED", "APPROVED"].includes(requisition.status) && canManage ? (
	                          <Button
	                            variant="outline"
	                            size="sm"
	                            onClick={() => void changeStatus(requisition.id, "cancel")}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
	                    </div>

	                    <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
	                      <div>Purpose: {requisition.purpose || "-"}</div>
	                      <div>Budget Code: {requisition.budgetCode || "-"}</div>
	                      <div>BOQ: {requisition.boqReference || "-"}</div>
	                      <div>
	                        Estimated Amount: {requisition.estimatedAmount || "0.00"}
	                      </div>
	                      <div>
	                        Endorsements Required: {requisition.endorsementRequiredCount}
	                      </div>
	                      <div>
	                        Endorsements Done: {
	                          requisition.approvalEvents.filter((event) => event.stage === "ENDORSEMENT").length
	                        }
	                      </div>
	                      <div className="md:col-span-3">
	                        Assigned Procurement Officer: {" "}
	                        {requisition.assignedProcurementOfficer?.name ||
	                          requisition.assignedProcurementOfficer?.email ||
	                          "-"}
	                      </div>
	                    </div>

	                    {requisition.specification ? (
	                      <p className="mt-3 text-sm text-muted-foreground">
	                        Specification: {requisition.specification}
	                      </p>
	                    ) : null}

	                    {requisition.attachments.length > 0 ? (
	                      <div className="mt-3 rounded-md border p-3">
	                        <div className="mb-2 text-sm font-medium">Supporting Documents</div>
	                        <div className="space-y-1 text-sm">
	                          {requisition.attachments.map((attachment) => (
	                            <div key={attachment.id} className="flex items-center gap-2">
	                              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
	                              <a
	                                href={attachment.fileUrl}
	                                target="_blank"
	                                rel="noreferrer"
	                                className="underline"
	                              >
	                                {attachment.fileName}
	                              </a>
	                              {attachment.note ? (
	                                <span className="text-xs text-muted-foreground">
	                                  ({attachment.note})
	                                </span>
	                              ) : null}
	                            </div>
	                          ))}
	                        </div>
	                      </div>
	                    ) : null}

	                    {requisition.note ? (
	                      <p className="mt-3 text-sm text-muted-foreground">{requisition.note}</p>
	                    ) : null}

                    <div className="mt-4 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Requested</TableHead>
                            <TableHead>Approved</TableHead>
                            {requisition.status === "APPROVED" && canConvert ? (
                              <TableHead>PO Unit Cost</TableHead>
                            ) : null}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {requisition.items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="font-medium">{item.productVariant.product.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {item.productVariant.sku}
                                </div>
                              </TableCell>
                              <TableCell>{item.quantityRequested}</TableCell>
                              <TableCell>{item.quantityApproved ?? item.quantityRequested}</TableCell>
                              {requisition.status === "APPROVED" && canConvert ? (
                                <TableCell className="w-40">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={conversionForm.unitCosts[item.id] || ""}
                                    onChange={(event) =>
                                      updateConversionForm(requisition.id, (form) => ({
                                        ...form,
                                        unitCosts: {
                                          ...form.unitCosts,
                                          [item.id]: event.target.value,
                                        },
                                      }))
                                    }
                                  />
                                </TableCell>
                              ) : null}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {requisition.purchaseOrders.length > 0 ? (
                      <div className="mt-4 rounded-md border bg-muted/30 p-3 text-sm">
                        Linked PO:
                        {" "}
                        {requisition.purchaseOrders.map((purchaseOrder) => `${purchaseOrder.poNumber} (${purchaseOrder.status})`).join(", ")}
                      </div>
                    ) : null}

                    {requisition.status === "APPROVED" && canConvert ? (
                      <div className="mt-4 grid gap-3 rounded-lg border p-4 md:grid-cols-4">
                        <div>
                          <Label>Supplier</Label>
                          <select
                            className="w-full rounded-md border bg-background px-3 py-2"
                            value={conversionForm.supplierId}
                            onChange={(event) =>
                              updateConversionForm(requisition.id, (form) => ({
                                ...form,
                                supplierId: event.target.value,
                              }))
                            }
                          >
                            <option value="">Select supplier</option>
                            {suppliers.map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>
                                {supplier.name} ({supplier.code})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>Expected Delivery</Label>
                          <Input
                            type="date"
                            value={conversionForm.expectedAt}
                            onChange={(event) =>
                              updateConversionForm(requisition.id, (form) => ({
                                ...form,
                                expectedAt: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>PO Notes</Label>
                          <Input
                            value={conversionForm.notes}
                            onChange={(event) =>
                              updateConversionForm(requisition.id, (form) => ({
                                ...form,
                                notes: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="md:col-span-4">
                          <Button onClick={() => void convertToPurchaseOrder(requisition)} disabled={saving}>
                            Convert To Purchase Order
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
