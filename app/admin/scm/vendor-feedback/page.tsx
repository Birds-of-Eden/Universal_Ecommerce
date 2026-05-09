"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { 
  Button, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Input,
  Label,
  Textarea,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Badge,
} from "@/components/ui";
import { 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Filter,
  Building2,
  Mail,
  User,
  Star,
  Clock,
  Plus,
  ThumbsUp,
  Truck,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

type SupplierOption = {
  id: number;
  code: string;
  name: string;
};

type FeedbackRow = {
  id: number;
  sourceType: string;
  sourceReference: string | null;
  clientName: string | null;
  clientEmail: string | null;
  rating: number;
  serviceQualityRating: number | null;
  deliveryRating: number | null;
  complianceRating: number | null;
  comment: string | null;
  createdAt: string;
  supplier: SupplierOption;
  createdBy: { id: string; name: string | null; email: string | null } | null;
};

type FeedbackResponse = {
  suppliers: SupplierOption[];
  rows: FeedbackRow[];
};

function fmtDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString();
}

function getRatingColor(rating: number) {
  if (rating >= 4) return "text-success";
  if (rating >= 3) return "text-warning";
  return "text-destructive";
}

function getRatingStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            "h-3 w-3",
            star <= rating ? "fill-current text-warning" : "text-muted-foreground"
          )}
        />
      ))}
    </div>
  );
}

