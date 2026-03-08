"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import AdminDashboard, {
  type DashboardStats,
  type TimeRange,
} from "@/components/admin/AdminDashboard";

const dashboardCache = new Map<TimeRange, DashboardStats>();
let lastSelectedRange: TimeRange = "today";

// Memoized admin page to prevent unnecessary re-renders
const AdminPage = memo(function AdminPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>(lastSelectedRange);
  const [stats, setStats] = useState<DashboardStats | null>(
    () => dashboardCache.get(lastSelectedRange) ?? null
  );
  const [loading, setLoading] = useState<boolean>(
    () => !dashboardCache.has(lastSelectedRange)
  );

  const fetchDashboardData = useCallback(
    async (range: TimeRange, force = false) => {
      if (!force) {
        const cached = dashboardCache.get(range);
        if (cached) {
          setStats(cached);
          setLoading(false);
          return;
        }
      }

      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        setLoading(true);
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`/api/admindashboard?range=${range}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: DashboardStats = await response.json();
        dashboardCache.set(range, data);
        setStats(data);
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Error fetching dashboard data:", error);
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchDashboardData(timeRange);
  }, [fetchDashboardData, timeRange]);

  const handleRefresh = useCallback(() => {
    fetchDashboardData(timeRange, true);
  }, [fetchDashboardData, timeRange]);

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    lastSelectedRange = range;
    setTimeRange(range);

    const cached = dashboardCache.get(range);
    if (cached) {
      setStats(cached);
      setLoading(false);
    }
  }, []);

  const dashboardProps = useMemo(
    () => ({
      stats,
      loading,
      timeRange,
      onTimeRangeChange: handleTimeRangeChange,
      onRefresh: handleRefresh,
    }),
    [handleRefresh, handleTimeRangeChange, loading, stats, timeRange]
  );

  return (
    <div>
      <AdminDashboard {...dashboardProps} />
    </div>
  );
});

export default AdminPage;
