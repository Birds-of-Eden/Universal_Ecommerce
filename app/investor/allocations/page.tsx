"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SkeletonTable } from "@/components/investor/InvestorSkeleton";
import { statusBadge, shortDate } from "@/lib/investor-status";

type AllocationPayload = {
  allocations: Array<{
    id: number;
    status: string;
    participationPercent: string;
    committedAmount: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    note: string | null;
    productVariant: {
      id: number;
      sku: string;
      product: { id: number; name: string };
    };
  }>;
};

function fmtAmount(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InvestorAllocationsPage() {
  const [data, setData] = useState<AllocationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/investor/allocations", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || "Failed to load allocations.");
        if (active) setData(payload as AllocationPayload);
      } catch (err: any) {
        if (active) setError(err?.message || "Failed to load allocations.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold md:text-2xl">Investor Allocations</h1>
        <p className="text-sm text-muted-foreground">
          Product participation scopes assigned to your investor account.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Allocation Register</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {loading ? (
            <SkeletonTable rows={5} cols={6} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Share %</TableHead>
                    <TableHead>Committed</TableHead>
                    <TableHead>Effective</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.allocations || []).map((item) => {
                    const badge = statusBadge(item.status);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.productVariant.product.name}
                          <span className="ml-1 text-xs text-muted-foreground">({item.productVariant.sku})</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell>{fmtAmount(item.participationPercent)}%</TableCell>
                        <TableCell className="whitespace-nowrap font-medium">{fmtAmount(item.committedAmount)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {shortDate(item.effectiveFrom)} – {item.effectiveTo ? shortDate(item.effectiveTo) : "ongoing"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.note || "-"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {data?.allocations?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                        No allocations found.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