function getSourceTypeColor(sourceType: string) {
  switch (sourceType) {
    case "INTERNAL":
      return "bg-info/10 text-info border-info/20";
    case "CLIENT":
      return "bg-primary/10 text-primary border-primary/20";
    case "VENDOR_SELF":
      return "bg-success/10 text-success border-success/20";
    default:
      return "bg-muted text-muted-foreground border-border";
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

// Feedback Modal Component
function FeedbackModal({ 
  open, 
  onOpenChange, 
  suppliers,
  selectedSupplierId,
  onSupplierChange,
  form,
  onFormChange,
  onSave,
  saving
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: SupplierOption[];
  selectedSupplierId: string;
  onSupplierChange: (value: string) => void;
  form: {
    sourceType: string;
    sourceReference: string;
    clientName: string;
    clientEmail: string;
    rating: string;
    serviceQualityRating: string;
    deliveryRating: string;
    complianceRating: string;
    comment: string;
  };
  onFormChange: (updates: Partial<typeof form>) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Create Vendor Feedback</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Capture service quality and vendor performance feedback from operations or clients.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Supplier Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Supplier *</Label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={selectedSupplierId}
              onChange={(event) => onSupplierChange(event.target.value)}
            >
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name} ({supplier.code})
                </option>
              ))}
            </select>
          </div>

          {/* Source Information */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Source Type</Label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                value={form.sourceType}
                onChange={(event) =>
                  onFormChange({ sourceType: event.target.value })
                }
              >
                <option value="INTERNAL">Internal Team</option>
                <option value="CLIENT">Client Feedback</option>
                <option value="VENDOR_SELF">Vendor Self-Assessment</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Source Reference</Label>
              <Input
                placeholder="PO / WO / Ticket reference"
                value={form.sourceReference}
                onChange={(event) =>
                  onFormChange({ sourceReference: event.target.value })
                }
                className="text-sm"
              />
            </div>
          </div>

          {/* Client Information */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Client Name</Label>
              <Input
                placeholder="Client or department name"
                value={form.clientName}
                onChange={(event) =>
                  onFormChange({ clientName: event.target.value })
                }
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Client Email</Label>
              <Input
                type="email"
                placeholder="client@example.com"
                value={form.clientEmail}
                onChange={(event) =>
                  onFormChange({ clientEmail: event.target.value })
                }
                className="text-sm"
              />
            </div>
          </div>

          {/* Ratings Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Ratings (1-5)</Label>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Overall</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    step={1}
                    value={form.rating}
                    onChange={(event) =>
                      onFormChange({ rating: event.target.value })
                    }
                    className="text-sm w-20"
                  />
                  <div className="flex-1">
                    {getRatingStars(parseInt(form.rating) || 0)}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Service Quality</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    step={1}
                    value={form.serviceQualityRating}
                    onChange={(event) =>
                      onFormChange({ serviceQualityRating: event.target.value })
                    }
                    className="text-sm w-20"
                  />
                  <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Delivery</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    step={1}
                    value={form.deliveryRating}
                    onChange={(event) =>
                      onFormChange({ deliveryRating: event.target.value })
                    }
                    className="text-sm w-20"
                  />
                  <Truck className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Compliance</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    step={1}
                    value={form.complianceRating}
                    onChange={(event) =>
                      onFormChange({ complianceRating: event.target.value })
                    }
                    className="text-sm w-20"
                  />
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Comment</Label>
            <Textarea
              placeholder="Detailed feedback about vendor performance, strengths, areas for improvement..."
              value={form.comment}
              onChange={(event) =>
                onFormChange({ comment: event.target.value })
              }
              rows={4}
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter className="flex flex-row justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Creating..." : "Create Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function VendorFeedbackPage() {
  const [data, setData] = useState<FeedbackResponse>({ suppliers: [], rows: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [form, setForm] = useState({
    sourceType: "INTERNAL",
    sourceReference: "",
    clientName: "",
    clientEmail: "",
    rating: "5",
    serviceQualityRating: "5",
    deliveryRating: "5",
    complianceRating: "5",
    comment: "",
  });

  const load = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (supplierId) params.set("supplierId", supplierId);
      const response = await fetch(
        `/api/scm/supplier-feedback${params.size > 0 ? `?${params.toString()}` : ""}`,
        { cache: "no-store" },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to load supplier feedback.");
      }
      setData(payload as FeedbackResponse);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load supplier feedback.");
      setData({ suppliers: [], rows: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [search, supplierId]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, supplierId]);

  // Pagination calculations
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.rows.slice(start, end);
  }, [data.rows, currentPage]);

  const totalPages = Math.ceil(data.rows.length / itemsPerPage);

  const resetForm = () => {
    setForm({
      sourceType: "INTERNAL",
      sourceReference: "",
      clientName: "",
      clientEmail: "",
      rating: "5",
      serviceQualityRating: "5",
      deliveryRating: "5",
      complianceRating: "5",
      comment: "",
    });
    setSupplierId("");
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const createFeedback = async () => {
    if (!supplierId) {
      toast.error("Please select a supplier.");
      return;
    }
    try {
      setSaving(true);
      const response = await fetch("/api/scm/supplier-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: Number(supplierId),
          sourceType: form.sourceType,
          sourceReference: form.sourceReference,
          clientName: form.clientName,
          clientEmail: form.clientEmail,
          rating: Number(form.rating),
          serviceQualityRating: Number(form.serviceQualityRating),
          deliveryRating: Number(form.deliveryRating),
          complianceRating: Number(form.complianceRating),
          comment: form.comment,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to create feedback.");
      }
      toast.success("Supplier feedback created successfully.");
      setModalOpen(false);
      resetForm();
      await load();
    } catch (error: any) {
      toast.error(error?.message || "Failed to create feedback.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            Vendor Feedback
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Capture service quality and vendor performance feedback from operations/clients.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openCreateModal} className="flex-1 sm:flex-initial">
            <Plus className="h-4 w-4 mr-2" />
            Add Feedback
          </Button>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
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

      {/* Filters Card */}
      <Card className="shadow-sm">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Feedback Register</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          {/* Desktop Filters */}
          <div className="hidden sm:flex gap-3">
            <Input
              className="max-w-md text-sm"
              placeholder="Search by supplier, client, or reference..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
            >
              <option value="">All suppliers</option>
              {data.suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name} ({supplier.code})
                </option>
              ))}
            </select>
          </div>

          {/* Mobile Filters */}
          {showFilters && (
            <div className="space-y-3 sm:hidden">
              <Input
                placeholder="Search..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="text-sm"
              />
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={supplierId}
                onChange={(event) => setSupplierId(event.target.value)}
              >
                <option value="">All suppliers</option>
                {data.suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} ({supplier.code})
                  </option>
                ))}
              </select>
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
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">Supplier</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">Rating</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">Source</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">Client</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">Details</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRows.map((row) => (
                    <tr key={row.id} className="border-b border-border hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-2">
                        <div className="font-medium text-sm text-foreground">{row.supplier.name}</div>
                        <div className="text-xs text-muted-foreground">Code: {row.supplier.code}</div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1">
                            <span className={cn("text-sm font-bold", getRatingColor(row.rating))}>
                              {row.rating}/5
                            </span>
                            {getRatingStars(row.rating)}
                          </div>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span>S:{row.serviceQualityRating ?? "N/A"}</span>
                            <span>D:{row.deliveryRating ?? "N/A"}</span>
                            <span>C:{row.complianceRating ?? "N/A"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="outline" className={cn("text-xs", getSourceTypeColor(row.sourceType))}>
                          {row.sourceType}
                        </Badge>
                        {row.sourceReference && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Ref: {row.sourceReference}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {row.clientName && (
                          <div className="text-sm text-foreground">{row.clientName}</div>
                        )}
                        {row.clientEmail && (
                          <div className="text-xs text-muted-foreground">{row.clientEmail}</div>
                        )}
                        {!row.clientName && !row.clientEmail && (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {row.comment ? (
                          <div className="text-sm text-muted-foreground line-clamp-2 max-w-md">
                            {row.comment}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">No comment</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <div className="text-xs text-muted-foreground">
                          {fmtDate(row.createdAt)}
                        </div>
                        {row.createdBy && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            By: {row.createdBy.email}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Mobile Card View */}
          {!loading && paginatedRows.length > 0 && (
            <div className="space-y-3 lg:hidden">
              {paginatedRows.map((row) => (
                <Card key={row.id} className="border-border shadow-sm">
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {row.supplier.name}
                        </p>
                        <p className="text-xs text-muted-foreground">Code: {row.supplier.code}</p>
                      </div>
                      <Badge variant="outline" className={cn("text-xs", getSourceTypeColor(row.sourceType))}>
                        {row.sourceType}
                      </Badge>
                    </div>

                    {/* Rating */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-lg font-bold", getRatingColor(row.rating))}>
                          {row.rating}/5
                        </span>
                        {getRatingStars(row.rating)}
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span>S:{row.serviceQualityRating ?? "-"}</span>
                        <span>D:{row.deliveryRating ?? "-"}</span>
                        <span>C:{row.complianceRating ?? "-"}</span>
                      </div>
                    </div>

                    {/* Source Reference */}
                    {row.sourceReference && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-xs text-muted-foreground">Reference:</span>
                        <span className="text-foreground">{row.sourceReference}</span>
                      </div>
                    )}

                    {/* Client Info */}
                    {(row.clientName || row.clientEmail) && (
                      <div className="space-y-1 pt-1">
                        {row.clientName && (
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-foreground">{row.clientName}</span>
                          </div>
                        )}
                        {row.clientEmail && (
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-foreground break-all">{row.clientEmail}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Comment */}
                    {row.comment && (
                      <div className="rounded-md bg-muted/30 p-2">
                        <p className="text-sm text-muted-foreground">{row.comment}</p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                      <span>{fmtDate(row.createdAt)}</span>
                      {row.createdBy && <span>By: {row.createdBy.email}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && paginatedRows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Star className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No feedback records found.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Click "Add Feedback" to create your first vendor feedback.
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

      {/* Create Feedback Modal */}
      <FeedbackModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        suppliers={data.suppliers}
        selectedSupplierId={supplierId}
        onSupplierChange={setSupplierId}
        form={form}
        onFormChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
        onSave={createFeedback}
        saving={saving}
      />
    </div>
  );
}