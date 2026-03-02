"use client";

import { useEffect, useMemo, useState, useCallback } from "react";

type OrderStatusType =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

type PaymentStatusType = "PAID" | "UNPAID";

type ShipmentStatusType =
  | "PENDING"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "RETURNED"
  | "CANCELLED";

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  product?: {
    id: number;
    name: string;
  };
}

interface Order {
  id: number;
  name: string | null;
  email?: string | null;
  phone_number: string | null;
  alt_phone_number?: string | null;
  country: string;
  district: string;
  area: string;
  address_details: string;
  payment_method: string;
  order_date: string;
  total: number;
  shipping_cost: number;
  grand_total: number;
  currency: string;
  Vat_total?: number | null;
  discount_total?: number | null;
  status: OrderStatusType;
  paymentStatus: PaymentStatusType;
  transactionId?: string | null;
  image?: string | null; // payment screenshot URL (from DB)
  createdAt: string;
  orderItems?: OrderItem[];
  user?: {
    id: string;
    name?: string | null;
  };
}

interface Shipment {
  id: number;
  orderId: number;
  courier: string;
  courierId?: number | null;
  warehouseId?: number | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  externalId?: string | null;
  courierStatus?: string | null;
  lastSyncedAt?: string | null;
  status: ShipmentStatusType;
  shippedAt?: string | null;
  expectedDate?: string | null;
  deliveredAt?: string | null;
  createdAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface CourierOption {
  id: number;
  name: string;
  type: "PATHAO" | "REDX" | "STEADFAST" | "CUSTOM";
  isActive: boolean;
}

interface WarehouseOption {
  id: number;
  name: string;
  code: string;
  isDefault: boolean;
}

const OrderManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ordersCache, setOrdersCache] = useState<
    Map<string, { orders: Order[]; pagination: Pagination | null }>
  >(new Map());

  // details modal states
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderDetail, setOrderDetail] = useState<Order | null>(null);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // success modal
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");

  // editable fields (order)
  const [editOrderStatus, setEditOrderStatus] =
    useState<OrderStatusType>("PENDING");
  const [editPaymentStatus, setEditPaymentStatus] =
    useState<PaymentStatusType>("UNPAID");
  const [editTransactionId, setEditTransactionId] = useState<string>("");

  // editable fields (shipment)
  const [couriers, setCouriers] = useState<CourierOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [editCourierId, setEditCourierId] = useState<string>("");
  const [editWarehouseId, setEditWarehouseId] = useState<string>("");
  const [editCourier, setEditCourier] = useState("");
  const [editTrackingNumber, setEditTrackingNumber] = useState("");
  const [editShipmentStatus, setEditShipmentStatus] =
    useState<ShipmentStatusType>("PENDING");
  const [editExpectedDate, setEditExpectedDate] = useState<string>("");
  const [editDeliveredDate, setEditDeliveredDate] = useState<string>("");

  // ------------------- ORDER LIST -------------------

  // Memoize fetch function with caching
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Create cache key based on current filters and page
      const cacheKey = JSON.stringify({
        page,
        statusFilter,
        limit: 9,
      });

      // Check cache first
      if (ordersCache.has(cacheKey)) {
        const cachedData = ordersCache.get(cacheKey);
        if (cachedData) {
          setOrders(cachedData.orders);
          setPagination(cachedData.pagination);
          setLoading(false);
          return;
        }
      }

      let url = `/api/orders?page=${page}&limit=9`;
      if (statusFilter !== "ALL") {
        url += `&status=${statusFilter}`;
      }

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Something went wrong");
      }

      const data = await res.json();

      // Update cache
      setOrdersCache((prev) =>
        new Map(prev).set(cacheKey, {
          orders: data.orders || [],
          pagination: data.pagination || null,
        }),
      );

      setOrders(data.orders || []);
      setPagination(data.pagination || null);
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Failed to load orders";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, ordersCache]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    if (!search) return orders;
    const term = search.toLowerCase();
    return orders.filter((o) => {
      return (
        o.name?.toLowerCase().includes(term) ||
        o.phone_number?.toLowerCase().includes(term) ||
        String(o.id).toLowerCase().includes(term)
      );
    });
  }, [orders, search]);

  const totalOrders = pagination?.total ?? orders.length;

  const pageTotalAmount = useMemo(
    () =>
      filteredOrders.reduce(
        (sum, o) => sum + Number(o.grand_total ?? o.total ?? 0),
        0,
      ),
    [filteredOrders],
  );

  // ------------------- HELPERS -------------------

  // Memoize badge functions to prevent unnecessary re-renders
  const statusBadgeClass = useCallback((status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-400/10 dark:text-amber-400 dark:border-amber-400/20";
      case "CONFIRMED":
        return "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:bg-cyan-400/10 dark:text-cyan-400 dark:border-cyan-400/20";
      case "PROCESSING":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-400/10 dark:text-blue-400 dark:border-blue-400/20";
      case "SHIPPED":
        return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-indigo-400/10 dark:text-indigo-400 dark:border-indigo-400/20";
      case "DELIVERED":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/20";
      case "CANCELLED":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted/10 text-muted-foreground border-border";
    }
  }, []);

  const paymentBadgeClass = useCallback((status: string) => {
    return status === "PAID"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/20"
      : "bg-destructive/10 text-destructive border-destructive/20";
  }, []);

  const shipmentBadgeClass = useCallback((status: ShipmentStatusType) => {
    switch (status) {
      case "PENDING":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-400/10 dark:text-amber-400 dark:border-amber-400/20";
      case "IN_TRANSIT":
      case "OUT_FOR_DELIVERY":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-400/10 dark:text-blue-400 dark:border-blue-400/20";
      case "DELIVERED":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/20";
      case "RETURNED":
      case "CANCELLED":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted/10 text-muted-foreground border-border";
    }
  }, []);

  const formatDate = useCallback((dateStr?: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, []);

  const formatMoney = useCallback((amount?: number | null, currency = "BDT") => {
    const value = Number(amount ?? 0);
    return `${currency} ${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, []);

  // ------------------- DETAILS MODAL LOGIC -------------------

  // Memoize handler functions
  const openDetails = useCallback((id: number) => {
    setSelectedOrderId(id);
    setDetailOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailOpen(false);
    setSelectedOrderId(null);
    setOrderDetail(null);
    setShipment(null);
    setCouriers([]);
    setWarehouses([]);
    setEditCourierId("");
    setEditWarehouseId("");
    setDetailError(null);
  }, []);

  useEffect(() => {
    if (!detailOpen || !selectedOrderId) return;

    const loadDetails = async () => {
      try {
        setDetailLoading(true);
        setDetailError(null);

        // 1) Order details
        const orderRes = await fetch(`/api/orders/${selectedOrderId}`, {
          cache: "no-store",
        });
        if (!orderRes.ok) {
          const data = await orderRes.json().catch(() => ({}));
          throw new Error(data?.error || "Order load failed");
        }
        const orderData: Order = await orderRes.json();
        setOrderDetail(orderData);

        // init editable fields
        setEditOrderStatus(orderData.status);
        setEditPaymentStatus(orderData.paymentStatus);
        setEditTransactionId(orderData.transactionId || "");

        // 2) Supporting options + Shipment (if any)
        const [courierRes, warehouseRes, shipRes] = await Promise.all([
          fetch("/api/couriers", { cache: "no-store" }),
          fetch("/api/warehouses", { cache: "no-store" }),
          fetch(`/api/shipments?orderId=${selectedOrderId}&limit=1&page=1`, {
            cache: "no-store",
          }),
        ]);

        if (courierRes.ok) {
          const cData = await courierRes.json().catch(() => []);
          setCouriers(Array.isArray(cData) ? cData : []);
        } else {
          setCouriers([]);
        }

        if (warehouseRes.ok) {
          const wData = await warehouseRes.json().catch(() => []);
          setWarehouses(Array.isArray(wData) ? wData : []);
        } else {
          setWarehouses([]);
        }

        if (shipRes.ok) {
          const sd = await shipRes.json();
          const found: Shipment | undefined = sd.shipments?.[0];
          if (found) {
            setShipment(found);
            setEditCourierId(found.courierId ? String(found.courierId) : "");
            setEditWarehouseId(
              found.warehouseId ? String(found.warehouseId) : "",
            );
            setEditCourier(found.courier || "");
            setEditTrackingNumber(found.trackingNumber || "");
            setEditShipmentStatus(found.status);
            setEditExpectedDate(
              found.expectedDate
                ? new Date(found.expectedDate).toISOString().substring(0, 10)
                : "",
            );
            setEditDeliveredDate(
              found.deliveredAt
                ? new Date(found.deliveredAt).toISOString().substring(0, 10)
                : "",
            );
          } else {
            setShipment(null);
            setEditCourierId("");
            setEditWarehouseId("");
            setEditCourier("");
            setEditTrackingNumber("");
            setEditShipmentStatus("PENDING");
            setEditExpectedDate("");
            setEditDeliveredDate("");
          }
        } else if (shipRes.status === 404) {
          setShipment(null);
          setEditCourierId("");
          setEditWarehouseId("");
          setEditCourier("");
          setEditTrackingNumber("");
          setEditShipmentStatus("PENDING");
          setEditExpectedDate("");
          setEditDeliveredDate("");
        } else {
          setShipment(null);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Failed to load details";
        setDetailError(message);
      } finally {
        setDetailLoading(false);
      }
    };

    loadDetails();
  }, [detailOpen, selectedOrderId]);

  // ---- UNIFIED SAVE: ORDER + SHIPMENT ----
  const handleSaveAll = useCallback(async () => {
    if (!orderDetail) return;

    try {
      setSaving(true);

      // 1) Update Order (image DB theke already ache, ekhane change korchi na)
      const orderRes = await fetch(`/api/orders/${orderDetail.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: editOrderStatus,
          paymentStatus: editPaymentStatus,
          transactionId: editTransactionId || null,
        }),
      });

      const orderData = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok) {
        throw new Error(orderData?.error || "Order update failed");
      }

      // local order state sync
      setOrderDetail((prev) =>
        prev
          ? {
              ...prev,
              status: editOrderStatus,
              paymentStatus: editPaymentStatus,
              transactionId: editTransactionId || null,
            }
          : prev,
      );
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderDetail.id
            ? {
                ...o,
                status: editOrderStatus,
                paymentStatus: editPaymentStatus,
              }
            : o,
        ),
      );

      // Clear cache to force refresh on next load
      setOrdersCache(new Map());

      // 2) Create / Update Shipment
      let savedShipment: Shipment | null = shipment;

      const hasShipmentInput =
        editCourierId ||
        editWarehouseId ||
        editCourier ||
        editTrackingNumber ||
        editExpectedDate ||
        editDeliveredDate ||
        editShipmentStatus !== "PENDING";

      if (shipment) {
        // PATCH existing shipment
        const res = await fetch(`/api/shipments/${shipment.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            courierId: editCourierId ? Number(editCourierId) : undefined,
            warehouseId: editWarehouseId ? Number(editWarehouseId) : null,
            courier: editCourier || undefined,
            trackingNumber: editTrackingNumber || null,
            status: editShipmentStatus,
            expectedDate: editExpectedDate || null,
            deliveredAt: editDeliveredDate || null,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Shipment update failed");
        }

        savedShipment = {
          ...shipment,
          courierId: editCourierId ? Number(editCourierId) : shipment.courierId,
          warehouseId: editWarehouseId ? Number(editWarehouseId) : null,
          courier: editCourier,
          trackingNumber: editTrackingNumber || null,
          status: editShipmentStatus,
          expectedDate: editExpectedDate || null,
          deliveredAt: editDeliveredDate || null,
        };
        setShipment(savedShipment);
      } else if (hasShipmentInput) {
        if (!editCourierId && !editCourier) {
          throw new Error("Please select a courier before creating shipment");
        }
        // POST new shipment (only if some shipment data is provided)
        const res = await fetch("/api/shipments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: orderDetail.id,
            courierId: editCourierId ? Number(editCourierId) : undefined,
            warehouseId: editWarehouseId ? Number(editWarehouseId) : undefined,
            courier: editCourier || undefined,
            trackingNumber: editTrackingNumber || undefined,
            status: editShipmentStatus,
            expectedDate: editExpectedDate || undefined,
            deliveredAt: editDeliveredDate || undefined,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "Shipment create failed");
        }

        savedShipment = data as Shipment;
        setShipment(savedShipment);
      }

      // 3) Auto: shipment DELIVERED হলে order.status = DELIVERED করে দাও
      if (editShipmentStatus === "DELIVERED") {
        try {
          const autoRes = await fetch(`/api/orders/${orderDetail.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              status: "DELIVERED",
            }),
          });

          const autoData = await autoRes.json().catch(() => ({}));

          if (autoRes.ok) {
            setOrderDetail((prev) =>
              prev ? { ...prev, status: "DELIVERED" } : prev,
            );
            setOrders((prev) =>
              prev.map((o) =>
                o.id === orderDetail.id ? { ...o, status: "DELIVERED" } : o,
              ),
            );
          } else {
            console.warn("Order auto DELIVERED failed:", autoData);
          }
        } catch (e) {
          console.warn("Order auto-update error:", e);
        }
      }

      // 4) Success modal দেখাও
      setSuccessMessage("অর্ডার এবং শিপমেন্ট তথ্য সফলভাবে আপডেট হয়েছে ✅");
      setSuccessOpen(true);
    } catch (err: any) {
      alert(err?.message || "আপডেট করতে সমস্যা হয়েছে");
    } finally {
      setSaving(false);
    }
  }, [
    orderDetail,
    editOrderStatus,
    editPaymentStatus,
    editTransactionId,
    shipment,
    editCourierId,
    editWarehouseId,
    editCourier,
    editTrackingNumber,
    editShipmentStatus,
    editExpectedDate,
    editDeliveredDate,
  ]);

  // ------------------- RENDER -------------------

  return (
    <div className="min-h-screen w-full bg-background px-4 py-10 ">
      <div className="flex-col gap-8">
        {/* Heading */}
        <div className="text-center mb-8 just">
          <h1 className="text-3xl font-semibold text-foreground">
            | Order Management |
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            View all library orders, update status and track shipments
          </p>
        </div>

        {/* Top stats + search row */}
        <div className="flex flex-col gap-4 md:flex-row">
          {/* Total Orders */}
          <div className="flex w-full items-center justify-between rounded-2xl bg-card px-6 py-4 shadow-sm border-border md:w-1/4">
            <div>
              <p className="text-xs text-muted-foreground">Total Orders</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {totalOrders}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle
                  cx="9"
                  cy="7"
                  r="3"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M22 21v-2a4 4 0 0 0-3-3.87"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M16 3.13a3 3 0 0 1 0 5.76"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Total Amount (This Page) */}
          <div className="flex w-full items-center justify-between rounded-2xl bg-card px-6 py-4 shadow-sm border-border md:w-1/4">
            <div>
              <p className="text-xs text-muted-foreground">Page Total Amount</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {formatMoney(pageTotalAmount, "BDT")}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <rect
                  x="3"
                  y="5"
                  width="18"
                  height="14"
                  rx="2"
                  strokeWidth="1.8"
                />
                <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
              </svg>
            </div>
          </div>

          {/* search + status filter */}
          <div className="flex flex-1 items-center gap-4 rounded-2xl bg-card px-6 py-4 shadow-sm border-border">
            <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-muted px-4 py-2">
              <svg
                className="h-4 w-4 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle cx="11" cy="11" r="6" strokeWidth="1.6" />
                <path d="M16 16l4 4" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by order ID, name or mobile..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-full border border-border bg-primary px-4 py-2 text-sm text-primary-foreground shadow-sm"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="mt-6">
            {/* Stats Cards Skeleton */}
            <div className="flex flex-col gap-4 md:flex-row mb-6">
              <div className="flex w-full items-center justify-between rounded-2xl bg-card px-6 py-4 shadow-sm border-border md:w-1/4">
                <div>
                  <div className="h-3 bg-muted rounded w-16 mb-2 animate-pulse"></div>
                  <div className="h-8 bg-muted rounded w-12 animate-pulse"></div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted animate-pulse"></div>
              </div>
              <div className="flex w-full items-center justify-between rounded-2xl bg-card px-6 py-4 shadow-sm border-border md:w-1/4">
                <div>
                  <div className="h-3 bg-muted rounded w-20 mb-2 animate-pulse"></div>
                  <div className="h-8 bg-muted rounded w-16 animate-pulse"></div>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted animate-pulse"></div>
              </div>
              <div className="flex flex-1 items-center gap-4 rounded-2xl bg-card px-6 py-4 shadow-sm border-border">
                <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-muted px-4 py-2">
                  <div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
                  <div className="h-4 bg-muted rounded flex-1 animate-pulse"></div>
                </div>
                <div className="h-8 bg-muted rounded w-24 animate-pulse"></div>
              </div>
            </div>

            {/* Order Cards Skeleton */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-2xl bg-card shadow-sm border-border"
                >
                  {/* Header Gradient */}
                  <div className="h-24 bg-gradient-to-r from-muted to-muted/50 animate-pulse"></div>

                  <div className="-mt-10 px-5 pb-5">
                    {/* Avatar Circle */}
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted shadow-md animate-pulse"></div>

                    <div className="mt-3 space-y-2">
                      <div className="h-5 bg-muted rounded w-3/4 animate-pulse"></div>
                      <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
                      <div className="h-3 bg-muted rounded w-2/3 animate-pulse"></div>
                      <div className="h-3 bg-muted rounded w-1/2 animate-pulse"></div>
                    </div>

                    {/* Totals */}
                    <div className="mt-3 rounded-xl bg-muted/30 px-3 py-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="h-3 bg-muted rounded w-20 animate-pulse"></div>
                          <div className="h-3 bg-muted rounded w-8 animate-pulse"></div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="h-3 bg-muted rounded w-16 animate-pulse"></div>
                          <div className="h-3 bg-muted rounded w-12 animate-pulse"></div>
                        </div>
                      </div>
                    </div>

                    {/* Status Badges */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <div className="h-6 bg-muted rounded-full w-20 animate-pulse"></div>
                      <div className="h-6 bg-muted rounded-full w-16 animate-pulse"></div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-4">
                      <div className="h-8 bg-muted rounded-full w-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {error && (
          <div className="mt-6 rounded-xl bg-destructive/10 px-4 py-3 text-center text-sm text-destructive border border-destructive/20">
            {error}
          </div>
        )}

        {/* Order cards */}
        {!loading && !error && (
          <>
            {filteredOrders.length === 0 ? (
              <div className="mt-8 text-center text-sm text-muted-foreground">
                No orders found.
              </div>
            ) : (
              <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="overflow-hidden rounded-2xl bg-card shadow-sm border-border"
                  >
                    <div className="h-24 bg-gradient-to-r from-primary/80 to-primary/60"></div>

                    <div className="-mt-10 px-5 pb-5">
                      {/* avatar circle */}
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted shadow-md">
                        <span className="text-3xl font-semibold text-muted-foreground">
                          {order.name?.[0]?.toUpperCase() || "O"}
                        </span>
                      </div>

                      <div className="mt-3">
                        <h3 className="text-lg font-semibold text-foreground">
                          {order.name || "No Name"}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Order ID:{" "}
                          <span className="font-medium">{order.id}</span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Mobile:{" "}
                          <span className="font-medium">
                            {order.phone_number || "-"}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Date:{" "}
                          <span className="font-medium">
                            {formatDate(order.order_date || order.createdAt)}
                          </span>
                        </p>
                      </div>

                      {/* totals */}
                      <div className="mt-3 rounded-xl bg-muted/30 px-3 py-2 text-xs text-foreground">
                        <div className="flex items-center justify-between">
                          <span>Total Items</span>
                          <span className="font-semibold">
                            {order.orderItems?.reduce(
                              (sum, item) => sum + Number(item.quantity || 0),
                              0,
                            ) || 0}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span>Grand Total</span>
                          <span className="font-semibold">
                            {formatMoney(
                              Number(order.grand_total ?? 0),
                              order.currency || "BDT",
                            )}
                          </span>
                        </div>
                      </div>

                      {/* status badges */}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                        <span
                          className={`rounded-full border px-3 py-1 font-semibold ${statusBadgeClass(
                            order.status,
                          )}`}
                        >
                          Status: {order.status}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 font-semibold ${paymentBadgeClass(
                            order.paymentStatus,
                          )}`}
                        >
                          Payment: {order.paymentStatus}
                        </span>
                      </div>

                      {/* actions */}
                      <div className="mt-4 flex items-center gap-3">
                        <button
                          type="button"
                          className="flex-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
                          onClick={() => openDetails(order.id)}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-4 text-sm">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-full bg-card px-4 py-2 text-foreground shadow-sm border-border disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-muted-foreground">
                  Page {page} / {pagination.pages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) =>
                      pagination ? Math.min(pagination.pages, p + 1) : p + 1,
                    )
                  }
                  disabled={page === pagination.pages}
                  className="rounded-full bg-card px-4 py-2 text-foreground shadow-sm border-border disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ------------- DETAILS MODAL ------------- */}
      {detailOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl bg-card shadow-xl border-border">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Order Details
                </h2>
                {orderDetail && (
                  <p className="text-xs text-muted-foreground">
                    Order ID: {orderDetail.id} •{" "}
                    {formatDate(orderDetail.order_date || orderDetail.createdAt)}
                  </p>
                )}
              </div>
              <button
                onClick={handleCloseDetail}
                className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-muted/80"
              >
                Close ✕
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
              {detailLoading && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Loading details...
                </div>
              )}

              {detailError && (
                <div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/20">
                  {detailError}
                </div>
              )}

              {!detailLoading && orderDetail && (
                <div className="space-y-5 text-sm">
                  {/* 1. Customer + Address */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-muted/30 p-4">
                      <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                        Customer Information
                      </h3>
                      <p className="text-sm font-semibold text-foreground">
                        {orderDetail.name || "No Name"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Mobile: {orderDetail.phone_number || "-"}
                      </p>
                      {orderDetail.alt_phone_number && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Alt Mobile: {orderDetail.alt_phone_number}
                        </p>
                      )}
                      {orderDetail.email && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Email: {orderDetail.email}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        Payment Method:{" "}
                        <span className="font-medium">
                          {orderDetail.payment_method}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Currency:{" "}
                        <span className="font-medium">
                          {orderDetail.currency || "BDT"}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Order Date:{" "}
                        <span className="font-medium">
                          {formatDate(orderDetail.order_date || orderDetail.createdAt)}
                        </span>
                      </p>
                    </div>

                    <div className="rounded-2xl bg-muted/30 p-4">
                      <h3 className="mb-2 text-xs font-semibold text-muted-foreground">
                        Delivery Address
                      </h3>
                      <p className="text-xs text-foreground">
                        {orderDetail.address_details}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Area: {orderDetail.area}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        District: {orderDetail.district}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Country: {orderDetail.country}
                      </p>
                    </div>
                  </div>

                  {/* 1.5 Payment Screenshot (only show from DB URL) */}
                  {orderDetail.image && (
                    <div className="rounded-2xl bg-muted/30 p-4">
                      <h3 className="mb-3 text-xs font-semibold text-muted-foreground">
                        Payment Screenshot
                      </h3>

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        {/* Preview Card */}
                        <div className="w-full max-w-xs overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                          <img
                            src={orderDetail.image}
                            alt="Payment screenshot"
                            className="h-full w-full max-h-72 object-contain bg-muted"
                          />
                        </div>

                        {/* Right side: text + link */}
                        <div className="space-y-3 text-xs text-muted-foreground">
                          <p>
                            Customer uploaded this screenshot after payment.
                          </p>

                          <a
                            href={orderDetail.image}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
                          >
                            View Screenshot
                            <svg
                              className="ml-1 h-3 w-3"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                            >
                              <path
                                d="M14 3h7v7"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M10 14L21 3"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                              />
                              <path
                                d="M5 5h5M5 5v5M5 19h5M5 19v-5M19 19h-5M19 19v-5"
                                strokeWidth="1.4"
                                strokeLinecap="round"
                              />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. Items */}
                  <div className="rounded-2xl bg-muted/30 p-4">
                    <h3 className="mb-3 text-xs font-semibold text-muted-foreground">
                      Order Books
                    </h3>
                    <div className="space-y-2">
                      {orderDetail.orderItems?.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-xl bg-card px-3 py-2 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-foreground">
                              {item.product?.name ||
                                "Product Name Not Available"}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              Qty: {item.quantity} ×{" "}
                              {formatMoney(
                                Number(item.price),
                                orderDetail.currency || "BDT",
                              )}
                            </p>
                          </div>
                          <p className="text-[11px] font-semibold text-foreground">
                            {formatMoney(
                              Number(item.quantity * item.price),
                              orderDetail.currency || "BDT",
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 border-t border-border pt-2 text-xs text-foreground">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatMoney(Number(orderDetail.total), orderDetail.currency || "BDT")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount</span>
                        <span>
                          {formatMoney(
                            Number(orderDetail.discount_total || 0),
                            orderDetail.currency || "BDT",
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>VAT</span>
                        <span>
                          {formatMoney(
                            Number(orderDetail.Vat_total || 0),
                            orderDetail.currency || "BDT",
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping</span>
                        <span>{formatMoney(Number(orderDetail.shipping_cost), orderDetail.currency || "BDT")}</span>
                      </div>
                      <div className="mt-1 flex justify-between font-semibold">
                        <span>Grand Total</span>
                        <span>{formatMoney(Number(orderDetail.grand_total), orderDetail.currency || "BDT")}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. Order meta (status, payment, transaction) */}
                  <div className="rounded-2xl bg-muted/30 p-4">
                    <h3 className="mb-3 text-xs font-semibold text-muted-foreground">
                      Order Status
                    </h3>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1 text-xs">
                        <p className="text-muted-foreground">Order Status</p>
                        <select
                          value={editOrderStatus}
                          onChange={(e) =>
                            setEditOrderStatus(
                              e.target.value as OrderStatusType,
                            )
                          }
                          className="w-full rounded-xl border border-border bg-card px-2 py-2 text-xs"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="PROCESSING">PROCESSING</option>
                          <option value="SHIPPED">SHIPPED</option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>
                      <div className="space-y-1 text-xs">
                        <p className="text-muted-foreground">Payment Status</p>
                        <select
                          value={editPaymentStatus}
                          onChange={(e) =>
                            setEditPaymentStatus(
                              e.target.value as PaymentStatusType,
                            )
                          }
                          className="w-full rounded-xl border border-border bg-card px-2 py-2 text-xs"
                        >
                          <option value="PAID">PAID</option>
                          <option value="UNPAID">UNPAID</option>
                        </select>
                      </div>
                      <div className="space-y-1 text-xs">
                        <p className="text-muted-foreground">Transaction ID</p>
                        <input
                          value={editTransactionId}
                          onChange={(e) => setEditTransactionId(e.target.value)}
                          placeholder="Bkash/Nagad txn id..."
                          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none"
                        />
                      </div>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      * Only admin can successfully update these options.
                    </p>
                  </div>

                  {/* 4. Shipment */}
                  <div className="rounded-2xl bg-muted/30 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-xs font-semibold text-muted-foreground">
                        Shipment Status
                      </h3>
                      {shipment && (
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${shipmentBadgeClass(
                            shipment.status,
                          )}`}
                        >
                          Current: {shipment.status}
                        </span>
                      )}
                    </div>

                    {!shipment && (
                      <p className="mb-3 text-[11px] text-muted-foreground">
                        No shipment created for this order yet. Fill the form
                        below to create a new shipment.
                      </p>
                    )}

                    <div className="grid gap-3 md:grid-cols-4">
                      <div className="space-y-1 text-xs">
                        <p className="text-muted-foreground">Courier</p>
                        {couriers.length > 0 ? (
                          <select
                            value={editCourierId}
                            onChange={(e) => {
                              const nextId = e.target.value;
                              setEditCourierId(nextId);
                              const selectedCourier = couriers.find(
                                (c) => String(c.id) === nextId,
                              );
                              setEditCourier(selectedCourier?.name || "");
                            }}
                            className="w-full rounded-xl border border-border bg-card px-2 py-2 text-xs"
                          >
                            <option value="">Select Courier</option>
                            {couriers
                              .filter((c) => c.isActive)
                              .map((courier) => (
                                <option key={courier.id} value={courier.id}>
                                  {courier.name} ({courier.type})
                                </option>
                              ))}
                          </select>
                        ) : (
                          <input
                            value={editCourier}
                            onChange={(e) => setEditCourier(e.target.value)}
                            placeholder="Courier name..."
                            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none"
                          />
                        )}
                      </div>
                      <div className="space-y-1 text-xs">
                        <p className="text-muted-foreground">Warehouse</p>
                        <select
                          value={editWarehouseId}
                          onChange={(e) => setEditWarehouseId(e.target.value)}
                          className="w-full rounded-xl border border-border bg-card px-2 py-2 text-xs"
                        >
                          <option value="">Select Warehouse</option>
                          {warehouses.map((warehouse) => (
                            <option key={warehouse.id} value={warehouse.id}>
                              {warehouse.name} ({warehouse.code})
                              {warehouse.isDefault ? " - Default" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1 text-xs">
                        <p className="text-muted-foreground">Tracking Number</p>
                        <input
                          value={editTrackingNumber}
                          onChange={(e) =>
                            setEditTrackingNumber(e.target.value)
                          }
                          placeholder="tracking no..."
                          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none"
                        />
                      </div>
                      <div className="space-y-1 text-xs">
                        <p className="text-muted-foreground">Shipment Status</p>
                        <select
                          value={editShipmentStatus}
                          onChange={(e) =>
                            setEditShipmentStatus(
                              e.target.value as ShipmentStatusType,
                            )
                          }
                          className="w-full rounded-xl border border-border bg-card px-2 py-2 text-xs"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="IN_TRANSIT">IN_TRANSIT</option>
                          <option value="OUT_FOR_DELIVERY">
                            OUT_FOR_DELIVERY
                          </option>
                          <option value="DELIVERED">DELIVERED</option>
                          <option value="RETURNED">RETURNED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <div className="space-y-1 text-xs">
                        <p className="text-muted-foreground">Expected Date</p>
                        <input
                          type="date"
                          value={editExpectedDate}
                          onChange={(e) => setEditExpectedDate(e.target.value)}
                          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none"
                        />
                      </div>
                      <div className="space-y-1 text-xs">
                        <p className="text-muted-foreground">Delivered Date</p>
                        <input
                          type="date"
                          value={editDeliveredDate}
                          onChange={(e) => setEditDeliveredDate(e.target.value)}
                          className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs outline-none"
                        />
                      </div>
                      {shipment && (
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>Created At</p>
                          <p className="rounded-xl bg-card px-3 py-2 text-[11px]">
                            {formatDate(shipment.createdAt || "")}
                          </p>
                        </div>
                      )}
                    </div>

                    {shipment && (
                      <div className="mt-3 grid gap-3 md:grid-cols-2 text-xs text-muted-foreground">
                        <div className="rounded-xl bg-card px-3 py-2">
                          Courier Status: {shipment.courierStatus || "-"}
                        </div>
                        <div className="rounded-xl bg-card px-3 py-2">
                          Last Synced: {formatDate(shipment.lastSyncedAt || "") || "-"}
                        </div>
                        <div className="rounded-xl bg-card px-3 py-2">
                          External ID: {shipment.externalId || "-"}
                        </div>
                        <div className="rounded-xl bg-card px-3 py-2">
                          Tracking URL:{" "}
                          {shipment.trackingUrl ? (
                            <a
                              href={shipment.trackingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary underline"
                            >
                              Open
                            </a>
                          ) : (
                            "-"
                          )}
                        </div>
                      </div>
                    )}

                    <p className="mt-1 text-[10px] text-muted-foreground">
                      * Only admin can create/update shipment; other users will
                      get Forbidden from API.
                    </p>
                  </div>

                  {/* unified save button */}
                  <div className="pt-2 pb-4">
                    <button
                      type="button"
                      onClick={handleSaveAll}
                      disabled={saving}
                      className="w-full rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {saving
                        ? "Saving..."
                        : "Save All Order and Shipment Updates"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ Success Modal */}
      {successOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xs rounded-2xl bg-card px-5 py-4 shadow-xl border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Update Successful
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {successMessage || "Information updated successfully."}
                </p>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSuccessOpen(false)}
                className="rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
