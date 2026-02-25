"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  ShoppingBag,
  BookOpen,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Star,
  MessageSquare,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Eye,
  ShoppingCart,
  Heart,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  Settings,
  Download,
  Filter,
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalProducts: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStockProducts: number;
  recentOrders: any[];
  topProducts: any[];
  userGrowth: number;
  revenueGrowth: number;
  orderGrowth: number;
  averageOrderValue: number;
  conversionRate: number;
  successRate: number;
}

interface SalesDataItem {
  month: string;
  sales: number;
  revenue: number;
}

export default function GlassmorphismAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<
    "today" | "week" | "month" | "year"
  >("today");
  const [activeChart, setActiveChart] = useState<"sales" | "revenue">("sales");
  const [dashboardCache, setDashboardCache] = useState<Map<string, DashboardStats>>(new Map());

  // Memoize fetch function with caching
  const fetchDashboardData = useCallback(async () => {
    const cacheKey = timeRange;
    
    // Check cache first
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
        const data = await response.json();
        
        // Update cache
        setDashboardCache(prev => new Map(prev).set(cacheKey, data));
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [timeRange, dashboardCache]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Memoize formatting functions to prevent unnecessary re-creations
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("bn-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  }, []);

  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat("bn-BD").format(num);
  }, []);

  const getStatusColor = useCallback((status: string) => {
    const colors = {
      DELIVERED: "bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
      PROCESSING: "bg-blue-500/20 text-blue-600 border-blue-500/30",
      PENDING: "bg-amber-500/20 text-amber-600 border-amber-500/30",
      SHIPPED: "bg-indigo-500/20 text-indigo-600 border-indigo-500/30",
      CANCELLED: "bg-red-500/20 text-red-600 border-red-500/30",
    } as const;
    return colors[status as keyof typeof colors] || "bg-gray-500/20 text-gray-600 border-gray-500/30";
  }, []);

  const getStatusText = (status: string) => {
    const texts = {
      DELIVERED: "ডেলিভার্ড",
      PROCESSING: "প্রসেসিং",
      PENDING: "পেন্ডিং",
      SHIPPED: "শিপড",
      CANCELLED: "বাতিল",
    };
    return texts[status as keyof typeof texts] || status;
  };

  // Memoize expensive calculations - move all hooks to top before early returns
  const salesData = useMemo((): SalesDataItem[] => {
    if (!stats) return [];
    
    const totalOrders = stats.totalOrders || 0;
    const totalRevenue = stats.totalRevenue || 0;

    if (timeRange === "today") {
      return [
        {
          month: "আজ",
          sales: totalOrders,
          revenue: totalRevenue,
        },
      ];
    }

    if (timeRange === "week") {
      const labels = ["সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি", "রবি"];
      const perDaySales = totalOrders / labels.length || 0;
      const perDayRevenue = totalRevenue / labels.length || 0;
      return labels.map((label, idx) => ({
        month: label,
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
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        return {
          month: String(day),
          sales: Math.max(0, Math.round(perDaySales)),
          revenue: Math.max(0, Math.round(perDayRevenue)),
        };
      });
    }

    // year
    const monthLabels = [
      "জানু",
      "ফেব্রু",
      "মার্চ",
      "এপ্রিল",
      "মে",
      "জুন",
      "জুলা",
      "আগস্ট",
      "সেপ্টে",
      "অক্টো",
      "নভে",
      "ডিসে",
    ];
    const perMonthSales = totalOrders / monthLabels.length || 0;
    const perMonthRevenue = totalRevenue / monthLabels.length || 0;
    return monthLabels.map((label, idx) => ({
      month: label,
      sales: Math.max(0, Math.round(perMonthSales + idx)),
      revenue: Math.max(0, Math.round(perMonthRevenue + idx * 1000)),
    }));
  }, [stats?.totalOrders, stats?.totalRevenue, timeRange, stats]);

  // Memoize category colors
  const categoryColors = useMemo(() => [
    "from-emerald-400 to-emerald-600",
    "from-blue-400 to-blue-600",
    "from-amber-400 to-amber-600",
    "from-purple-400 to-purple-600",
    "from-gray-400 to-gray-600",
  ], []);

  // Memoize time range buttons
  const timeRangeButtons = useMemo(() => [
    { value: "today", label: "আজ" },
    { value: "week", label: "সপ্তাহ" },
    { value: "month", label: "মাস" },
    { value: "year", label: "বছর" },
  ], []);

  // Memoize expensive calculations
  const totalSoldAcrossTop = useMemo(() => 
    stats?.topProducts?.reduce(
      (sum, p: any) => sum + (p.soldCount || 0),
      0
    ) || 0,
    [stats?.topProducts]
  );

  const categoryData = useMemo(() => 
    stats?.topProducts
      ?.slice(0, 5)
      .map((product: any, index: number) => ({
        name: product.name,
        value: product.soldCount || 0,
        percentage: totalSoldAcrossTop > 0 
          ? Math.round(((product.soldCount || 0) / totalSoldAcrossTop) * 100)
          : 0,
        color: categoryColors[index % categoryColors.length],
      }))
      .filter((item: any) => item.value > 0) || [],
    [stats?.topProducts, totalSoldAcrossTop, categoryColors]
  );

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#f8fff2f5] to-[#d9f3c1]/30 p-4 lg:p-6">
        <div className="space-y-8">
          {/* Header Skeleton */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-2 h-10 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-48 animate-pulse"></div>
              <div className="w-2 h-10 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-5 bg-gray-200 rounded w-64 mx-auto animate-pulse"></div>
          </div>

          {/* Controls Skeleton */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="flex items-center justify-center bg-gray-100 rounded-2xl p-1 shadow-lg">
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className="px-4 py-2 h-10 bg-gray-200 rounded-xl w-16 animate-pulse"
                ></div>
              ))}
            </div>
            <div className="w-10 h-10 bg-gray-200 rounded-2xl animate-pulse"></div>
          </div>

          {/* Main Stats Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="bg-white/80 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-3 animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded w-24 mb-3 animate-pulse"></div>
                    <div className="flex items-center space-x-2">
                      <div className="h-4 bg-gray-200 rounded w-4 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-8 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Analytics Chart Skeleton */}
          <div className="bg-white/80 rounded-2xl p-6 shadow-lg mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
              </div>
              <div className="flex space-x-2">
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
              </div>
            </div>
            <div className="h-64 flex items-end justify-between space-x-2">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="flex flex-col items-center flex-1">
                  <div
                    className="w-full bg-gray-200 rounded-t-lg animate-pulse"
                    style={{
                      height: `${Math.random() * 60 + 20}%`,
                      minHeight: "20px",
                    }}
                  ></div>
                  <div className="h-3 bg-gray-200 rounded w-8 mt-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-6 mt-1 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Analytics Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="bg-white/80 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                    <div className="h-5 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Section Skeleton */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Recent Orders Skeleton */}
            <div className="bg-white/80 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
              </div>
              <div className="space-y-4">
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="h-4 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
                      <div className="h-5 bg-gray-200 rounded w-12 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Products Skeleton */}
            <div className="bg-white/80 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
              </div>
              <div className="space-y-4">
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className="flex items-center space-x-4 p-4 bg-gray-50 rounded-2xl border border-gray-200"
                  >
                    <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="flex-1 min-w-0">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                      <div className="flex items-center space-x-4">
                        <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-12 animate-pulse"></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="h-4 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 rounded w-8 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions Skeleton */}
          <div className="bg-white/80 rounded-2xl p-8 shadow-lg">
            <div className="h-8 bg-gray-200 rounded w-32 mb-6 mx-auto animate-pulse"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div
                  key={i}
                  className="p-6 bg-gray-100 rounded-2xl text-center border border-gray-200"
                >
                  <div className="w-8 h-8 bg-gray-200 rounded mx-auto mb-3 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-16 mx-auto animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EEEFE0] to-[#D1D8BE]/30 flex items-center justify-center p-6">
        <div className="text-center bg-white/80 rounded-3xl p-8 shadow-lg">
          <div className="w-20 h-20 bg-gradient-to-r from-[#2C4A3B] to-[#819A91] rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="h-8 w-8 text-white" />
          </div>
          <p className="text-gray-800 text-lg font-semibold mb-4">
            ড্যাশবোর্ড ডেটা লোড করতে ব্যর্থ হয়েছে
          </p>
          <button
            onClick={fetchDashboardData}
            className="px-6 py-3 bg-gradient-to-r from-[#2C4A3B] to-[#819A91] text-white rounded-2xl hover:shadow-lg transition-all duration-300 font-semibold"
          >
            আবার চেষ্টা করুন
          </button>
        </div>
      </div>
    );
  }

  const rangeTitleMap: Record<typeof timeRange, string> = {
    today: "আজকের কর্মক্ষমতা",
    week: "এই সপ্তাহের কর্মক্ষমতা",
    month: "এই মাসের কর্মক্ষমতা",
    year: "এই বছরের কর্মক্ষমতা",
  };

  const rangeSubtitleMap: Record<typeof timeRange, string> = {
    today: "আজকে করা অর্ডার, আয় এবং ব্যবহারকারীর কার্যকলাপ",
    week: "এই সপ্তাহের মোট পারফরম্যান্সের সারসংক্ষেপ",
    month: "এই মাসের বিক্রয় ও ব্যবহারকারীর পরিসংখ্যান",
    year: "এই বছরের সামগ্রিক বৃদ্ধি এবং পারফরম্যান্স",
  };

  const compareLabelMap: Record<typeof timeRange, string> = {
    today: "গতকাল থেকে",
    week: "গত সপ্তাহ থেকে",
    month: "গত মাস থেকে",
    year: "গত বছর থেকে",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fff2f5] to-[#d9f3c1]/30 p-4 lg:p-6">
      <div>
        <div className="flex flex-col md:flex-row justify-between ">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-2 h-10 bg-gradient-to-b from-[#2C4A3B] to-[#819A91] rounded-full"></div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#2C4A3B] to-[#819A91] bg-clip-text text-transparent">
                ড্যাশবোর্ড বিশ্লেষণ
              </h1>
              <div className="w-2 h-10 bg-gradient-to-b from-[#819A91] to-[#2C4A3B] rounded-full"></div>
            </div>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              রিয়েল-টাইম ডেটা এবং পারফরম্যান্স মেট্রিক্স
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="flex items-center justify-center bg-white/80 rounded-2xl p-1 shadow-lg">
              {["today", "week", "month", "year"].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range as any)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    timeRange === range
                      ? "bg-gradient-to-r from-[#2C4A3B] to-[#819A91] text-white shadow-md"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  {range === "today" && "আজ"}
                  {range === "week" && "সপ্তাহ"}
                  {range === "month" && "মাস"}
                  {range === "year" && "বছর"}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className="p-2 bg-white/80 text-gray-600 hover:text-gray-800 hover:bg-white disabled:opacity-50 rounded-2xl shadow-lg transition-all duration-300"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue */}
          <div className="bg-white/80 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">মোট আয়</p>
                <p className="text-3xl font-bold text-gray-800 mt-2 group-hover:scale-105 transition-transform duration-300">
                  {formatCurrency(stats.totalRevenue)}
                </p>
                <div className="flex items-center mt-3">
                  {stats.revenueGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1 text-red-600" />
                  )}
                  <span className="text-sm text-gray-700 font-semibold">
                    {Math.abs(stats.revenueGrowth)}%
                  </span>
                  <span className="text-gray-600 text-sm ml-2">
                    {compareLabelMap[timeRange]}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-r from-[#819A91] to-[#A7C1A8] rounded-full group-hover:scale-110 transition-transform duration-300">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {/* Total Orders */}
          <div className="bg-white/80 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">
                  মোট অর্ডার
                </p>
                <p className="text-3xl font-bold text-gray-800 mt-2 group-hover:scale-105 transition-transform duration-300">
                  {formatNumber(stats.totalOrders)}
                </p>
                <div className="flex items-center mt-3">
                  {stats.orderGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1 text-red-600" />
                  )}
                  <span className="text-sm text-gray-700 font-semibold">
                    {Math.abs(stats.orderGrowth)}%
                  </span>
                  <span className="text-gray-600 text-sm ml-2">
                    {compareLabelMap[timeRange]}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-r from-[#2C4A3B] to-[#819A91] rounded-full group-hover:scale-110 transition-transform duration-300">
                <ShoppingBag className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {/* Total Users */}
          <div className="bg-white/80 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">
                  মোট ব্যবহারকারী
                </p>
                <p className="text-3xl font-bold text-gray-800 mt-2 group-hover:scale-105 transition-transform duration-300">
                  {formatNumber(stats.totalUsers)}
                </p>
                <div className="flex items-center mt-3">
                  {stats.userGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4 mr-1 text-emerald-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1 text-red-600" />
                  )}
                  <span className="text-sm text-gray-700 font-semibold">
                    {Math.abs(stats.userGrowth)}%
                  </span>
                  <span className="text-gray-600 text-sm ml-2">
                    {compareLabelMap[timeRange]}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-r from-[#819A91] to-[#A7C1A8] rounded-full group-hover:scale-110 transition-transform duration-300">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>

          {/* Total Products */}
          <div className="bg-white/80 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold">মোট বই</p>
                <p className="text-3xl font-bold text-gray-800 mt-2 group-hover:scale-105 transition-transform duration-300">
                  {formatNumber(stats.totalProducts)}
                </p>
                <div className="flex items-center mt-3">
                  <Package className="h-4 w-4 mr-1 text-amber-600" />
                  <span className="text-sm text-gray-700 font-semibold">
                    {stats.lowStockProducts} লো স্টক
                  </span>
                  <span className="text-gray-600 text-sm ml-2">মনিটরিং</span>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-r from-[#2C4A3B] to-[#819A91] rounded-full group-hover:scale-110 transition-transform duration-300">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 xl:grid-cols-1 gap-6 mb-8">
          {/* Performance Metrics */}
          <div className="xl:col-span-2 bg-white/80 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {rangeTitleMap[timeRange]}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {rangeSubtitleMap[timeRange]}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveChart("sales")}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    activeChart === "sales"
                      ? "bg-gradient-to-r from-[#2C4A3B] to-[#819A91] text-white shadow-md"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  বিক্রয়
                </button>
                <button
                  onClick={() => setActiveChart("revenue")}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    activeChart === "revenue"
                      ? "bg-gradient-to-r from-[#2C4A3B] to-[#819A91] text-white shadow-md"
                      : "text-gray-600 hover:text-gray-800"
                  }`}
                >
                  আয়
                </button>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="h-64 flex items-end justify-between space-x-2">
              {salesData.map((item: SalesDataItem, index: number) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      activeChart === "sales"
                        ? "bg-gradient-to-t from-[#819A91] to-[#2C4A3B]"
                        : "bg-gradient-to-t from-[#A7C1A8] to-[#819A91]"
                    }`}
                    style={{
                      height: `${(activeChart === "sales" ? item.sales : item.revenue / 3000) * 0.8}%`,
                      minHeight: "20px",
                    }}
                  ></div>
                  <span className="text-xs text-gray-600 mt-2">
                    {item.month}
                  </span>
                  <span className="text-xs font-semibold text-gray-700">
                    {activeChart === "sales"
                      ? item.sales
                      : formatCurrency(item.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Average Order Value */}
          <div className="bg-white/80 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-[#2C4A3B] to-[#819A91] rounded-full">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-semibold">
                  গড় অর্ডার মূল্য
                </p>
                <p className="text-xl font-bold text-gray-800">
                  {formatCurrency(stats.averageOrderValue)}
                </p>
              </div>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="bg-white/80 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-[#819A91] to-[#A7C1A8] rounded-full">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-semibold">
                  কনভার্সন রেট
                </p>
                <p className="text-xl font-bold text-gray-800">
                  {stats.conversionRate}%
                </p>
              </div>
            </div>
          </div>

          {/* Pending Orders */}
          <div className="bg-white/80 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-[#2C4A3B] to-[#819A91] rounded-full">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-semibold">
                  পেন্ডিং অর্ডার
                </p>
                <p className="text-xl font-bold text-gray-800">
                  {stats.pendingOrders}
                </p>
              </div>
            </div>
          </div>

          {/* Success Rate */}
          <div className="bg-white/80 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-[#819A91] to-[#A7C1A8] rounded-full">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 font-semibold">
                  সাফল্যের হার
                </p>
                <p className="text-xl font-bold text-gray-800">
                  {stats.successRate}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="bg-white/80 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                সাম্প্রতিক অর্ডার
              </h2>
              <Link
                href="/admin/orders"
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors font-semibold"
              >
                <span className="text-sm">সব দেখুন</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {stats.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-gradient-to-r from-[#2C4A3B] to-[#819A91] rounded-full">
                      <ShoppingBag className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">
                        অর্ডার #{order.id}
                      </p>
                      <p className="text-sm text-gray-600 font-medium">
                        {order.user?.name || "গেস্ট"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-light text-white">
                      {formatCurrency(order.grandTotal)}
                    </p>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-light border ${getStatusColor(order.status)}`}
                    >
                      {getStatusText(order.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white/80 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">টপ বইসমূহ</h2>
              <Link
                href="/admin/products"
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors font-semibold"
              >
                <span className="text-sm">সব দেখুন</span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="space-y-4">
              {stats.topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center space-x-4 p-4 bg-gray-50 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-[#2C4A3B] to-[#819A91] rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">
                      {product.name}
                    </p>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="flex items-center space-x-1 text-sm text-gray-600 font-medium">
                        <ShoppingBag className="h-3 w-3" />
                        <span>{formatNumber(product.soldCount)} বিক্রি</span>
                      </span>
                      <span className="flex items-center space-x-1 text-sm text-gray-600 font-medium">
                        <Star className="h-3 w-3 text-amber-500" />
                        <span>{product.ratingAvg}/5</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">
                      {formatCurrency(product.price)}
                    </p>
                    <div className="flex items-center space-x-1 text-emerald-600 text-sm font-semibold">
                      <TrendingUp className="h-3 w-3" />
                      <span>+15%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white/80 rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            দ্রুত কাজ
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                icon: BookOpen,
                label: "নতুন বই",
                href: "/admin/products/new",
                color: "from-blue-400/40 to-cyan-400/60",
              },
              {
                icon: ShoppingBag,
                label: "অর্ডার",
                href: "/admin/orders",
                color: "from-emerald-400/40 to-emerald-600/60",
              },
              {
                icon: Users,
                label: "ব্যবহারকারী",
                href: "/admin/users",
                color: "from-amber-400/40 to-amber-600/60",
              },
              {
                icon: MessageSquare,
                label: "ব্লগ",
                href: "/admin/blogs",
                color: "from-purple-400/40 to-purple-600/60",
              },
            ].map((action, index) => (
              <Link
                key={index}
                href={action.href}
                className={`p-6 bg-gradient-to-br ${action.color} rounded-2xl text-center border border-white/20 hover:shadow-lg hover:scale-105 transition-all duration-300`}
              >
                <action.icon className="h-8 w-8 mx-auto mb-3 text-white" />
                <p className="font-semibold text-sm text-white">
                  {action.label}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
