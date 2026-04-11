"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SupplierRfqRow = {
  id: number;
  rfqNumber: string;
  status: string;
  currency: string;
  requestedAt: string;
  submissionDeadline: string | null;
  note: string | null;
  canSubmitQuote: boolean;
  warehouse: {
    id: number;
    name: string;
    code: string;
  };
  invite: {
    id: number;
    status: string;
    invitedAt: string;
    respondedAt: string | null;
    resubmissionRequestedAt?: string | null;
    resubmissionReason?: string | null;
    note: string | null;
  } | null;
  items: Array<{
    id: number;
    description: string | null;
    quantityRequested: number;
    targetUnitCost: string | null;
    variantId: number;
    sku: string;
    productName: string;
  }>;
  quotation: {
    id: number;
    status: string;
    revisionNo?: number;
    quotedAt: string;
    validUntil: string | null;
    subtotal: string;
    taxTotal: string;
    total: string;
    currency: string;
    note: string | null;
    items: Array<{
      id: number;
      rfqItemId: number;
      productVariantId: number;
      quantityQuoted: number;
      unitCost: string;
      lineTotal: string;
      description: string | null;
    }>;
  } | null;
  award: {
    id: number;
    supplierId: number;
    status: string;
    awardedAt: string;
    purchaseOrderId: number | null;
    purchaseOrder: {
      id: number;
      poNumber: string;
      status: string;
    } | null;
    isAwardedToCurrentSupplier: boolean;
  } | null;
};

