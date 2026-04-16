"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Warehouse = { id: number; name: string; code: string };
type Supplier = { id: number; name: string; code: string; currency?: string | null };
type PurchaseOrder = { id: number; poNumber: string; supplierId: number };
type GoodsReceipt = { id: number; receiptNumber: string; purchaseOrderId: number };
type SupplierInvoice = { id: number; invoiceNumber: string; total: number | string; status: string };
type ComparativeStatement = { id: number; csNumber: string };
type PaymentRequestBootstrap = {
  capabilities: {
    canManage: boolean;
    canApproveAdmin: boolean;
    canApproveFinance: boolean;
    canTreasury: boolean;
  };
  warehouses: Warehouse[];
  suppliers: Supplier[];
  purchaseOrders: Array<PurchaseOrder & { warehouseId: number }>;
  goodsReceipts: Array<GoodsReceipt & { warehouseId: number; supplierId: number }>;
  supplierInvoices: Array<
    SupplierInvoice & { supplierId: number; purchaseOrderId: number | null }
  >;
  comparativeStatements: Array<ComparativeStatement & { warehouseId: number }>;
};

type PaymentRequest = {
  id: number;
  prfNumber: string;
  status: string;
  approvalStage: string;
  amount: string | number;
  currency: string;
  requestedAt: string;
  supplier: Supplier;
  warehouse?: Warehouse | null;
  purchaseOrder?: PurchaseOrder | null;
  goodsReceipt?: GoodsReceipt | null;
  supplierInvoice?: SupplierInvoice | null;
  comparativeStatement?: ComparativeStatement | null;
  createdBy?: { id: string; name: string | null; email: string | null } | null;
  managerApprovedBy?: { id: string; name: string | null; email: string | null } | null;
  financeApprovedBy?: { id: string; name: string | null; email: string | null } | null;
  treasuryProcessedBy?: { id: string; name: string | null; email: string | null } | null;
  approvalEvents?: Array<{ id: number; stage: string; decision: string; actedAt: string }>;
};

async function readJson<T>(res: Response, errorMessage: string) {
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error || errorMessage);
  }
  return (await res.json()) as T;
}

