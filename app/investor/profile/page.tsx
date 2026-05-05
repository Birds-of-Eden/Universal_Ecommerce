"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SkeletonCards, SkeletonForm } from "@/components/investor/InvestorSkeleton";
import { statusBadge, shortDateTime } from "@/lib/investor-status";

type Payload = {
  investor: {
    id: number;
    code: string;
    name: string;
    legalName: string | null;
    email: string | null;
    phone: string | null;
    taxNumber: string | null;
    nationalIdNumber: string | null;
    passportNumber: string | null;
    bankName: string | null;
    bankAccountName: string | null;
    bankAccountNumber: string | null;
    beneficiaryVerifiedAt: string | null;
    beneficiaryVerificationNote: string | null;
    status: string;
    kycStatus: string;
    notes: string | null;
    updatedAt: string;
  };
  requests: Array<{
    id: number;
    status: string;
    requestedChanges: Record<string, unknown>;
    requestNote: string | null;
    reviewNote: string | null;
    submittedAt: string;
    reviewedAt: string | null;
    appliedAt: string | null;
    submittedBy: { id: string; name: string | null; email: string } | null;
    reviewedBy: { id: string; name: string | null; email: string } | null;
  }>;
};

const FORM_FIELDS: [string, string][] = [
  ["name", "Display Name"],
  ["legalName", "Legal Name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["taxNumber", "Tax Number"],
  ["nationalIdNumber", "National ID"],
  ["passportNumber", "Passport Number"],
  ["bankName", "Bank Name"],
  ["bankAccountName", "Account Name"],
  ["bankAccountNumber", "Account Number"],
];

export default function InvestorProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<Payload | null>(null);
  const [form, setForm] = useState({
    name: "", legalName: "", email: "", phone: "", taxNumber: "",
    nationalIdNumber: "", passportNumber: "", bankName: "",
    bankAccountName: "", bankAccountNumber: "", notes: "", requestNote: "",
  });

  const load = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/investor/profile", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load investor profile.");
      const next = payload as Payload;
      setData(next);
      setForm({
        name: next.investor.name ?? "",
        legalName: next.investor.legalName ?? "",
        email: next.investor.email ?? "",
        phone: next.investor.phone ?? "",
        taxNumber: next.investor.taxNumber ?? "",
        nationalIdNumber: next.investor.nationalIdNumber ?? "",
        passportNumber: next.investor.passportNumber ?? "",
        bankName: next.investor.bankName ?? "",
        bankAccountName: next.investor.bankAccountName ?? "",
        bankAccountNumber: next.investor.bankAccountNumber ?? "",
        notes: next.investor.notes ?? "",
        requestNote: "",
      });
    } catch (error: any) {
      toast.error(error?.message || "Failed to load investor profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const submit = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/investor/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to submit profile request.");
      toast.success("Profile update request submitted.");
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Failed to submit profile request.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="h-7 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-72 animate-pulse rounded bg-muted" />
        </div>
        <SkeletonCards count={3} />
        <Card>
          <CardHeader><div className="h-4 w-48 animate-pulse rounded bg-muted" /></CardHeader>
          <CardContent><SkeletonForm fields={9} /></CardContent>
        </Card>
      </div>
    );
  }

  const statusBadgeInvestor = data ? statusBadge(data.investor.status) : null;
  const kycBadge = data ? statusBadge(data.investor.kycStatus) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold md:text-2xl">Profile</h1>
        <p className="text-sm text-muted-foreground">
          Review your identity and beneficiary information. Sensitive changes go through approval.
        </p>
      </div>

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Investor Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={statusBadgeInvestor!.variant} className="text-sm px-3 py-1">
                  {statusBadgeInvestor!.label}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">KYC Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={kycBadge!.variant} className="text-sm px-3 py-1">
                  {kycBadge!.label}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Beneficiary Verified</CardTitle>
              </CardHeader>
              <CardContent>
                {data.investor.beneficiaryVerifiedAt ? (
                  <Badge variant="default" className="text-sm px-3 py-1">
                    {shortDateTime(data.investor.beneficiaryVerifiedAt)}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-sm px-3 py-1">Pending</Badge>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submit Profile Update Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {FORM_FIELDS.map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label>{label}</Label>
                    <Input
                      value={form[key as keyof typeof form] as string}
                      onChange={(e) => setForm((c) => ({ ...c, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((c) => ({ ...c, notes: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Request Note</Label>
                <Textarea value={form.requestNote} onChange={(e) => setForm((c) => ({ ...c, requestNote: e.target.value }))} />
              </div>
              <Button onClick={() => void submit()} disabled={saving}>
                {saving ? "Submitting..." : "Submit Update Request"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No profile requests found.</p>
              ) : (
                data.requests.map((item) => {
                  const reqBadge = statusBadge(item.status);
                  return (
                    <div key={item.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">Request #{item.id}</p>
                        <Badge variant={reqBadge.variant}>{reqBadge.label}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted: {shortDateTime(item.submittedAt)} | Reviewed: {shortDateTime(item.reviewedAt)}
                      </p>
                      {item.requestNote ? <p className="mt-2 text-sm">Request note: {item.requestNote}</p> : null}
                      {item.reviewNote ? <p className="mt-1 text-sm text-muted-foreground">Review note: {item.reviewNote}</p> : null}
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
