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
        throw new Error("Failed to load user data");
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
          : "Error loading user data"
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
      setCreateError("Email and password are required");
      return;
    }

    const normalizedAddresses = newUser.addresses
      .map((a) => a.trim())
      .filter((a) => a.length > 0);

    if (normalizedAddresses.length === 0) {
      setCreateError("Please provide at least one address");
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
          data?.error || "Failed to create user"
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
      setCreateError("Error creating user");
    } finally {
      setCreating(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-muted rounded-xl animate-pulse"></div>
                <div>
                  <div className="h-8 bg-muted rounded w-48 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-muted/60 rounded w-64 animate-pulse"></div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-10 bg-muted rounded-xl w-32 animate-pulse"></div>
                <div className="h-10 bg-muted rounded-xl w-20 animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Filters Skeleton */}
          <div className="bg-card rounded-2xl shadow-lg border-border p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-10 bg-muted rounded-lg animate-pulse"></div>
              <div className="h-10 bg-muted rounded-lg animate-pulse"></div>
              <div className="h-10 bg-gray-700 rounded-lg w-24 animate-pulse"></div>
            </div>
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-card p-4 rounded-xl border-border shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-muted rounded-lg animate-pulse"></div>
                <div>
                  <div className="h-4 bg-muted/60 rounded w-20 mb-2 animate-pulse"></div>
                  <div className="h-6 bg-muted rounded w-12 animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="bg-card p-4 rounded-xl border-border shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-muted rounded-lg animate-pulse"></div>
                <div>
                  <div className="h-4 bg-muted/60 rounded w-24 mb-2 animate-pulse"></div>
                  <div className="h-6 bg-muted rounded w-12 animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="bg-card p-4 rounded-xl border-border shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-muted rounded-lg animate-pulse"></div>
                <div>
                  <div className="h-4 bg-muted/60 rounded w-20 mb-2 animate-pulse"></div>
                  <div className="h-6 bg-muted rounded w-12 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Table Skeleton */}
          <div className="bg-card rounded-2xl shadow-lg border-border overflow-hidden">
            {/* Table Header Skeleton */}
            <div className="p-6 border-b border-border bg-muted">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="h-6 bg-muted rounded w-32 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-muted/60 rounded w-40 animate-pulse"></div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="h-8 bg-muted rounded w-20 animate-pulse"></div>
                  <div className="h-8 bg-muted rounded w-24 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Table Rows Skeleton */}
            <div className="divide-y divide-border">
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-muted rounded-full animate-pulse"></div>
                      <div>
                        <div className="h-4 bg-muted/60 rounded w-24 mb-1 animate-pulse"></div>
                        <div className="h-3 bg-muted/60 rounded w-32 animate-pulse"></div>
                      </div>
                    </div>
                    <div className="h-4 bg-muted/60 rounded w-20 animate-pulse"></div>
                    <div className="h-4 bg-muted/60 rounded w-16 animate-pulse"></div>
                    <div className="h-4 bg-muted/60 rounded w-24 animate-pulse"></div>
                    <div className="h-4 bg-muted/60 rounded w-16 animate-pulse"></div>
                    <div className="flex items-center space-x-2">
                      <div className="h-8 bg-muted rounded w-8 animate-pulse"></div>
                      <div className="h-8 bg-muted rounded w-8 animate-pulse"></div>
                      <div className="h-8 bg-muted rounded w-8 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Skeleton */}
            <div className="p-6 border-t border-border bg-muted">
              <div className="flex justify-center items-center space-x-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="h-10 bg-muted rounded w-10 animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 transition-colors duration-300">
      <div>
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="absolute -inset-1 bg-primary/20 rounded-xl opacity-20 animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  User Management
                </h1>
                <p className="text-muted-foreground mt-1">
                  Manage your users, view their activities, and moderate accounts
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
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-sm font-medium"
              >
                <UserPlus className="h-4 w-4" />
                <span>New User</span>
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-muted border-border text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 shadow-sm font-medium"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl shadow-sm">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              <div className="flex-1">
                <p className="text-destructive font-medium">{error}</p>
              </div>
              <button
                onClick={() => setError("")}
                className="text-destructive/70 hover:text-destructive transition-colors duration-200 p-1 rounded-lg hover:bg-destructive/10"
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
          <div className="bg-card p-4 rounded-xl border-border shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-muted rounded-lg">
                <Users className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-lg font-semibold text-foreground">
                  {pagination.total}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card p-4 rounded-xl border-border shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-muted rounded-lg">
                <Users className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-lg font-semibold text-foreground">
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

          <div className="bg-card p-4 rounded-xl border-border shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-muted rounded-lg">
                <Users className="h-4 w-4 text-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admin Users</p>
                <p className="text-lg font-semibold text-foreground">
                  {users.filter((u) => u.role === "admin").length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table Section */}
        <div className="bg-card rounded-2xl shadow-lg border-border overflow-hidden">
          {/* Table Header */}
          <div className="p-6 border-b border-border bg-muted">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>User List</span>
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Found {pagination.total} users
                </p>
              </div>

              <div className="flex items-center space-x-4 text-sm">
                <div className="bg-muted px-3 py-2 rounded-lg border-border shadow-sm">
                  <span className="text-foreground font-medium">Page </span>
                  <span className="text-muted-foreground">
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
                  className="px-3 py-2 rounded-lg border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                >
                  <option value="10">10 per page</option>
                  <option value="25">25 per page</option>
                  <option value="50">50 per page</option>
                  <option value="100">100 per page</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Content */}
          {users.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No users found
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-6">
                {filters.search || filters.role
                  ? "No users match your current filters. Please try different filters."
                  : "No users have registered yet."}
              </p>
              {(filters.search || filters.role) && (
                <button
                  onClick={handleResetFilters}
                  className="px-6 py-2 rounded-xl bg-muted text-foreground hover:bg-muted/80 transition-all duration-300 font-medium"
                >
                  Clear All Filters
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
                <div className="p-6 border-t border-border bg-muted">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl border-border max-w-lg w-full mx-4 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Add New User
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Quickly create a new user with email and password
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  ইমেইল
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm placeholder-muted-foreground"
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm placeholder-muted-foreground"
                    placeholder="User name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Role
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser((prev) => ({ ...prev, role: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) =>
                      setNewUser((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm placeholder-muted-foreground"
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser((prev) => ({ ...prev, password: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm placeholder-muted-foreground"
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>
              </div>

              {/* Address Fields - Dynamic */}
              <div className="space-y-3">
                {newUser.addresses.map((addr, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-foreground mb-1">
                        {index === 0 ? "Address (at least one)" : `Additional Address ${index + 1}`}
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
                        className="w-full px-3 py-2 rounded-xl border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm placeholder-muted-foreground"
                        placeholder="House/Street/Area"
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
                        className="mt-6 text-xs px-2 py-1 rounded-lg border-border text-destructive hover:bg-destructive/10"
                      >
                        Delete
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
                  className="text-xs px-3 py-2 rounded-xl border-border text-foreground hover:bg-muted"
                >
                  + Add More Address
                </button>
              </div>

              {createError && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {createError}
                </p>
              )}

              <div className="mt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border-border text-muted-foreground hover:bg-muted transition-all duration-300 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 text-sm font-medium disabled:opacity-60 flex items-center space-x-2"
                >
                  {creating && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <span>{creating ? "Creating..." : "Create User"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
