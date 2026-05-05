"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SkeletonCards, SkeletonTable } from "@/components/investor/InvestorSkeleton";
import { statusBadge, shortDate } from "@/lib/investor-status";

type PayoutPayload = {
  summary: {
    payoutCount: number;
    paidCount: number;
    totalAmount: string;
    paidAmount: string;
  };
  payouts: Array<{
    id: number;
    payoutNumber: string;
    status: string;
    payoutPercent: string;
    holdbackPercent: string;
    grossProfitAmount: string;
    holdbackAmount: string;
    payoutAmount: string;
    currency: string;
    paymentMethod: string | null;
    bankReference: string | null;
    createdAt: string;
    approvedAt: string | null;
    paidAt: string | null;
    run: { id: number; runNumber: string; fromDate: string; toDate: string };
  }>;
};

function fmtAmount(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvestorPayoutsPage() {
  const [data, setData] = useState<PayoutPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/investor/payouts", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || "Failed to load payouts.");
        if (active) setData(payload as PayoutPayload);
      } catch (err: any) {
        if (active) setError(err?.message || "Failed to load payouts.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="h-7 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <SkeletonCards count={4} />
        <Card>
          <CardHeader><div className="h-4 w-32 animate-pulse rounded bg-muted" /></CardHeader>
          <CardContent><SkeletonTable rows={5} cols={6} /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold md:text-2xl">Investor Payouts</h1>
        <p className="text-sm text-muted-foreground">
          Track payout lifecycle from run creation to final settlement.
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Payout Count</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data?.summary.payoutCount || 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid Count</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data?.summary.paidCount || 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{fmtAmount(data?.summary.totalAmount || "0")}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid Amount</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{fmtAmount(data?.summary.paidAmount || "0")}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payout Register</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payout</TableHead>
                  <TableHead>Run</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="hidden md:table-cell">Method</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead className="hidden lg:table-cell">Approved</TableHead>
                  <TableHead>Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.payouts || []).map((item) => {
                  const badge = statusBadge(item.status);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap font-medium">{item.payoutNumber}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{item.run.runNumber}</TableCell>
                      <TableCell>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-medium">
                        {fmtAmount(item.payoutAmount)} {item.currency}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {item.paymentMethod || "-"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell whitespace-nowrap text-muted-foreground">
                        {shortDate(item.createdAt)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell whitespace-nowrap text-muted-foreground">
                        {shortDate(item.approvedAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {shortDate(item.paidAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {data?.payouts?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                      No payouts found.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
