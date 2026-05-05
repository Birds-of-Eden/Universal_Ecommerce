"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SkeletonCards } from "@/components/investor/InvestorSkeleton";
import { statusBadge, shortDateTime } from "@/lib/investor-status";

type WithdrawalRequestRow = {
  id: number;
  requestNumber: string;
  requestedAmount: string;
  approvedAmount: string | null;
  currency: string;
  status: string;
  requestedSettlementDate: string | null;
  requestNote: string | null;
  reviewNote: string | null;
  rejectionReason: string | null;
  settlementNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  settledAt: string | null;
  transaction: {
    id: number;
    transactionNumber: string;
    transactionDate: string;
    amount: string;
    direction: string;
    type: string;
  } | null;
};

type Payload = {
  investor: {
    id: number;
    code: string;
    name: string;
    status: string;
    kycStatus: string;
    bankName: string | null;
    bankAccountName: string | null;
    bankAccountNumber: string | null;
    beneficiaryVerifiedAt: string | null;
    beneficiaryVerificationNote: string | null;
  };
  metrics: {
    availableBalance: string;
    activeCommittedAmount: string;
    pendingPayoutAmount: string;
    pendingWithdrawalAmount: string;
    withdrawableBalance: string;
  };
  requests: WithdrawalRequestRow[];
};

function fmtAmount(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvestorWithdrawalsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<Payload | null>(null);
  const [amount, setAmount] = useState("");
  const [requestedSettlementDate, setRequestedSettlementDate] = useState("");
  const [requestNote, setRequestNote] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/investor/withdrawals", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load withdrawal center.");
      setData(payload as Payload);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load withdrawal center.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const submit = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/investor/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, requestedSettlementDate: requestedSettlementDate || null, requestNote: requestNote || null }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to submit withdrawal request.");
      toast.success("Withdrawal request submitted.");
      setAmount("");
      setRequestedSettlementDate("");
      setRequestNote("");
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Failed to submit withdrawal request.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-80 animate-pulse rounded bg-muted" />
        </div>
        <SkeletonCards count={5} />
        <Card>
          <CardHeader><div className="h-4 w-40 animate-pulse rounded bg-muted" /></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded bg-muted" />)}
            </div>
            <div className="h-20 animate-pulse rounded bg-muted" />
            <div className="h-9 w-40 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold md:text-2xl">Withdrawal Center</h1>
        <p className="text-sm text-muted-foreground">
          Review withdrawable balance, submit requests, and track approval and settlement.
        </p>
      </div>

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Available Balance", value: data.metrics.availableBalance },
              { label: "Active Committed", value: data.metrics.activeCommittedAmount },
              { label: "Pending Payouts", value: data.metrics.pendingPayoutAmount },
              { label: "Pending Withdrawals", value: data.metrics.pendingWithdrawalAmount },
              { label: "Withdrawable", value: data.metrics.withdrawableBalance },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-semibold">{fmtAmount(value)}</CardContent>
              </Card>
            ))}
          </div>

          {data.investor.kycStatus !== "VERIFIED" || !data.investor.beneficiaryVerifiedAt ? (
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
              Withdrawal requests require VERIFIED KYC and a verified beneficiary account.
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submit Withdrawal Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Requested Amount</Label>
                  <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Requested Settlement Date</Label>
                  <Input type="date" value={requestedSettlementDate} onChange={(e) => setRequestedSettlementDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Beneficiary</Label>
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    {(data.investor.bankAccountName || data.investor.name) + " | " + (data.investor.bankName || "No Bank")}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Request Note</Label>
                <Textarea value={requestNote} onChange={(e) => setRequestNote(e.target.value)} placeholder="Explain why the withdrawal is needed or any settlement instruction." />
              </div>
              <Button onClick={() => void submit()} disabled={saving}>
                {saving ? "Submitting..." : "Submit Withdrawal Request"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Withdrawal Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No withdrawal requests found.</p>
              ) : (
                data.requests.map((row) => {
                  const badge = statusBadge(row.status);
                  return (
                    <div key={row.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{row.requestNumber}</p>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Submitted {shortDateTime(row.submittedAt)} | Requested {row.requestedAmount} {row.currency}
                          </p>
                        </div>
                        {row.transaction ? (
                          <div className="text-right text-sm text-muted-foreground">
                            <div>{row.transaction.transactionNumber}</div>
                            <div>{shortDateTime(row.transaction.transactionDate)}</div>
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                        <div>Approved: {row.approvedAmount ?? "N/A"} {row.approvedAmount ? row.currency : ""}</div>
                        <div>Settlement Date: {shortDateTime(row.requestedSettlementDate)}</div>
                        <div>Reviewed: {shortDateTime(row.reviewedAt)}</div>
                        <div>Settled: {shortDateTime(row.settledAt)}</div>
                      </div>
                      {row.requestNote ? <p className="mt-3 text-sm">Request note: {row.requestNote}</p> : null}
                      {row.reviewNote ? <p className="mt-2 text-sm text-muted-foreground">Review note: {row.reviewNote}</p> : null}
                      {row.rejectionReason ? <p className="mt-2 text-sm text-destructive">Rejection reason: {row.rejectionReason}</p> : null}
                      {row.settlementNote ? <p className="mt-2 text-sm text-muted-foreground">Settlement note: {row.settlementNote}</p> : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
