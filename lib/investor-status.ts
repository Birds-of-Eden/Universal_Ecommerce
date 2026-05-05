export type BadgeVariant = "default" | "outline" | "secondary" | "destructive";

const STATUS_MAP: Record<string, { variant: BadgeVariant; label?: string }> = {
  // Generic positive
  ACTIVE: { variant: "default" },
  VERIFIED: { variant: "default" },
  PAID: { variant: "default" },
  POSTED: { variant: "default" },
  APPROVED: { variant: "default" },
  APPLIED: { variant: "default" },
  SETTLED: { variant: "default" },
  READ: { variant: "secondary" },

  // Neutral / pending
  PENDING: { variant: "secondary" },
  UNDER_REVIEW: { variant: "secondary", label: "Under Review" },
  PENDING_REVIEW: { variant: "secondary", label: "Pending Review" },
  DRAFT: { variant: "secondary" },
  CREATED: { variant: "secondary" },
  PROCESSING: { variant: "secondary" },
  UNREAD: { variant: "outline" },

  // Negative
  INACTIVE: { variant: "outline" },
  EXPIRED: { variant: "destructive" },
  REJECTED: { variant: "destructive" },
  CANCELLED: { variant: "destructive" },
  FAILED: { variant: "destructive" },
  SUSPENDED: { variant: "destructive" },
};

export function statusBadge(status: string): { variant: BadgeVariant; label: string } {
  const entry = STATUS_MAP[status?.toUpperCase()];
  return {
    variant: entry?.variant ?? "outline",
    label: entry?.label ?? status,
  };
}

export function shortDate(value?: string | null): string {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function shortDateTime(value?: string | null): string {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) +
    " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
