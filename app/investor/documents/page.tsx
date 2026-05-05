"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { uploadFile } from "@/lib/upload-file";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SkeletonCards, SkeletonForm } from "@/components/investor/InvestorSkeleton";
import { statusBadge, shortDateTime } from "@/lib/investor-status";

type InvestorDocument = {
  id: number;
  type: string;
  fileUrl: string;
  fileName: string | null;
  documentNumber: string | null;
  issuedAt: string | null;
  expiresAt: string | null;
  status: string;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  isExpired: boolean;
};

type Payload = {
  requiredDocumentTypes: string[];
  investor: {
    id: number;
    code: string;
    name: string;
    status: string;
    kycStatus: string;
    kycVerifiedAt: string | null;
  } | null;
  documents: InvestorDocument[];
  missingDocumentTypes: string[];
};

export default function InvestorDocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [data, setData] = useState<Payload | null>(null);
  const [selectedType, setSelectedType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [documentNumber, setDocumentNumber] = useState("");
  const [issuedAt, setIssuedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/investor/documents", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load investor documents.");
      setData(payload as Payload);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load investor documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const currentByType = useMemo(
    () => new Map((data?.documents || []).map((d) => [d.type, d])),
    [data?.documents],
  );
  const docsUnderReview = useMemo(
    () => (data?.documents || []).filter((d) => d.status === "UNDER_REVIEW"),
    [data?.documents],
  );

  const submitDocument = async () => {
    if (!selectedType || !file) { toast.error("Document type and file are required."); return; }
    try {
      setSaving(true);
      setUploadProgress(0);
      const fileUrl = await uploadFile(file, "/api/upload/investor-kyc", (pct) => {
        setUploadProgress(pct);
      });
      setUploadProgress(100);
      const response = await fetch("/api/investor/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType, fileUrl, fileName: file.name,
          mimeType: file.type || null, fileSize: file.size,
          documentNumber, issuedAt: issuedAt || null,
          expiresAt: expiresAt || null, reviewNote: note || null,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to upload investor document.");
      toast.success("Document submitted for review.");
      setSelectedType(""); setFile(null); setDocumentNumber("");
      setIssuedAt(""); setExpiresAt(""); setNote("");
      setUploadProgress(null);
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Failed to upload investor document.");
      setUploadProgress(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <div className="h-7 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-80 animate-pulse rounded bg-muted" />
        </div>
        <SkeletonCards count={3} />
        <Card>
          <CardHeader><div className="h-4 w-48 animate-pulse rounded bg-muted" /></CardHeader>
          <CardContent><SkeletonForm fields={5} /></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold md:text-2xl">Document Center</h1>
        <p className="text-sm text-muted-foreground">
          Upload required KYC documents, track review notes, and re-submit rejected files.
        </p>
      </div>

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "KYC Status", value: data.investor?.kycStatus || "N/A", isBadge: true },
              { label: "Documents Uploaded", value: String(data.documents.length), isBadge: false },
              { label: "Missing Required", value: String(data.missingDocumentTypes.length), isBadge: false },
            ].map(({ label, value, isBadge }) => (
              <Card key={label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                </CardHeader>
                <CardContent>
                  {isBadge ? (
                    <Badge variant={statusBadge(value).variant} className="text-sm px-3 py-1">
                      {statusBadge(value).label}
                    </Badge>
                  ) : (
                    <p className="text-2xl font-semibold">{value}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {data.investor?.kycStatus === "UNDER_REVIEW" && docsUnderReview.length > 0 ? (
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
              KYC is under review. Re-check these document(s): {docsUnderReview.map((d) => d.type).join(", ")}.
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload or Re-submit Document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="space-y-1">
                  <Label>Document Type</Label>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    <option value="">Select document type</option>
                    {data.requiredDocumentTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label>File</Label>
                  <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </div>
                <div className="space-y-1">
                  <Label>Document Number</Label>
                  <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Issued At</Label>
                  <Input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Expires At</Label>
                  <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Submission Note</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              {uploadProgress !== null && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{uploadProgress < 100 ? "Uploading file..." : "Processing..."}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
              <Button
                onClick={() => void submitDocument()}
                disabled={saving || !selectedType || !file}
              >
                {saving ? (uploadProgress !== null && uploadProgress < 100 ? "Uploading..." : "Submitting...") : "Submit Document"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Required Documents</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {data.requiredDocumentTypes.map((type) => {
                const doc = currentByType.get(type);
                const docBadge = doc ? statusBadge(doc.status) : null;
                return (
                  <div key={type} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium">{type}</p>
                        {docBadge ? (
                          <Badge variant={docBadge.variant}>{docBadge.label}</Badge>
                        ) : (
                          <Badge variant="outline">Not Uploaded</Badge>
                        )}
                      </div>
                      {doc?.fileUrl ? (
                        <Button size="sm" variant="outline" asChild>
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer">View</a>
                        </Button>
                      ) : null}
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      <div>Uploaded: {shortDateTime(doc?.createdAt)}</div>
                      <div>Reviewed: {shortDateTime(doc?.reviewedAt)}</div>
                      <div>Expires: {shortDateTime(doc?.expiresAt)}</div>
                      {doc?.reviewNote ? <div className="text-foreground">Note: {doc.reviewNote}</div> : null}
                    </div>
                    {doc ? (
                      <p className="mt-3 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                        Re-upload if the file was rejected, expired, or needs replacement.
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
