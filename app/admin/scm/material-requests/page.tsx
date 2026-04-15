"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Paperclip, Plus, RefreshCw, Trash2 } from "lucide-react";
import { uploadFile } from "@/lib/upload-file";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Warehouse = {
  id: number;
  name: string;
  code: string;
};

type Variant = {
  id: number;
  sku: string;
  product?: {
    id: number;
    name: string;
    inventoryItemClass?: "CONSUMABLE" | "PERMANENT";
    requiresAssetTag?: boolean;
  };
};

type MaterialRequestItem = {
  id: number;
  productVariantId: number;
  description: string | null;
  quantityRequested: number;
  quantityReleased: number;
  productVariant: {
    id: number;
    sku: string;
    product: {
      id: number;
      name: string;
      inventoryItemClass: "CONSUMABLE" | "PERMANENT";
      requiresAssetTag: boolean;
    };
  };
};

type MaterialRequest = {
  id: number;
  requestNumber: string;
  warehouseId: number;
  status:
    | "DRAFT"
    | "SUBMITTED"
    | "SUPERVISOR_ENDORSED"
    | "PROJECT_MANAGER_ENDORSED"
    | "ADMIN_APPROVED"
    | "PARTIALLY_RELEASED"
    | "RELEASED"
    | "REJECTED"
    | "CANCELLED";
  title: string | null;
  purpose: string | null;
  budgetCode: string | null;
  boqReference: string | null;
  specification: string | null;
  note: string | null;
  requestedAt: string;
  requiredBy: string | null;
  submittedAt: string | null;
  supervisorEndorsedAt: string | null;
  projectManagerEndorsedAt: string | null;
  adminApprovedAt: string | null;
  createdById: string | null;
  warehouse: Warehouse;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  items: MaterialRequestItem[];
  attachments: Array<{
    id: number;
    fileUrl: string;
    fileName: string;
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
};

type DraftItem = {
  productVariantId: string;
  quantityRequested: string;
  description: string;
};

type AttachmentDraft = {
  file: File;
  note: string;
};

const MATERIAL_UPLOAD_ENDPOINT = "/api/upload/scm-material/material-requests";

const emptyLine = (): DraftItem => ({
  productVariantId: "",
  quantityRequested: "1",
  description: "",
});

async function readJson<T>(response: Response, fallback: string): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || fallback);
  }
  return payload as T;
}

