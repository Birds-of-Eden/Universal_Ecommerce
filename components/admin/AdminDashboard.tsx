"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  ShoppingCart,
  Package,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock3,
  RefreshCw,
  ArrowRight,
  ArrowUpRight,
  Star,
  Target,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalProducts: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStockProducts: number;
  recentOrders: DashboardOrder[];
  topProducts: DashboardProduct[];
  userGrowth: number;
  revenueGrowth: number;
  orderGrowth: number;
  averageOrderValue: number;
  conversionRate: number;
  successRate: number;
}

interface DashboardOrder {
  id: number;
  grandTotal: number;
  status: string;
  user?: {
    name?: string | null;
  } | null;
}

interface DashboardProduct {
  id: number;
  name: string;
  soldCount: number;
  ratingAvg: number;
  price: number;
}

interface SalesDataItem {
  label: string;
  sales: number;
  revenue: number;
}

const rangeOptions = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
] as const;

const rangeTitleMap = {
  today: "Today Overview",
  week: "Weekly Performance",
  month: "Monthly Performance",
  year: "Yearly Performance",
} as const;

const compareLabelMap = {
  today: "vs yesterday",
  week: "vs last week",
  month: "vs last month",
  year: "vs last year",
} as const;

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<
    "today" | "week" | "month" | "year"
  >("today");
  const [activeChart, setActiveChart] = useState<"sales" | "revenue">(
    "revenue"
  );
  const [dashboardCache, setDashboardCache] = useState<
    Map<string, DashboardStats>
  >(new Map());

  const fetchDashboardData = useCallback(async () => {
    const cacheKey = timeRange;

    if (dashboardCache.has(cacheKey)) {
      const cachedData = dashboardCache.get(cacheKey);
      if (cachedData) {
        setStats(cachedData);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admindashboard?range=${timeRange}`);
      if (response.ok) {
        const data: DashboardStats = await response.json();
        setDashboardCache((prev) => new Map(prev).set(cacheKey, data));
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [dashboardCache, timeRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  }, []);

  const formatNumber = useCallback((value: number) => {
    return new Intl.NumberFormat("en-US").format(value || 0);
  }, []);

  const getStatusColor = useCallback((status: string) => {
    const colors = {
      DELIVERED:
        "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/20",
      PROCESSING:
        "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-400/10 dark:text-blue-400 dark:border-blue-400/20",
      PENDING:
        "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-400/10 dark:text-amber-400 dark:border-amber-400/20",
      SHIPPED:
        "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-400/10 dark:text-indigo-400 dark:border-indigo-400/20",
      CANCELLED: "bg-destructive/10 text-destructive border-destructive/20",
    } as const;
    return (
      colors[status as keyof typeof colors] ||
      "bg-muted/10 text-muted-foreground border-border"
    );
  }, []);

  const getStatusText = (status: string) => {
    const texts = {
      DELIVERED: "Delivered",
      PROCESSING: "Processing",
      PENDING: "Pending",
      SHIPPED: "Shipped",
      CANCELLED: "Cancelled",
    };
    return texts[status as keyof typeof texts] || status;
  };

  const salesData = useMemo((): SalesDataItem[] => {
    if (!stats) return [];

    const totalOrders = stats.totalOrders || 0;
    const totalRevenue = stats.totalRevenue || 0;

    if (timeRange === "today") {
      return [{ label: "Today", sales: totalOrders, revenue: totalRevenue }];
    }

    if (timeRange === "week") {
      const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const perDaySales = totalOrders / labels.length || 0;
      const perDayRevenue = totalRevenue / labels.length || 0;
      return labels.map((label, idx) => ({
        label,
        sales: Math.max(0, Math.round(perDaySales + (idx - 3) * 0.5)),
        revenue: Math.max(0, Math.round(perDayRevenue + (idx - 3) * 500)),
      }));
    }

    if (timeRange === "month") {
      const now = new Date();
      const daysInMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
      ).getDate();
      const perDaySales = totalOrders / daysInMonth || 0;
      const perDayRevenue = totalRevenue / daysInMonth || 0;
      return Array.from({ length: daysInMonth }, (_, index) => ({
        label: String(index + 1),
        sales: Math.max(0, Math.round(perDaySales)),
        revenue: Math.max(0, Math.round(perDayRevenue)),
      }));
    }

    const monthLabels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const perMonthSales = totalOrders / monthLabels.length || 0;
    const perMonthRevenue = totalRevenue / monthLabels.length || 0;
    return monthLabels.map((label, idx) => ({
      label,
      sales: Math.max(0, Math.round(perMonthSales + idx)),
      revenue: Math.max(0, Math.round(perMonthRevenue + idx * 1000)),
    }));
  }, [stats, timeRange]);

  const maxSeriesValue = useMemo(() => {
    const points = salesData.map((item) =>
      activeChart === "sales" ? item.sales : item.revenue
    );
    return Math.max(...points, 1);
  }, [activeChart, salesData]);

  const totalSoldAcrossTop = useMemo(
    () =>
      stats?.topProducts?.reduce((sum, product) => sum + (product.soldCount || 0), 0) ||
      0,
    [stats]
  );

  if (loading && !stats) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="h-24 rounded-2xl border border-border bg-card animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl border border-border bg-card animate-pulse"
            />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="h-80 rounded-2xl border border-border bg-card animate-pulse xl:col-span-2" />
          <div className="h-80 rounded-2xl border border-border bg-card animate-pulse" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center bg-card rounded-2xl p-8 border border-border">
          <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-7 w-7 text-destructive" />
          </div>
          <p className="text-foreground text-lg font-semibold mb-4">
            Failed to load dashboard data
          </p>
          <button
            onClick={fetchDashboardData}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Revenue",
      value: formatCurrency(stats.totalRevenue),
      growth: stats.revenueGrowth,
      compare: compareLabelMap[timeRange],
      icon: DollarSign,
    },
    {
      title: "Orders",
      value: formatNumber(stats.totalOrders),
      growth: stats.orderGrowth,
      compare: compareLabelMap[timeRange],
      icon: ShoppingCart,
    },
    {
      title: "Customers",
      value: formatNumber(stats.totalUsers),
      growth: stats.userGrowth,
      compare: compareLabelMap[timeRange],
      icon: Users,
    },
    {
      title: "Products",
      value: formatNumber(stats.totalProducts),
      subtitle: `${stats.lowStockProducts} low stock`,
      icon: Package,
    },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Admin Dashboard
            </p>
            <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
              {rangeTitleMap[timeRange]}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Business performance, operations health and sales snapshot.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
              {rangeOptions.map((range) => (
                <button
                  key={range.value}
                  onClick={() => setTimeRange(range.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    timeRange === range.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <article key={card.title} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{card.value}</p>
                {typeof card.growth === "number" ? (
                  <div className="mt-2 inline-flex items-center gap-1 text-xs">
                    {card.growth >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                    )}
                    <span className="font-medium text-foreground">
                      {Math.abs(card.growth)}%
                    </span>
                    <span className="text-muted-foreground">{card.compare}</span>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">{card.subtitle}</p>
                )}
              </div>
              <div className="rounded-xl border border-border bg-muted/40 p-2.5">
                <card.icon className="h-5 w-5 text-foreground" />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-border bg-card p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Sales Trend</h2>
              <p className="text-sm text-muted-foreground">
                {activeChart === "sales" ? "Units sold" : "Revenue"} by selected range
              </p>
            </div>
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
              <button
                onClick={() => setActiveChart("revenue")}
                className={`rounded-md px-3 py-1 text-xs ${
                  activeChart === "revenue"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Revenue
              </button>
              <button
                onClick={() => setActiveChart("sales")}
                className={`rounded-md px-3 py-1 text-xs ${
                  activeChart === "sales"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                Sales
              </button>
            </div>
          </div>
          <div className="h-64">
            <div className="flex h-full items-end gap-2">
              {salesData.map((item) => {
                const rawValue = activeChart === "sales" ? item.sales : item.revenue;
                const height = Math.max(8, (rawValue / maxSeriesValue) * 100);
                return (
                  <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                    <div className="w-full rounded-md bg-muted/60">
                      <div
                        className="w-full rounded-md bg-primary/80 transition-all"
                        style={{ height: `${height}%`, minHeight: 12 }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </article>

        <article className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold text-foreground">Operations</h2>
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Conversion Rate</span>
                <span className="font-semibold text-foreground">{stats.conversionRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${Math.min(100, Math.max(0, stats.conversionRate))}%` }}
                />
              </div>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fulfillment Success</span>
                <span className="font-semibold text-foreground">{stats.successRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{ width: `${Math.min(100, Math.max(0, stats.successRate))}%` }}
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock3 className="h-4 w-4" />
                  Pending Orders
                </div>
                <p className="mt-1 text-xl font-semibold text-foreground">{stats.pendingOrders}</p>
              </div>
              <div className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  Low Stock
                </div>
                <p className="mt-1 text-xl font-semibold text-foreground">{stats.lowStockProducts}</p>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recent Orders</h2>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              View all
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {stats.recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">Order #{order.id}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.user?.name || "Guest Customer"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrency(order.grandTotal)}
                  </p>
                  <span
                    className={`mt-1 inline-flex rounded-md border px-2 py-0.5 text-[11px] ${getStatusColor(order.status)}`}
                  >
                    {getStatusText(order.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Top Products</h2>
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Manage
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {stats.topProducts.map((product, index) => (
              <div
                key={product.id}
                className="flex items-center justify-between rounded-xl border border-border bg-muted/20 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {index + 1}. {product.name}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" />
                      {product.soldCount} sold
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-amber-500" />
                      {product.ratingAvg}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(product.price)}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <article className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Growth KPIs</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border p-3">
              <div className="mb-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-4 w-4" />
                Avg Order Value
              </div>
              <p className="text-lg font-semibold text-foreground">
                {formatCurrency(stats.averageOrderValue)}
              </p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="mb-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Target className="h-4 w-4" />
                Conversion
              </div>
              <p className="text-lg font-semibold text-foreground">{stats.conversionRate}%</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <div className="mb-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Success Rate
              </div>
              <p className="text-lg font-semibold text-foreground">{stats.successRate}%</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Top Product Share</h2>
          <div className="space-y-3">
            {stats.topProducts.slice(0, 4).map((product) => {
              const percentage =
                totalSoldAcrossTop > 0
                  ? Math.round((product.soldCount / totalSoldAcrossTop) * 100)
                  : 0;
              return (
                <div
                  key={product.id}
                  className="rounded-xl border border-border bg-muted/20 p-3"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <p className="truncate text-sm font-medium text-foreground">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{percentage}%</p>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </div>
  );
}
