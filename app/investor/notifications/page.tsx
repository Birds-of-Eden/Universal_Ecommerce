"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkeletonNotifications } from "@/components/investor/InvestorSkeleton";
import { statusBadge, shortDateTime } from "@/lib/investor-status";

type Payload = {
  unreadCount: number;
  rows: Array<{
    id: number;
    type: string;
    title: string;
    message: string;
    status: string;
    targetUrl: string | null;
    readAt: string | null;
    createdAt: string;
  }>;
};

function formatType(type: string): string {
  return type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function InvestorNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Payload | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/investor/notifications", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to load notifications.");
      setData(payload as Payload);
    } catch (err: any) {
      setError(err?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const markRead = async (id: number) => {
    const response = await fetch("/api/investor/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) { setError(payload?.error || "Failed to update notification."); return; }
    await load();
  };

  const markAllRead = async () => {
    try {
      setMarkingAll(true);
      const response = await fetch("/api/investor/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Failed to mark all notifications.");
      await load();
    } catch (err: any) {
      setError(err?.message || "Failed to mark all notifications.");
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold md:text-2xl">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Track document review, payout status, and profile request outcomes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>Refresh</Button>
          <Button variant="outline" size="sm" onClick={() => void markAllRead()} disabled={markingAll}>
            {markingAll ? "Marking..." : "Mark All Read"}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <SkeletonNotifications count={5} />
      ) : data ? (
        <>
          {data.unreadCount > 0 ? (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-2 text-sm">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {data.unreadCount}
              </span>
              <span className="text-muted-foreground">unread notification{data.unreadCount > 1 ? "s" : ""}</span>
            </div>
          ) : (
            <div className="rounded-lg border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
              All notifications read.
            </div>
          )}

          <div className="space-y-3">
            {data.rows.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No notifications found.
                </CardContent>
              </Card>
            ) : (
              data.rows.map((row) => {
                const isUnread = !row.readAt;
                const badge = statusBadge(row.status);
                return (
                  <Card key={row.id} className={isUnread ? "border-primary/40 bg-primary/5" : ""}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <CardTitle className="text-base">{row.title}</CardTitle>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatType(row.type)} • {shortDateTime(row.createdAt)}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm">{row.message}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {isUnread ? (
                          <Button size="sm" variant="outline" onClick={() => void markRead(row.id)}>
                            Mark Read
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Read {shortDateTime(row.readAt)}</span>
                        )}
                        {row.targetUrl ? (
                          <Button size="sm" asChild>
                            <Link href={row.targetUrl}>Open</Link>
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