function fmtDate(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

export default function SupplierRfqsPage() {
  const [rows, setRows] = useState<SupplierRfqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [lineQty, setLineQty] = useState<Record<string, string>>({});
  const [lineUnitCost, setLineUnitCost] = useState<Record<string, string>>({});
  const [lineDesc, setLineDesc] = useState<Record<string, string>>({});
  const [quoteNote, setQuoteNote] = useState<Record<number, string>>({});
  const [quoteValidUntil, setQuoteValidUntil] = useState<Record<number, string>>({});
  const [quoteTax, setQuoteTax] = useState<Record<number, string>>({});

  const loadRfqs = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);

      const response = await fetch(
        `/api/supplier/rfqs${params.size > 0 ? `?${params.toString()}` : ""}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load RFQs.");
      }

      const data = Array.isArray(payload) ? (payload as SupplierRfqRow[]) : [];
      setRows(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load RFQs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRfqs();
  }, [search, statusFilter]);

  useEffect(() => {
    const nextQty = { ...lineQty };
    const nextUnitCost = { ...lineUnitCost };
    const nextDesc = { ...lineDesc };
    const nextNote = { ...quoteNote };
    const nextValidUntil = { ...quoteValidUntil };
    const nextTax = { ...quoteTax };

    for (const rfq of rows) {
      if (nextNote[rfq.id] === undefined) {
        nextNote[rfq.id] = rfq.quotation?.note ?? "";
      }
      if (nextValidUntil[rfq.id] === undefined) {
        nextValidUntil[rfq.id] = rfq.quotation?.validUntil
          ? rfq.quotation.validUntil.slice(0, 16)
          : "";
      }
      if (nextTax[rfq.id] === undefined) {
        nextTax[rfq.id] = rfq.quotation?.taxTotal ?? "0";
      }

      for (const item of rfq.items) {
        const key = `${rfq.id}:${item.id}`;
        const existingQuoteLine = rfq.quotation?.items.find(
          (quoteLine) => quoteLine.rfqItemId === item.id,
        );
        if (nextQty[key] === undefined) {
          nextQty[key] = String(
            existingQuoteLine?.quantityQuoted ?? item.quantityRequested,
          );
        }
        if (nextUnitCost[key] === undefined) {
          nextUnitCost[key] = existingQuoteLine?.unitCost ?? item.targetUnitCost ?? "";
        }
        if (nextDesc[key] === undefined) {
          nextDesc[key] = existingQuoteLine?.description ?? item.description ?? "";
        }
      }
    }

    setLineQty(nextQty);
    setLineUnitCost(nextUnitCost);
    setLineDesc(nextDesc);
    setQuoteNote(nextNote);
    setQuoteValidUntil(nextValidUntil);
    setQuoteTax(nextTax);
  }, [rows]);

  const statusOptions = useMemo(
    () => ["SUBMITTED", "CLOSED", "AWARDED", "CANCELLED", "DRAFT"],
    [],
  );

  const submitQuote = async (rfq: SupplierRfqRow) => {
    try {
      const items = rfq.items.map((item) => {
        const key = `${rfq.id}:${item.id}`;
        const quantityQuoted = Number(lineQty[key] || "");
        const unitCost = Number(lineUnitCost[key] || "");
        if (!Number.isInteger(quantityQuoted) || quantityQuoted <= 0) {
          throw new Error(`Invalid quoted quantity for ${item.productName}.`);
        }
        if (!Number.isFinite(unitCost) || unitCost < 0) {
          throw new Error(`Invalid unit cost for ${item.productName}.`);
        }
        return {
          rfqItemId: item.id,
          quantityQuoted,
          unitCost,
          description: lineDesc[key] || item.description || "",
        };
      });

      setSubmittingId(rfq.id);
      const response = await fetch("/api/supplier/rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfqId: rfq.id,
          validUntil: quoteValidUntil[rfq.id] || null,
          quotationNote: quoteNote[rfq.id] || "",
          taxTotal: Number(quoteTax[rfq.id] || 0),
          currency: rfq.currency,
          items,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to submit quotation.");
      }

      toast.success(`Quotation submitted for ${rfq.rfqNumber}`);
      await loadRfqs();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit quotation.");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">RFQ Invitations</h1>
          <p className="text-sm text-muted-foreground">
            Review invited RFQs and submit your quotation securely.
          </p>
        </div>
        <Button variant="outline" onClick={() => void loadRfqs()}>
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <Label>Search</Label>
          <Input
            placeholder="RFQ number or warehouse..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading RFQs...</p> : null}
      {!loading && error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!loading && !error ? (
        <div className="space-y-4">
          {rows.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground">
                No RFQs found for your supplier account.
              </CardContent>
            </Card>
          ) : (
            rows.map((rfq) => (
              <Card key={rfq.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">{rfq.rfqNumber}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{rfq.status}</Badge>
                      {rfq.award?.isAwardedToCurrentSupplier ? (
                        <Badge>Awarded To You</Badge>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {rfq.warehouse.name} ({rfq.warehouse.code}) | Deadline:{" "}
                    {fmtDate(rfq.submissionDeadline)}
                  </p>
                  {rfq.invite?.resubmissionReason ? (
                    <p className="text-xs text-amber-600">
                      Resubmission request: {rfq.invite.resubmissionReason}
                    </p>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-muted-foreground">
                        <tr className="border-b">
                          <th className="pb-2">Item</th>
                          <th className="pb-2">Requested</th>
                          <th className="pb-2">Quoted Qty</th>
                          <th className="pb-2">Unit Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rfq.items.map((item) => {
                          const key = `${rfq.id}:${item.id}`;
                          return (
                            <tr key={item.id} className="border-b">
                              <td className="py-2">
                                <div className="font-medium">{item.productName}</div>
                                <div className="text-xs text-muted-foreground">{item.sku}</div>
                              </td>
                              <td className="py-2">{item.quantityRequested}</td>
                              <td className="py-2">
                                <Input
                                  type="number"
                                  min={1}
                                  value={lineQty[key] ?? ""}
                                  onChange={(event) =>
                                    setLineQty((current) => ({
                                      ...current,
                                      [key]: event.target.value,
                                    }))
                                  }
                                  disabled={!rfq.canSubmitQuote || submittingId === rfq.id}
                                />
                              </td>
                              <td className="py-2">
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={lineUnitCost[key] ?? ""}
                                  onChange={(event) =>
                                    setLineUnitCost((current) => ({
                                      ...current,
                                      [key]: event.target.value,
                                    }))
                                  }
                                  disabled={!rfq.canSubmitQuote || submittingId === rfq.id}
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Valid Until</Label>
                      <Input
                        type="datetime-local"
                        value={quoteValidUntil[rfq.id] ?? ""}
                        onChange={(event) =>
                          setQuoteValidUntil((current) => ({
                            ...current,
                            [rfq.id]: event.target.value,
                          }))
                        }
                        disabled={!rfq.canSubmitQuote || submittingId === rfq.id}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Tax Total</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={quoteTax[rfq.id] ?? "0"}
                        onChange={(event) =>
                          setQuoteTax((current) => ({
                            ...current,
                            [rfq.id]: event.target.value,
                          }))
                        }
                        disabled={!rfq.canSubmitQuote || submittingId === rfq.id}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Quotation Note</Label>
                    <Textarea
                      value={quoteNote[rfq.id] ?? ""}
                      onChange={(event) =>
                        setQuoteNote((current) => ({
                          ...current,
                          [rfq.id]: event.target.value,
                        }))
                      }
                      disabled={!rfq.canSubmitQuote || submittingId === rfq.id}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={() => void submitQuote(rfq)}
                      disabled={!rfq.canSubmitQuote || submittingId === rfq.id}
                    >
                      {submittingId === rfq.id ? "Submitting..." : "Submit / Update Quote"}
                    </Button>
                    {rfq.quotation ? (
                      <p className="text-sm text-muted-foreground">
                        Last quote total: {rfq.quotation.total} {rfq.quotation.currency}
                        {rfq.quotation.revisionNo ? ` • Rev ${rfq.quotation.revisionNo}` : ""} at{" "}
                        {fmtDate(rfq.quotation.quotedAt)}
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