function formatDateTime(value: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

export default function MaterialRequestsPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.id as string | undefined;
  const permissions = Array.isArray((session?.user as any)?.permissions)
    ? ((session?.user as any).permissions as string[])
    : [];

  const canRead = permissions.some((permission) =>
    [
      "material_requests.read",
      "material_requests.manage",
      "material_requests.endorse_supervisor",
      "material_requests.endorse_project_manager",
      "material_requests.approve_admin",
      "material_releases.read",
      "material_releases.manage",
    ].includes(permission),
  );
  const canManage = permissions.includes("material_requests.manage");
  const canSupervisorEndorse = permissions.includes("material_requests.endorse_supervisor");
  const canProjectManagerEndorse = permissions.includes(
    "material_requests.endorse_project_manager",
  );
  const canAdminApprove = permissions.includes("material_requests.approve_admin");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [warehouseId, setWarehouseId] = useState("");
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [budgetCode, setBudgetCode] = useState("");
  const [boqReference, setBoqReference] = useState("");
  const [specification, setSpecification] = useState("");
  const [note, setNote] = useState("");
  const [requiredBy, setRequiredBy] = useState("");
  const [items, setItems] = useState<DraftItem[]>([emptyLine()]);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [actionNotes, setActionNotes] = useState<Record<number, string>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [requestData, warehouseData, variantData] = await Promise.all([
        fetch("/api/scm/material-requests", { cache: "no-store" }).then((res) =>
          readJson<MaterialRequest[]>(res, "Failed to load material requests"),
        ),
        fetch("/api/warehouses", { cache: "no-store" }).then((res) =>
          readJson<Warehouse[]>(res, "Failed to load warehouses"),
        ),
        fetch("/api/product-variants", { cache: "no-store" }).then((res) =>
          readJson<Variant[]>(res, "Failed to load product variants"),
        ),
      ]);

      setRequests(Array.isArray(requestData) ? requestData : []);
      setWarehouses(Array.isArray(warehouseData) ? warehouseData : []);
      setVariants(Array.isArray(variantData) ? variantData : []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load material request data");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canRead) {
      void loadData();
    }
  }, [canRead]);

  const visibleRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requests.filter((request) => {
      if (statusFilter !== "ALL" && request.status !== statusFilter) return false;
      if (!query) return true;
      return (
        request.requestNumber.toLowerCase().includes(query) ||
        request.warehouse.name.toLowerCase().includes(query) ||
        (request.title || "").toLowerCase().includes(query) ||
        (request.purpose || "").toLowerCase().includes(query)
      );
    });
  }, [requests, search, statusFilter]);

  const resetForm = () => {
    setWarehouseId("");
    setTitle("");
    setPurpose("");
    setBudgetCode("");
    setBoqReference("");
    setSpecification("");
    setNote("");
    setRequiredBy("");
    setItems([emptyLine()]);
    setAttachments([]);
  };

  const addAttachmentRows = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next = Array.from(files)
      .slice(0, 20)
      .map((file) => ({ file, note: "" }));
    setAttachments((current) => [...current, ...next].slice(0, 20));
  };

  const updateAttachmentNote = (index: number, value: string) => {
    setAttachments((current) =>
      current.map((item, idx) => (idx === index ? { ...item, note: value } : item)),
    );
  };

  const removeAttachment = (index: number) => {
    setAttachments((current) => current.filter((_, idx) => idx !== index));
  };

  const updateItem = (index: number, key: keyof DraftItem, value: string) => {
    setItems((current) =>
      current.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)),
    );
  };

  const createMaterialRequest = async () => {
    if (!warehouseId) {
      toast.error("Warehouse is required");
      return;
    }

    const payloadItems = items
      .map((item) => ({
        productVariantId: Number(item.productVariantId),
        quantityRequested: Number(item.quantityRequested),
        description: item.description.trim() || null,
      }))
      .filter(
        (item) =>
          Number.isInteger(item.productVariantId) &&
          item.productVariantId > 0 &&
          Number.isInteger(item.quantityRequested) &&
          item.quantityRequested > 0,
      );

    if (payloadItems.length === 0) {
      toast.error("At least one valid request line is required");
      return;
    }

    setSaving(true);
    try {
      const uploadedAttachments = [] as Array<{
        fileUrl: string;
        fileName: string;
        mimeType: string | null;
        fileSize: number | null;
        note: string | null;
      }>;

      for (const attachment of attachments) {
        const fileUrl = await uploadFile(attachment.file, MATERIAL_UPLOAD_ENDPOINT);
        uploadedAttachments.push({
          fileUrl,
          fileName: attachment.file.name,
          mimeType: attachment.file.type || null,
          fileSize: attachment.file.size,
          note: attachment.note.trim() || null,
        });
      }

      const response = await fetch("/api/scm/material-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: Number(warehouseId),
          title,
          purpose,
          budgetCode,
          boqReference,
          specification,
          note,
          requiredBy: requiredBy || null,
          items: payloadItems,
          attachments: uploadedAttachments,
        }),
      });

      await readJson(response, "Failed to create material request");
      toast.success("Material request created");
      resetForm();
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create material request");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (materialRequestId: number, action: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/scm/material-requests/${materialRequestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          note: actionNotes[materialRequestId] || undefined,
        }),
      });
      await readJson(response, `Failed to ${action} material request`);
      toast.success(`Material request ${action.replaceAll("_", " ")} completed`);
      setActionNotes((current) => ({ ...current, [materialRequestId]: "" }));
      await loadData();
    } catch (error: any) {
      toast.error(error?.message || `Failed to ${action} material request`);
    } finally {
      setSaving(false);
    }
  };

  if (!canRead) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Forbidden</CardTitle>
            <CardDescription>
              You do not have permission to access material requests.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Material Requests</h1>
        <p className="text-sm text-muted-foreground">
          Manage warehouse material requisitions from requester draft to multi-stage approval.
        </p>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Material Request</CardTitle>
            <CardDescription>
              Raise a warehouse/store material request with BOQ/specification and attach supporting documents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>Warehouse</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Purpose</Label>
                <Input value={purpose} onChange={(event) => setPurpose(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Required By</Label>
                <Input
                  type="datetime-local"
                  value={requiredBy}
                  onChange={(event) => setRequiredBy(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label>Budget Code</Label>
                <Input
                  value={budgetCode}
                  onChange={(event) => setBudgetCode(event.target.value)}
                  placeholder="BUDGET-2026-01"
                />
              </div>
              <div className="space-y-2">
                <Label>BOQ Reference</Label>
                <Input
                  value={boqReference}
                  onChange={(event) => setBoqReference(event.target.value)}
                  placeholder="BOQ-RD-04"
                />
              </div>
              <div className="space-y-2 xl:col-span-1">
                <Label>General Note</Label>
                <Input value={note} onChange={(event) => setNote(event.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Specification</Label>
              <Textarea
                rows={3}
                value={specification}
                onChange={(event) => setSpecification(event.target.value)}
                placeholder="Technical specification, usage purpose, and quality constraints"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Request Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setItems((current) => [...current, emptyLine()])}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Line
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[2fr_1fr_2fr_auto]">
                  <div className="space-y-2">
                    <Label>Variant</Label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={item.productVariantId}
                      onChange={(event) => updateItem(index, "productVariantId", event.target.value)}
                    >
                      <option value="">Select variant</option>
                      {variants.map((variant) => (
                        <option key={variant.id} value={variant.id}>
                          {variant.product?.name || "Variant"} ({variant.sku})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantityRequested}
                      onChange={(event) => updateItem(index, "quantityRequested", event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(event) => updateItem(index, "description", event.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      disabled={items.length === 1}
                      onClick={() =>
                        setItems((current) =>
                          current.length === 1
                            ? current
                            : current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
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
                <div className="text-xs text-muted-foreground">Max 20 files</div>
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
                      key={`${attachment.file.name}-${index}`}
                      className="grid gap-2 rounded-md border p-2 md:grid-cols-[2fr_3fr_auto]"
                    >
                      <div className="text-sm text-muted-foreground">{attachment.file.name}</div>
                      <Input
                        placeholder="Attachment note (optional)"
                        value={attachment.note}
                        onChange={(event) => updateAttachmentNote(index, event.target.value)}
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

            <div className="flex gap-2">
              <Button variant="outline" onClick={resetForm} disabled={saving}>
                Clear
              </Button>
              <Button onClick={() => void createMaterialRequest()} disabled={saving}>
                {saving ? "Saving..." : "Create Draft"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Material Request Register</CardTitle>
          <CardDescription>
            Track request status, approval events, and release readiness.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_auto]">
            <Input
              placeholder="Search by request number, title, purpose, or warehouse..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">All statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="SUPERVISOR_ENDORSED">SUPERVISOR_ENDORSED</option>
              <option value="PROJECT_MANAGER_ENDORSED">PROJECT_MANAGER_ENDORSED</option>
              <option value="ADMIN_APPROVED">ADMIN_APPROVED</option>
              <option value="PARTIALLY_RELEASED">PARTIALLY_RELEASED</option>
              <option value="RELEASED">RELEASED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
            <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading material requests...</p>
          ) : visibleRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No material requests found.</p>
          ) : (
            <div className="space-y-4">
              {visibleRequests.map((request) => {
                const canCancel =
                  ["DRAFT", "SUBMITTED"].includes(request.status) &&
                  (canManage || (request.createdById !== null && request.createdById === userId));
                const canReject =
                  ["SUBMITTED", "SUPERVISOR_ENDORSED", "PROJECT_MANAGER_ENDORSED"].includes(
                    request.status,
                  ) &&
                  (canSupervisorEndorse || canProjectManagerEndorse || canAdminApprove);

                return (
                  <Card key={request.id}>
                    <CardHeader className="gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <CardTitle className="text-lg">{request.requestNumber}</CardTitle>
                          <CardDescription>
                            {request.warehouse.name} ({request.warehouse.code})
                            {request.title ? ` • ${request.title}` : ""}
                          </CardDescription>
                        </div>
                        <div className="rounded-full border px-3 py-1 text-xs font-medium">
                          {request.status}
                        </div>
                      </div>
                      <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                        <div>Requested: {formatDateTime(request.requestedAt)}</div>
                        <div>Required By: {formatDateTime(request.requiredBy)}</div>
                        <div>Submitted: {formatDateTime(request.submittedAt)}</div>
                        <div>Admin Approved: {formatDateTime(request.adminApprovedAt)}</div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <span className="text-muted-foreground">Purpose:</span> {request.purpose || "-"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Budget:</span> {request.budgetCode || "-"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">BOQ:</span> {request.boqReference || "-"}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Created By:</span>{" "}
                          {request.createdBy?.name || request.createdBy?.email || "N/A"}
                        </div>
                      </div>

                      {request.specification ? (
                        <p className="text-sm text-muted-foreground">Specification: {request.specification}</p>
                      ) : null}

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Requested</TableHead>
                            <TableHead>Released</TableHead>
                            <TableHead>Remaining</TableHead>
                            <TableHead>Class</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {request.items.map((item) => {
                            const remaining = Math.max(0, item.quantityRequested - item.quantityReleased);
                            return (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <div className="font-medium">{item.productVariant.product.name}</div>
                                  <div className="text-xs text-muted-foreground">{item.productVariant.sku}</div>
                                </TableCell>
                                <TableCell>{item.quantityRequested}</TableCell>
                                <TableCell>{item.quantityReleased}</TableCell>
                                <TableCell>{remaining}</TableCell>
                                <TableCell>
                                  {item.productVariant.product.inventoryItemClass}
                                  {item.productVariant.product.requiresAssetTag ? " • TAG" : ""}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>

                      {request.attachments.length > 0 ? (
                        <div className="rounded-md border p-3">
                          <div className="mb-2 text-sm font-medium">Attachments</div>
                          <div className="space-y-1 text-sm">
                            {request.attachments.map((attachment) => (
                              <div key={attachment.id} className="flex flex-wrap items-center gap-2">
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
                                  <span className="text-xs text-muted-foreground">({attachment.note})</span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        <Label>Workflow Note (optional)</Label>
                        <Input
                          value={actionNotes[request.id] || ""}
                          onChange={(event) =>
                            setActionNotes((current) => ({
                              ...current,
                              [request.id]: event.target.value,
                            }))
                          }
                          placeholder="Add note for submit/endorse/approve/reject/cancel"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {canManage && request.status === "DRAFT" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void runAction(request.id, "submit")}
                            disabled={saving}
                          >
                            Submit
                          </Button>
                        ) : null}

                        {canSupervisorEndorse && request.status === "SUBMITTED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void runAction(request.id, "endorse_supervisor")}
                            disabled={saving}
                          >
                            Endorse (Supervisor)
                          </Button>
                        ) : null}

                        {canProjectManagerEndorse && request.status === "SUPERVISOR_ENDORSED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void runAction(request.id, "endorse_project_manager")}
                            disabled={saving}
                          >
                            Endorse (Project Manager)
                          </Button>
                        ) : null}

                        {canAdminApprove && request.status === "PROJECT_MANAGER_ENDORSED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void runAction(request.id, "approve_admin")}
                            disabled={saving}
                          >
                            Final Approve (Admin)
                          </Button>
                        ) : null}

                        {canReject ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void runAction(request.id, "reject")}
                            disabled={saving}
                          >
                            Reject
                          </Button>
                        ) : null}

                        {canCancel ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void runAction(request.id, "cancel")}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
