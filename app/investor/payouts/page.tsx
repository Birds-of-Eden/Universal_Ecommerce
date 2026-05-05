"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Payout</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Run</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Status</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Amount</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground hidden md:table-cell">Method</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground hidden lg:table-cell">Created</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground hidden lg:table-cell">Approved</th>
                  <th className="pb-2 font-medium text-muted-foreground">Paid</th>
                </tr>
              </thead>
              <tbody>
                {(data?.payouts || []).map((item) => {
                  const badge = statusBadge(item.status);
                  return (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium whitespace-nowrap">{item.payoutNumber}</td>
                      <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">{item.run.runNumber}</td>
                      <td className="py-3 pr-4">
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap font-medium">
                        {fmtAmount(item.payoutAmount)} {item.currency}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell">
                        {item.paymentMethod || "-"}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground hidden lg:table-cell">
                        {shortDate(item.createdAt)}
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground hidden lg:table-cell">
                        {shortDate(item.approvedAt)}
                      </td>
                      <td className="py-3 whitespace-nowrap text-muted-foreground">
                        {shortDate(item.paidAt)}
                      </td>
                    </tr>
                  );
                })}
                {data?.payouts?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                      No payouts found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