export default function PaymentRequestsPage() {
  const { data: session } = useSession();
  const permissions = Array.isArray((session?.user as any)?.permissions)
    ? ((session?.user as any).permissions as string[])
    : [];
  const canRead = permissions.some((perm) =>
    [
      "payment_requests.read",
      "payment_requests.manage",
      "payment_requests.approve_admin",
      "payment_requests.approve_finance",
      "payment_requests.treasury",
    ].includes(perm),
  );

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [goodsReceipts, setGoodsReceipts] = useState<GoodsReceipt[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([]);
  const [comparativeStatements, setComparativeStatements] = useState<ComparativeStatement[]>([]);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [capabilities, setCapabilities] = useState<PaymentRequestBootstrap["capabilities"] | null>(null);

  const canManage = capabilities?.canManage ?? false;
  const canApproveAdmin = capabilities?.canApproveAdmin ?? false;
  const canApproveFinance = capabilities?.canApproveFinance ?? false;
  const canTreasury = capabilities?.canTreasury ?? false;

  const [form, setForm] = useState({
    supplierId: "",
    warehouseId: "",
    purchaseOrderId: "",
    goodsReceiptId: "",
    supplierInvoiceId: "",
    comparativeStatementId: "",
    amount: "",
    currency: "BDT",
    referenceNumber: "",
    note: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    paymentDate: "",
    amount: "",
    method: "BANK_TRANSFER",
    reference: "",
    note: "",
    holdOverride: false,
    holdOverrideNote: "",
  });

  const selectedRequest = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? null,
    [requests, selectedId],
  );

  const loadBootstrap = async () => {
    setLoading(true);
    try {
      const bootstrapRes = await fetch("/api/scm/payment-requests?bootstrap=true", {
        cache: "no-store",
      });
      const bootstrap = await readJson<PaymentRequestBootstrap>(
        bootstrapRes,
        "Failed to load payment request references",
      );

      setCapabilities(bootstrap.capabilities ?? null);
      setWarehouses(Array.isArray(bootstrap.warehouses) ? bootstrap.warehouses : []);
      setSuppliers(Array.isArray(bootstrap.suppliers) ? bootstrap.suppliers : []);
      setPurchaseOrders(
        Array.isArray(bootstrap.purchaseOrders) ? bootstrap.purchaseOrders : [],
      );
      setGoodsReceipts(
        Array.isArray(bootstrap.goodsReceipts) ? bootstrap.goodsReceipts : [],
      );
      setSupplierInvoices(
        Array.isArray(bootstrap.supplierInvoices) ? bootstrap.supplierInvoices : [],
      );
      setComparativeStatements(
        Array.isArray(bootstrap.comparativeStatements)
          ? bootstrap.comparativeStatements
          : [],
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load reference data");
    } finally {
      setLoading(false);
    }
  };

  const loadRequests = async () => {
    const qs = new URLSearchParams();
    if (statusFilter) qs.set("status", statusFilter);
    const res = await fetch(`/api/scm/payment-requests?${qs.toString()}`, { cache: "no-store" });
    const data = await readJson<PaymentRequest[]>(res, "Failed to load payment requests");
    setRequests(data);
    if (data.length > 0 && !selectedId) {
      setSelectedId(data[0].id);
    }
  };

  useEffect(() => {
    if (!canRead) return;
    void loadBootstrap();
    void loadRequests();
  }, [canRead]);

  useEffect(() => {
    if (!canRead) return;
    void loadRequests();
  }, [statusFilter]);

  const createRequest = async () => {
    if (!form.supplierId) {
      toast.error("Supplier is required.");
      return;
    }
    const res = await fetch("/api/scm/payment-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: Number(form.supplierId),
        warehouseId: form.warehouseId ? Number(form.warehouseId) : null,
        purchaseOrderId: form.purchaseOrderId ? Number(form.purchaseOrderId) : null,
        goodsReceiptId: form.goodsReceiptId ? Number(form.goodsReceiptId) : null,
        supplierInvoiceId: form.supplierInvoiceId ? Number(form.supplierInvoiceId) : null,
        comparativeStatementId: form.comparativeStatementId ? Number(form.comparativeStatementId) : null,
        amount: form.amount || null,
        currency: form.currency,
        referenceNumber: form.referenceNumber,
        note: form.note,
      }),
    });
    const data = await readJson<PaymentRequest>(res, "Failed to create payment request");
    toast.success("Payment request created");
    setForm({
      supplierId: "",
      warehouseId: "",
      purchaseOrderId: "",
      goodsReceiptId: "",
      supplierInvoiceId: "",
      comparativeStatementId: "",
      amount: "",
      currency: "BDT",
      referenceNumber: "",
      note: "",
    });
    await loadRequests();
    setSelectedId(data.id);
  };

  const runAction = async (action: string) => {
    if (!selectedRequest) return;
    const res = await fetch(`/api/scm/payment-requests/${selectedRequest.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        paymentDate: paymentForm.paymentDate || undefined,
        amount: paymentForm.amount || undefined,
        method: paymentForm.method,
        reference: paymentForm.reference,
        note: paymentForm.note,
        holdOverride: paymentForm.holdOverride,
        holdOverrideNote: paymentForm.holdOverrideNote,
      }),
    });
    const data = await readJson<PaymentRequest>(res, "Failed to update payment request");
    toast.success("Payment request updated");
    setRequests((current) => current.map((row) => (row.id === data.id ? data : row)));
    setSelectedId(data.id);
  };

  if (!canRead) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            You do not have permission to access payment requests.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Payment Requests (PRF)</h1>
          <p className="text-sm text-muted-foreground">
            Initiate, approve, and execute vendor payment requests linked to PO, GRN, CS, and invoices.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadRequests()} disabled={loading}>
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Refresh
        </Button>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Payment Request</CardTitle>
            <CardDescription>Draft a PRF and link it to procurement documents.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Supplier</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={form.supplierId}
                  onChange={(e) => setForm((cur) => ({ ...cur, supplierId: e.target.value }))}
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Warehouse</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={form.warehouseId}
                  onChange={(e) => setForm((cur) => ({ ...cur, warehouseId: e.target.value }))}
                >
                  <option value="">Optional</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name} ({warehouse.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  placeholder="Amount"
                  value={form.amount}
                  onChange={(e) => setForm((cur) => ({ ...cur, amount: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-2">
                <Label>PO</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={form.purchaseOrderId}
                  onChange={(e) => setForm((cur) => ({ ...cur, purchaseOrderId: e.target.value }))}
                >
                  <option value="">Optional</option>
                  {purchaseOrders.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.poNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>GRN</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={form.goodsReceiptId}
                  onChange={(e) => setForm((cur) => ({ ...cur, goodsReceiptId: e.target.value }))}
                >
                  <option value="">Optional</option>
                  {goodsReceipts.map((grn) => (
                    <option key={grn.id} value={grn.id}>
                      {grn.receiptNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Invoice</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={form.supplierInvoiceId}
                  onChange={(e) => setForm((cur) => ({ ...cur, supplierInvoiceId: e.target.value }))}
                >
                  <option value="">Optional</option>
                  {supplierInvoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoiceNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>CS</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2"
                  value={form.comparativeStatementId}
                  onChange={(e) =>
                    setForm((cur) => ({ ...cur, comparativeStatementId: e.target.value }))
                  }
                >
                  <option value="">Optional</option>
                  {comparativeStatements.map((cs) => (
                    <option key={cs.id} value={cs.id}>
                      {cs.csNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Currency"
                value={form.currency}
                onChange={(e) => setForm((cur) => ({ ...cur, currency: e.target.value }))}
              />
              <Input
                placeholder="Reference number"
                value={form.referenceNumber}
                onChange={(e) => setForm((cur) => ({ ...cur, referenceNumber: e.target.value }))}
              />
            </div>
            <Textarea
              placeholder="Note"
              value={form.note}
              onChange={(e) => setForm((cur) => ({ ...cur, note: e.target.value }))}
            />
            <Button onClick={() => void createRequest()}>Create PRF Draft</Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>PRF Register</CardTitle>
          <CardDescription>Track payment requests by status and workflow stage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <select
              className="rounded-md border bg-background px-3 py-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="MANAGER_APPROVED">Manager Approved</option>
              <option value="FINANCE_APPROVED">Finance Approved</option>
              <option value="TREASURY_PROCESSING">Treasury Processing</option>
              <option value="PAID">Paid</option>
              <option value="REJECTED">Rejected</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PRF</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No payment requests found.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((row) => (
                  <TableRow
                    key={row.id}
                    className={row.id === selectedId ? "bg-muted/40" : ""}
                    onClick={() => setSelectedId(row.id)}
                  >
                    <TableCell>{row.prfNumber}</TableCell>
                    <TableCell>{row.supplier.name}</TableCell>
                    <TableCell className="text-xs uppercase">{row.status}</TableCell>
                    <TableCell className="text-right">
                      {Number(row.amount).toFixed(2)} {row.currency}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedRequest ? (
        <Card>
          <CardHeader>
            <CardTitle>Workflow Controls</CardTitle>
            <CardDescription>Advance the PRF through approvals and treasury payment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <div className="text-xs uppercase text-muted-foreground">PRF</div>
                <div className="font-semibold">{selectedRequest.prfNumber}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Status</div>
                <div className="font-semibold">{selectedRequest.status}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-muted-foreground">Amount</div>
                <div className="font-semibold">
                  {Number(selectedRequest.amount).toFixed(2)} {selectedRequest.currency}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {canManage && selectedRequest.status === "DRAFT" ? (
                <Button onClick={() => void runAction("submit")}>Submit</Button>
              ) : null}
              {canApproveAdmin && selectedRequest.status === "SUBMITTED" ? (
                <Button onClick={() => void runAction("manager_approve")}>Manager Approve</Button>
              ) : null}
              {canApproveFinance && selectedRequest.status === "MANAGER_APPROVED" ? (
                <Button onClick={() => void runAction("finance_approve")}>Finance Approve</Button>
              ) : null}
              {canTreasury && selectedRequest.status === "FINANCE_APPROVED" ? (
                <Button variant="outline" onClick={() => void runAction("treasury_start")}>
                  Treasury Start
                </Button>
              ) : null}
              {canTreasury &&
              ["FINANCE_APPROVED", "TREASURY_PROCESSING"].includes(selectedRequest.status) ? (
                <Button onClick={() => void runAction("mark_paid")}>Mark Paid</Button>
              ) : null}
              {canManage && ["DRAFT", "SUBMITTED"].includes(selectedRequest.status) ? (
                <Button variant="destructive" onClick={() => void runAction("cancel")}>
                  Cancel
                </Button>
              ) : null}
              {(canApproveAdmin || canApproveFinance || canTreasury) &&
              !["PAID", "CANCELLED"].includes(selectedRequest.status) ? (
                <Button variant="destructive" onClick={() => void runAction("reject")}>
                  Reject
                </Button>
              ) : null}
            </div>

            {canTreasury &&
            ["FINANCE_APPROVED", "TREASURY_PROCESSING"].includes(selectedRequest.status) ? (
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm((cur) => ({ ...cur, paymentDate: e.target.value }))}
                />
                <Input
                  placeholder="Amount"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((cur) => ({ ...cur, amount: e.target.value }))}
                />
                <Input
                  placeholder="Method"
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm((cur) => ({ ...cur, method: e.target.value }))}
                />
                <Input
                  placeholder="Reference"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm((cur) => ({ ...cur, reference: e.target.value }))}
                />
                <Input
                  placeholder="Note"
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm((cur) => ({ ...cur, note: e.target.value }))}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
