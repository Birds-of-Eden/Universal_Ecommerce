"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import UserTable from "@/components/admin/users/UserTable";
import UserFilters from "@/components/admin/users/UserFilters";
import Pagination from "@/components/admin/users/Pagination";
import { Users, Loader2, AlertCircle, RefreshCw, UserPlus } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  phone: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: number | null;
  note: string | null;
  emailVerified: Date | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    orders: number;
    reviews: number;
  };
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    role: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    role: "user",
    phone: "",
    password: "",
    addresses: [""],
  });
  const [usersCache, setUsersCache] = useState<Map<string, { users: User[], pagination: PaginationInfo }>>(new Map());

  // Memoize fetch function with caching
  const fetchUsers = useCallback(async (showRefresh = false) => {
    // Create cache key based on current filters and pagination
    const cacheKey = JSON.stringify({
      page: pagination.page,
      limit: pagination.limit,
      search: filters.search,
      role: filters.role,
    });

    // Check cache first (unless refreshing)
    if (!showRefresh && usersCache.has(cacheKey)) {
      const cachedData = usersCache.get(cacheKey);
      if (cachedData) {
        setUsers(cachedData.users);
        setPagination(cachedData.pagination);
        setError("");
        return;
      }
    }

    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.role && { role: filters.role }),
      });

      const response = await fetch(`/api/users?${params}`);

      if (!response.ok) {
        throw new Error("ব্যবহারকারী ডেটা লোড করতে ব্যর্থ হয়েছে");
      }

      const data = await response.json();
      
      // Update cache
      setUsersCache(prev => new Map(prev).set(cacheKey, {
        users: data.users,
        pagination: data.pagination,
      }));
      
      setUsers(data.users);
      setPagination(data.pagination);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "ব্যবহারকারী ডেটা লোড করতে ত্রুটি হয়েছে"
      );
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pagination.page, pagination.limit, filters.search, filters.role, usersCache]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Memoize handler functions to prevent unnecessary re-renders
  const handlePageChange = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  }, []);

  const handleSearchChange = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const handleRoleChange = useCallback((role: string) => {
    setFilters((prev) => ({ ...prev, role }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const handleRefresh = useCallback(() => {
    fetchUsers(true);
  }, [fetchUsers]);

  const handleUserUpdate = useCallback((userId: string, updates: Partial<User>) => {
    setUsers((prev) =>
      prev.map((user) => (user.id === userId ? { ...user, ...updates } : user))
    );
  }, []);

  const handleUserDelete = useCallback((userId: string) => {
    setUsers((prev) => prev.filter((user) => user.id !== userId));
    setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({ search: "", role: "" });
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  // Memoize filtered users to prevent unnecessary re-calculations
  const filteredUsers = useMemo(() => {
    return users; // Users are already filtered on the server side
  }, [users]);

  // Memoize pagination data
  const paginationData = useMemo(() => pagination, [pagination]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!newUser.email || !newUser.password) {
      setCreateError("ইমেইল এবং পাসওয়ার্ড প্রয়োজন");
      return;
    }

    const normalizedAddresses = newUser.addresses
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    if (normalizedAddresses.length === 0) {
      setCreateError("কমপক্ষে একটি ঠিকানা দিন");
      return;
    }

    try {
      setCreating(true);
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUser.email,
          name: newUser.name || null,
          role: newUser.role,
          phone: newUser.phone || null,
          password: newUser.password,
          addresses: normalizedAddresses,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setCreateError(
          data?.error || "ব্যবহারকারী তৈরি করতে ব্যর্থ হয়েছে"
        );
        return;
      }

      setShowCreateModal(false);
      setNewUser({
        email: "",
        name: "",
        role: "user",
        phone: "",
        password: "",
        addresses: [""],
      });
      await fetchUsers(true);
    } catch (err) {
      console.error("Error creating user:", err);
      setCreateError("ব্যবহারকারী তৈরি করতে ত্রুটি হয়েছে");
    } finally {
      setCreating(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fdfdfd] to-[#eeffe8] p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                <div>
                  <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-10 bg-gray-200 rounded-xl w-32 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded-xl w-20 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Filters Skeleton */}
          <div className="bg-white rounded-2xl shadow-lg border border-[#D1D8BE] p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded-lg w-24 animate-pulse"></div>
            </div>
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-[#D1D8BE] shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-12 animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#D1D8BE] shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-12 animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#D1D8BE] shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-12 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="bg-white rounded-2xl shadow-lg border border-[#D1D8BE] overflow-hidden">
            {/* Table Header Skeleton */}
            <div className="p-6 border-b border-[#D1D8BE] bg-gradient-to-r from-[#EEEFE0] to-[#F5F6E9]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Table Rows Skeleton */}
            <div className="divide-y divide-[#D1D8BE]">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-24 mb-1 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-32 animate-pulse"></div>
                      </div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    <div className="flex items-center space-x-2">
                      <div className="h-8 bg-gray-200 rounded w-8 animate-pulse"></div>
                      <div className="h-8 bg-gray-200 rounded w-8 animate-pulse"></div>
                      <div className="h-8 bg-gray-200 rounded w-8 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Skeleton */}
            <div className="p-6 border-t border-[#D1D8BE] bg-[#EEEFE0] bg-opacity-50">
              <div className="flex justify-center items-center space-x-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded w-10 animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fdfdfd] to-[#eeffe8] p-4 sm:p-6">
      <div>
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-[#2C4A3B] to-[#819A91] rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="h-6 w-6 text-[#EEEFE0]" />
                </div>
                <div className="absolute -inset-1 bg-[#819A91] rounded-xl opacity-20 animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#2C4A3B]">
                  ব্যবহারকারী ব্যবস্থাপনা
                </h1>
                <p className="text-[#819A91] mt-1">
                  আপনার ব্যবহারকারীদের পরিচালনা করুন, তাদের কার্যকলাপ দেখুন এবং
                  অ্যাকাউন্ট মডারেট করুন
                </p>
              </div>
            </div>

            {/* Actions: Add User + Refresh */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => {
                  setCreateError("");
                  setShowCreateModal(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#2C4A3B] text-[#EEEFE0] hover:bg-[#1A3325] transition-all duration-300 shadow-sm font-medium"
              >
                <UserPlus className="h-4 w-4" />
                <span>নতুন ব্যবহারকারী</span>
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-white border border-[#D1D8BE] text-[#819A91] hover:bg-[#819A91] hover:text-[#EEEFE0] hover:border-[#819A91] transition-all duration-300 shadow-sm font-medium"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                <span>{refreshing ? "রিফ্রেশ হচ্ছে..." : "রিফ্রেশ"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl shadow-sm">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-800 font-medium">{error}</p>
              </div>
              <button
                onClick={() => setError("")}
                className="text-red-600 hover:text-red-800 transition-colors duration-200 p-1 rounded-lg hover:bg-red-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <UserFilters
          search={filters.search}
          role={filters.role}
          onSearchChange={handleSearchChange}
          onRoleChange={handleRoleChange}
          onReset={handleResetFilters}
        />

        {/* Stats Footer */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white p-4 rounded-xl border border-[#D1D8BE] shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-[#819A91]">মোট ব্যবহারকারী</p>
                <p className="text-lg font-semibold text-[#2C4A3B]">
                  {pagination.total}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#D1D8BE] shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-[#819A91]">সক্রিয় ব্যবহারকারী</p>
                <p className="text-lg font-semibold text-[#2C4A3B]">
                  {
                    users.filter(
                      (u) =>
                        !u.banned ||
                        (u.banExpires && Date.now() > u.banExpires * 1000)
                    ).length
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#D1D8BE] shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-[#819A91]">অ্যাডমিন ব্যবহারকারী</p>
                <p className="text-lg font-semibold text-[#2C4A3B]">
                  {users.filter((u) => u.role === "admin").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-[#D1D8BE] overflow-hidden">
          {/* Table Header */}
          <div className="p-6 border-b border-[#D1D8BE] bg-gradient-to-r from-[#EEEFE0] to-[#F5F6E9]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#2C4A3B] flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>ব্যবহারকারী তালিকা</span>
                </h2>
                <p className="text-[#819A91] text-sm mt-1">
                  মোট {pagination.total} জন ব্যবহারকারী পাওয়া গেছে
                </p>
              </div>

              <div className="flex items-center space-x-4 text-sm">
                <div className="bg-white px-3 py-2 rounded-lg border border-[#D1D8BE] shadow-sm">
                  <span className="text-[#2C4A3B] font-medium">পৃষ্ঠা </span>
                  <span className="text-[#819A91]">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                </div>

                {/* Results per page */}
                <select
                  value={pagination.limit}
                  onChange={(e) =>
                    setPagination((prev) => ({
                      ...prev,
                      limit: parseInt(e.target.value),
                      page: 1,
                    }))
                  }
                  className="px-3 py-2 rounded-lg border border-[#D1D8BE] bg-white text-[#2C4A3B] focus:outline-none focus:ring-2 focus:ring-[#2C4A3B] focus:border-transparent text-sm"
                >
                  <option value="10">১০ প্রতি পৃষ্ঠা</option>
                  <option value="25">২৫ প্রতি পৃষ্ঠা</option>
                  <option value="50">৫০ প্রতি পৃষ্ঠা</option>
                  <option value="100">১০০ প্রতি পৃষ্ঠা</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Content */}
          {users.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 mx-auto bg-[#D1D8BE] bg-opacity-30 rounded-full flex items-center justify-center mb-4">
                <Users className="h-10 w-10 text-[#819A91]" />
              </div>
              <h3 className="text-lg font-semibold text-[#2C4A3B] mb-2">
                কোনো ব্যবহারকারী পাওয়া যায়নি
              </h3>
              <p className="text-[#819A91] max-w-md mx-auto mb-6">
                {filters.search || filters.role
                  ? "আপনার বর্তমান ফিল্টারের সাথে মিলছে এমন কোনো ব্যবহারকারী নেই। অনুগ্রহ করে বিভিন্ন ফিল্টার চেষ্টা করুন।"
                  : "এখনও কোনো ব্যবহারকারী রেজিস্ট্রেশন করেননি।"}
              </p>
              {(filters.search || filters.role) && (
                <button
                  onClick={handleResetFilters}
                  className="px-6 py-2 rounded-xl bg-[#819A91] text-[#EEEFE0] hover:bg-[#2C4A3B] transition-all duration-300 font-medium"
                >
                  সব ফিল্টার সরান
                </button>
              )}
            </div>
          ) : (
            <>
              <UserTable
                users={filteredUsers}
                onUserUpdate={handleUserUpdate}
                onUserDelete={handleUserDelete}
              />

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="p-6 border-t border-[#D1D8BE] bg-[#EEEFE0] bg-opacity-50">
                  <Pagination
                    currentPage={paginationData.page}
                    totalPages={paginationData.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#D1D8BE] max-w-lg w-full mx-4 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2C4A3B] to-[#819A91] flex items-center justify-center text-[#EEEFE0]">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[#2C4A3B]">
                    নতুন ব্যবহারকারী যোগ করুন
                  </h2>
                  <p className="text-xs text-[#819A91] mt-0.5">
                    ইমেইল ও পাসওয়ার্ড দিয়ে দ্রুত নতুন ব্যবহারকারী তৈরি করুন
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2C4A3B] mb-1">
                  ইমেইল
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#D1D8BE] focus:outline-none focus:ring-2 focus:ring-[#2C4A3B] focus:border-transparent text-sm"
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#2C4A3B] mb-1">
                    নাম (ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#D1D8BE] focus:outline-none focus:ring-2 focus:ring-[#2C4A3B] focus:border-transparent text-sm"
                    placeholder="ব্যবহারকারীর নাম"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2C4A3B] mb-1">
                    ভূমিকা
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser((prev) => ({ ...prev, role: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#D1D8BE] focus:outline-none focus:ring-2 focus:ring-[#2C4A3B] focus:border-transparent text-sm"
                  >
                    <option value="user">ব্যবহারকারী</option>
                    <option value="admin">অ্যাডমিন</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#2C4A3B] mb-1">
                    ফোন (ঐচ্ছিক)
                  </label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) =>
                      setNewUser((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#D1D8BE] focus:outline-none focus:ring-2 focus:ring-[#2C4A3B] focus:border-transparent text-sm"
                    placeholder="ফোন নম্বর"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#2C4A3B] mb-1">
                    পাসওয়ার্ড
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser((prev) => ({ ...prev, password: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#D1D8BE] focus:outline-none focus:ring-2 focus:ring-[#2C4A3B] focus:border-transparent text-sm"
                    placeholder="কমপক্ষে ৬ অক্ষর"
                    required
                  />
                </div>
              </div>

              {/* Address Fields - Dynamic */}
              <div className="space-y-3">
                {newUser.addresses.map((addr, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-[#2C4A3B] mb-1">
                        {index === 0 ? "ঠিকানা (কমপক্ষে একটি)" : `অতিরিক্ত ঠিকানা ${index + 1}`}
                      </label>
                      <input
                        type="text"
                        value={addr}
                        onChange={(e) => {
                          const value = e.target.value;
                          setNewUser((prev) => {
                            const next = { ...prev };
                            const copy = [...next.addresses];
                            copy[index] = value;
                            next.addresses = copy;
                            return next;
                          });
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-[#D1D8BE] focus:outline-none focus:ring-2 focus:ring-[#2C4A3B] focus:border-transparent text-sm"
                        placeholder="বাড়ি/রাস্তা/এলাকা"
                      />
                    </div>
                    {newUser.addresses.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setNewUser((prev) => ({
                            ...prev,
                            addresses: prev.addresses.filter((_, i) => i !== index),
                          }))
                        }
                        className="mt-6 text-xs px-2 py-1 rounded-lg border border-red-300 text-red-600 hover:bg-red-50"
                      >
                        মুছুন
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setNewUser((prev) => ({
                      ...prev,
                      addresses: [...prev.addresses, ""],
                    }))
                  }
                  className="text-xs px-3 py-2 rounded-xl border border-[#D1D8BE] text-[#2C4A3B] hover:bg-[#EEEFE0]"
                >
                  + আরো ঠিকানা যোগ করুন
                </button>
              </div>

              {createError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {createError}
                </p>
              )}

              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#D1D8BE] text-[#819A91] hover:bg-gray-50 transition-all duration-300 text-sm font-medium"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-[#2C4A3B] text-[#EEEFE0] hover:bg-[#1A3325] transition-all duration-300 text-sm font-medium disabled:opacity-60 flex items-center space-x-2"
                >
                  {creating && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <span>{creating ? "তৈরি হচ্ছে..." : "ব্যবহারকারী তৈরি করুন"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
