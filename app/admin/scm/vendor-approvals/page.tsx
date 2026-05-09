"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { 
  Badge, 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Input,
  Label,
  Textarea,
} from "@/components/ui";
import { 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Filter,
  Building2,
  Mail,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  FileText,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";

type RequestRow = {
  id: number;
  requestType: "PROFILE_UPDATE" | "DOCUMENT_UPDATE" | "ANNUAL_RENEWAL";
  status: "PENDING" | "APPROVED" | "REJECTED";
  payload: unknown;
  note: string | null;
  reviewNote: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: { id: number; code: string; name: string; email: string | null };
  requestedBy: { id: string; name: string | null; email: string | null };
  reviewedBy: { id: string; name: string | null; email: string | null } | null;
};

function fmtDate(value?: string | null) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function getRequestTypeLabel(type: string) {
  switch (type) {
    case "PROFILE_UPDATE":
      return "Profile Update";
    case "DOCUMENT_UPDATE":
      return "Document Update";
    case "ANNUAL_RENEWAL":
      return "Annual Renewal";
    default:
      return type;
  }
}

function getRequestTypeColor(type: string) {
  switch (type) {
    case "PROFILE_UPDATE":
      return "bg-info/10 text-info border-info/20";
    case "DOCUMENT_UPDATE":
      return "bg-warning/10 text-warning border-warning/20";
    case "ANNUAL_RENEWAL":
      return "bg-primary/10 text-primary border-primary/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-warning/10 text-warning border-warning/20";
    case "APPROVED":
      return "bg-success/10 text-success border-success/20";
    case "REJECTED":
      return "bg-destructive/10 text-destructive border-destructive/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "PENDING":
      return Clock;
    case "APPROVED":
      return CheckCircle;
    case "REJECTED":
      return XCircle;
    default:
      return AlertCircle;
  }
}

// Pagination Component
function Pagination({ currentPage, totalPages, onPageChange }: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void;
}) {
  const getVisiblePages = () => {
    const pages: number[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);
      
      if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {getVisiblePages().map((page) => (
        <Button
          key={page}
          variant={currentPage === page ? "default" : "outline"}
          size="sm"
          onClick={() => onPageChange(page)}
          className="h-8 w-8 p-0"
        >
          {page}
        </Button>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function VendorApprovalsPage() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [expandedPayload, setExpandedPayload] = useState<number | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const load = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      const response = await fetch(
        `/api/scm/supplier-profile-requests${params.size > 0 ? `?${params.toString()}` : ""}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load vendor approvals.");
      }
      setRows(Array.isArray(payload) ? (payload as RequestRow[]) : []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load vendor approvals.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [search, status]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, status]);

  // Pagination calculations
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return rows.slice(start, end);
  }, [rows, currentPage]);

  const totalPages = Math.ceil(rows.length / itemsPerPage);

  const review = async (id: number, decision: "APPROVE" | "REJECT") => {
    try {
      setSavingId(id);
      const response = await fetch("/api/scm/supplier-profile-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          decision,
          reviewNote: reviewNotes[id] || "",
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to review request.");
      }
      toast.success(decision === "APPROVE" ? "Request approved." : "Request rejected.");
      await load();
      // Clear review note after successful review
      setReviewNotes((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    } catch (error: any) {
      toast.error(error?.message || "Failed to review request.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
          Vendor Approvals
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
          Review supplier profile/document requests and apply governance decisions.
        </p>
      </div>

      {/* Filters Card */}
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base sm:text-lg">Request Queue</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void load()} disabled={loading} size="sm">
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="sm:hidden"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          {/* Desktop Filters */}
          <div className="hidden sm:grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Search</Label>
              <Input
                placeholder="Supplier name, code, or requester..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Status</Label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {/* Mobile Filters */}
          {showFilters && (
            <div className="space-y-3 sm:hidden">
              <div className="space-y-1.5">
                <Label className="text-xs">Search</Label>
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
              <Button variant="outline" onClick={() => setShowFilters(false)} className="w-full">
                Close Filters
              </Button>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {/* Desktop Table View */}
          {!loading && paginatedRows.length > 0 && (
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">Request</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">Supplier</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">Requested By</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">Date</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row) => {
                    const StatusIcon = getStatusIcon(row.status);
                    return (
                      <tr key={row.id} className="border-b border-border hover:bg-muted/40 transition-colors">
                        <td className="py-3 px-2">
                          <div className="font-medium text-sm text-foreground">#{row.id}</div>
                          {row.note && (
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              Note: {row.note}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <div className="text-sm font-medium text-foreground">{row.supplier.name}</div>
                          <div className="text-xs text-muted-foreground">Code: {row.supplier.code}</div>
                         </td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className={cn("text-xs", getRequestTypeColor(row.requestType))}>
                            {getRequestTypeLabel(row.requestType)}
                          </Badge>
                         </td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className={cn("text-xs", getStatusColor(row.status))}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {row.status}
                          </Badge>
                         </td>
                        <td className="py-3 px-2">
                          <div className="text-sm text-foreground">
                            {row.requestedBy.name || "N/A"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {row.requestedBy.email || "No email"}
                          </div>
                         </td>
                        <td className="py-3 px-2">
                          <div className="text-sm text-foreground">
                            {fmtDate(row.requestedAt)}
                          </div>
                         </td>
                        <td className="py-3 px-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setExpandedPayload(expandedPayload === row.id ? null : row.id)}
                            className="h-8 px-3 text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                         </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile Card View */}
          {!loading && paginatedRows.length > 0 && (
            <div className="space-y-3 lg:hidden">
              {paginatedRows.map((row) => {
                const StatusIcon = getStatusIcon(row.status);
                const isExpanded = expandedPayload === row.id;
                
                return (
                  <Card key={row.id} className="border-border shadow-sm">
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Request #{row.id}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {fmtDate(row.requestedAt)}
                          </p>
                        </div>
                        <Badge variant="outline" className={cn("text-xs shrink-0 ml-2", getStatusColor(row.status))}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {row.status}
                        </Badge>
                      </div>

                      {/* Supplier Info */}
                      <div className="flex items-start gap-2">
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">{row.supplier.name}</p>
                          <p className="text-xs text-muted-foreground">Code: {row.supplier.code}</p>
                        </div>
                      </div>

                      {/* Request Type */}
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <Badge variant="outline" className={cn("text-xs", getRequestTypeColor(row.requestType))}>
                          {getRequestTypeLabel(row.requestType)}
                        </Badge>
                      </div>

                      {/* Requested By */}
                      <div className="flex items-start gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground">
                            {row.requestedBy.name || "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground break-all">
                            {row.requestedBy.email || "No email"}
                          </p>
                        </div>
                      </div>

                      {/* Note */}
                      {row.note && (
                        <div className="rounded-md bg-muted/30 p-2">
                          <p className="text-xs text-muted-foreground">
                            Note: {row.note}
                          </p>
                        </div>
                      )}

                      {/* Payload Toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedPayload(isExpanded ? null : row.id)}
                        className="w-full justify-between text-xs"
                      >
                        <span>{isExpanded ? "Hide" : "View"} Payload Details</span>
                        <Eye className="h-3 w-3" />
                      </Button>

                      {isExpanded && (
                        <details open className="rounded-md border border-border bg-muted/30 p-3">
                          <summary className="cursor-pointer text-xs font-medium mb-2">
                            Payload Snapshot
                          </summary>
                          <pre className="text-xs whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                            {JSON.stringify(row.payload, null, 2)}
                          </pre>
                        </details>
                      )}

                      {/* Review Section for Pending */}
                      {row.status === "PENDING" ? (
                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <Textarea
                            placeholder="Add review note (optional)..."
                            value={reviewNotes[row.id] || ""}
                            onChange={(event) =>
                              setReviewNotes((current) => ({
                                ...current,
                                [row.id]: event.target.value,
                              }))
                            }
                            rows={2}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => void review(row.id, "APPROVE")}
                              disabled={savingId === row.id}
                              className="flex-1"
                              size="sm"
                            >
                              {savingId === row.id ? "Processing..." : "Approve"}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => void review(row.id, "REJECT")}
                              disabled={savingId === row.id}
                              className="flex-1"
                              size="sm"
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-border/50">
                          <div className="flex items-start gap-2 text-xs">
                            <Clock className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                            <div className="text-muted-foreground">
                              Reviewed: {fmtDate(row.reviewedAt)} by {row.reviewedBy?.email || "N/A"}
                              {row.reviewNote && (
                                <p className="mt-1">Note: {row.reviewNote}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!loading && paginatedRows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No requests found.</p>
              <p className="text-xs text-muted-foreground mt-1">
                {search || status ? "Try adjusting your filters." : "Requests will appear here when submitted."}
              </p>
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}