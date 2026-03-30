"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCcw, Search } from "lucide-react";

type ActivityLogRow = {
  id: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipHash?: string | null;
  userAgent?: string | null;
  createdAt: string;
  updatetAt: string;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
};

type ActivityLogResponse = {
  logs: ActivityLogRow[];
  total: number;
  page: number;
  pageSize: number;
  entities: string[];
  fullAccess: boolean;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string" ? payload.error : "Request failed.",
    );
  }
  return payload as T;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

function formatMetadata(metadata: Record<string, unknown> | null | undefined): string {
  if (!metadata) return "-";
  const copy = { ...metadata };
  if ("permissionKeys" in copy) {
    delete copy.permissionKeys;
  }
  const entries = Object.entries(copy);
  if (entries.length === 0) return "-";
  return entries
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" | ");
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [entities, setEntities] = useState<string[]>([]);
  const [entity, setEntity] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [fullAccess, setFullAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [pageSize, total],
  );

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search.trim()) {
        params.set("search", search.trim());
      }
      if (entity) {
        params.set("entity", entity);
      }

      const data = await fetchJson<ActivityLogResponse>(
        `/api/admin/activity-log?${params.toString()}`,
      );
      setLogs(data.logs);
      setEntities(data.entities);
      setTotal(data.total);
      setFullAccess(data.fullAccess);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load activity logs.",
      );
    } finally {
      setLoading(false);
    }
  }, [entity, page, pageSize, search]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    setPage(1);
  }, [entity, search]);

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activity Log</h1>
          <p className="text-sm text-muted-foreground">
            {fullAccess
              ? "Admin and superadmin can see all activity."
              : "Visible activity is filtered by your assigned permissions."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadLogs()}
          className="btn-secondary inline-flex items-center gap-2 rounded px-4 py-2"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
        <label className="flex items-center gap-2 rounded-md border border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setSearch(searchInput);
              }
            }}
            placeholder="Search action, entity, user, entity id"
            className="h-11 w-full bg-transparent text-sm outline-none"
          />
        </label>

        <select
          value={entity}
          onChange={(event) => setEntity(event.target.value)}
          className="h-11 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="">All entities</option>
          {entities.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setSearch(searchInput)}
          className="btn-primary rounded px-4 py-2 text-sm"
        >
          Apply
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Loading activity log...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No activity log found for current filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-t border-border align-top">
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium">{log.action}</td>
                    <td className="px-4 py-3">
                      <div>{log.entity}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{log.user?.name || "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        {log.user?.email || log.userId || "System"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{log.entityId || "-"}</div>
                      <div className="text-xs text-muted-foreground">
                        {log.user?.role || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatMetadata(log.metadata)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
          <div className="text-muted-foreground">
            Showing {logs.length} of {total} records
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
              className="btn-secondary rounded px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="min-w-20 text-center text-muted-foreground">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || loading}
              className="btn-secondary rounded px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
