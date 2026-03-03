// app/kitabghor/user/orders/[invoiceId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  CheckCircle,
  Truck,
  Package,
  MapPin,
  Calendar,
  Receipt,
  ShieldCheck,
  Home,
  ChevronRight,
} from "lucide-react";

interface CartItem {
  id: number | string;
  productId: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface Customer {
  name: string;
  mobile: string;
  email: string;
  location?: string;
  address?: string;
  deliveryAddress?: string;
}

interface Order {
  invoiceId: string;
  customer: Customer;
  cartItems?: CartItem[] | null;
  paymentMethod: string;
  transactionId: string | null;
  total: number;
  createdAt: string;
  status: string;
  paymentStatus: string;
}

interface Shipment {
  status: string;
  courier?: string | null;
  trackingNumber?: string | null;
  shippedAt?: string | null;
  expectedDate?: string | null;
  deliveredAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

const formatDate = (date: string | null | undefined) => {
  if (!date) return "Processing...";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// ✅ theme-token based status (NO hardcoded colors)
const getOrderStatusConfig = (status: string) => {
  const s = status?.toUpperCase();
  if (s === "DELIVERED") {
    return { label: "Delivered", className: "bg-muted text-foreground border border-border" };
  }
  if (s === "SHIPPED" || s === "PROCESSING" || s === "CONFIRMED") {
    return { label: s === "SHIPPED" ? "Shipped" : s === "PROCESSING" ? "Processing" : "Confirmed", className: "bg-muted text-foreground border border-border" };
  }
  if (s === "CANCELLED") {
    return { label: "Cancelled", className: "bg-muted text-foreground border border-border" };
  }
  return { label: "Pending", className: "bg-muted text-foreground border border-border" };
};

const getPaymentStatusConfig = (paymentStatus: string) => {
  const s = paymentStatus?.toUpperCase();
  if (s === "PAID") {
    return { label: "Paid", className: "bg-muted text-foreground border border-border" };
  }
  return { label: "Unpaid", className: "bg-muted text-foreground border border-border" };
};

export default function OrderDetailsPage() {
  const params = useParams();
  const invoiceId = params?.invoiceId as string | undefined;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [shipment, setShipment] = useState<Shipment | null>(null);

  useEffect(() => {
    if (!invoiceId) {
      setError("Order ID not found.");
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/orders/${invoiceId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (res.status === 401) {
          setError("Login required to view this order.");
          setOrder(null);
          return;
        }

        if (res.status === 404) {
          setError("Order not found.");
          setOrder(null);
          return;
        }

        if (!res.ok) {
          setError("Failed to load order.");
          setOrder(null);
          return;
        }

        const o = await res.json();

        const orderItemsRaw: any[] = Array.isArray(o.orderItems) ? o.orderItems : [];

        const uniqueProductIds = Array.from(
          new Set(
            orderItemsRaw
              .map((oi) => Number(oi.productId))
              .filter((id) => !!id && !Number.isNaN(id))
          )
        );

        const imageMap: Record<number, string> = {};

        if (uniqueProductIds.length > 0) {
          await Promise.all(
            uniqueProductIds.map(async (pid) => {
              try {
                const pRes = await fetch(`/api/products/${pid}`, {
                  method: "GET",
                  headers: { "Content-Type": "application/json" },
                  cache: "no-store",
                });

                if (!pRes.ok) return;
                const pData = await pRes.json();
                if (pData?.image) imageMap[pid] = pData.image as string;
              } catch (err) {
                console.error("Product image fetch failed:", pid, err);
              }
            })
          );
        }

        const items: CartItem[] = orderItemsRaw.map((oi: any) => {
          const pidNum = Number(oi.productId);
          const imageFromProducts = (!Number.isNaN(pidNum) && imageMap[pidNum]) || "";
          const fallbackImage = oi.product?.image ?? "";

          return {
            id: oi.id,
            productId: oi.productId,
            name: oi.product?.name ?? "Unknown product",
            price: Number(oi.price ?? 0),
            quantity: oi.quantity ?? 1,
            image: imageFromProducts || fallbackImage,
          };
        });

        const mapped: Order = {
          invoiceId: String(o.id),
          customer: {
            name: o.name,
            mobile: o.phone_number,
            email: o.email ?? "",
            address: o.address_details ?? "",
            location: `${o.area || ""}, ${o.district || ""}, ${o.country || ""}`
              .replace(/^[,\s]+|[,\s]+$/g, "")
              .replace(/,\s*,/g, ","),
            deliveryAddress: o.address_details ?? "",
          },
          cartItems: items,
          paymentMethod: o.payment_method,
          transactionId: o.transactionId ?? null,
          total: Number(o.grand_total ?? o.total ?? 0),
          createdAt: o.createdAt ?? o.order_date,
          status: o.status ?? "PENDING",
          paymentStatus: o.paymentStatus ?? "UNPAID",
        };

        setOrder(mapped);
      } catch (err) {
        console.error(err);
        setError("Failed to load order.");
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [invoiceId]);

  useEffect(() => {
    if (!invoiceId) return;

    const fetchShipment = async () => {
      try {
        const res = await fetch(`/api/shipments?orderId=${invoiceId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!res.ok) return;

        const data = await res.json();

        let s: any = null;
        if (Array.isArray(data)) s = data[0] ?? null;
        else if (Array.isArray(data?.shipments)) s = data.shipments[0] ?? null;
        else if (data?.shipment) s = data.shipment;
        else s = data;

        if (s) {
          setShipment({
            status: s.status,
            courier: s.courier,
            trackingNumber: s.trackingNumber,
            shippedAt: s.shippedAt,
            expectedDate: s.expectedDate,
            deliveredAt: s.deliveredAt,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
          });
        }
      } catch (err) {
        console.error("Shipment fetch error:", err);
      }
    };

    fetchShipment();
  }, [invoiceId]);

  // ✅ token-based styles for timeline (color mapping -> tokens only)
  const getStatusBox = (active: boolean) =>
    active ? "bg-muted border-border text-foreground" : "bg-card border-border text-muted-foreground";

  const getIconTone = (active: boolean) => (active ? "text-foreground" : "text-muted-foreground");

  type Stage = {
    id: number;
    label: string;
    description: string;
    dateLabel: string;
    icon: any;
  };

  const buildStages = (order: Order, shipment: Shipment | null): Stage[] => {
    const sStatus = shipment?.status?.toUpperCase() ?? "PENDING";
    const oStatus = order.status?.toUpperCase();

    if (sStatus === "CANCELLED" || oStatus === "CANCELLED") {
      return [
        {
          id: 1,
          label: "Order Cancelled",
          description: "This order has been cancelled.",
          dateLabel: formatDate(shipment?.updatedAt || order.createdAt),
          icon: ShieldCheck,
        },
      ];
    }

    const placed: Stage = {
      id: 1,
      label: "Order Placed",
      description: "We received your order and it is being processed.",
      dateLabel: formatDate(order.createdAt),
      icon: ShieldCheck,
    };

    const shipped: Stage = {
      id: 2,
      label: "Shipped",
      description: shipment?.courier
        ? `Handed over to courier (${shipment.courier})${shipment.trackingNumber ? `, Tracking: ${shipment.trackingNumber}` : ""}.`
        : "Order has been shipped from our warehouse.",
      dateLabel: formatDate(shipment?.shippedAt || shipment?.createdAt),
      icon: Package,
    };

    const outForDelivery: Stage = {
      id: 3,
      label: "Out for Delivery",
      description: "Courier is on the way to your delivery address.",
      dateLabel: formatDate(shipment?.expectedDate || shipment?.shippedAt),
      icon: Truck,
    };

    const delivered: Stage = {
      id: 4,
      label: "Delivered",
      description: "Order delivered to your address.",
      dateLabel: formatDate(shipment?.deliveredAt),
      icon: CheckCircle,
    };

    return [placed, shipped, outForDelivery, delivered];
  };

  const getActiveStageIndex = (stages: Stage[], order: Order, shipment: Shipment | null) => {
    if (stages.length === 1 && stages[0].label === "Order Cancelled") return 0;

    const sStatus = shipment?.status?.toUpperCase() ?? "PENDING";
    const oStatus = order.status?.toUpperCase();

    if (sStatus === "DELIVERED" || oStatus === "DELIVERED") return stages.length - 1;
    if (sStatus === "OUT_FOR_DELIVERY") return Math.min(2, stages.length - 1);
    if (sStatus === "IN_TRANSIT") return Math.min(1, stages.length - 1);

    return 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Card className="px-6 py-4 text-sm bg-card text-card-foreground border border-border rounded-2xl">
          Loading order...
        </Card>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Card className="px-6 py-4 text-sm bg-card text-card-foreground border border-border rounded-2xl text-center space-y-3">
          <p className="text-sm">{error || "Order not found."}</p>
          <Link href="/kitabghor/user/orders" className="text-sm underline underline-offset-2 hover:no-underline">
            Back to My Orders
          </Link>
        </Card>
      </div>
    );
  }

  const items = Array.isArray(order.cartItems) ? order.cartItems : [];
  const subTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCharge = Math.max(order.total - subTotal, 0);

  const statusCfg = getOrderStatusConfig(order.status);
  const paymentCfg = getPaymentStatusConfig(order.paymentStatus);

  const stages = buildStages(order, shipment);
  const activeStageIndex = getActiveStageIndex(stages, order, shipment);

  return (
    <div className="min-h-screen bg-background text-foreground py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/kitabghor/user/orders"
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4 group"
          >
            <svg
              className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Orders
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Order Details</h1>
              <p className="text-muted-foreground mt-2">Track your order progress and details</p>
            </div>

            <div className="bg-card text-card-foreground px-4 py-3 rounded-2xl border border-border shadow-sm text-sm">
              <p className="text-muted-foreground">Order Date</p>
              <p className="font-semibold">{formatDate(order.createdAt)}</p>

              <div className="mt-2 flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusCfg.className}`}>
                  Status: {statusCfg.label}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentCfg.className}`}>
                  Payment: {paymentCfg.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-8">
            {/* Status Header Card (same layout, theme colors) */}
            <Card className="bg-card text-card-foreground border border-border overflow-hidden rounded-2xl shadow-lg">
              <div className="p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-muted p-3 rounded-2xl">
                    <CheckCircle className="w-8 h-8 text-foreground" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {statusCfg.label === "Delivered"
                        ? "This order has been delivered"
                        : `Order status: ${statusCfg.label}`}
                    </h2>
                    <p className="text-muted-foreground">
                      Payment: {paymentCfg.label} • Method: {order.paymentMethod}
                      {order.transactionId ? ` • TxID: ${order.transactionId}` : ""}
                    </p>
                  </div>
                </div>

                <div className="bg-background rounded-2xl p-4 border border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="text-muted-foreground text-sm font-medium">Order Number</p>
                      <p className="font-mono text-lg font-bold tracking-wide">{order.invoiceId}</p>
                    </div>
                    <div className="bg-muted text-foreground px-4 py-2 rounded-2xl font-semibold border border-border">
                      {statusCfg.label}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Order Journey */}
            <Card className="p-8 bg-card text-card-foreground rounded-2xl shadow-sm border border-border">
              <div className="flex items-center gap-3 mb-8">
                <Receipt className="w-6 h-6 text-foreground" />
                <h3 className="text-xl font-bold">Order Journey</h3>
              </div>

              <div className="space-y-6">
                {stages.map((stage, index) => {
                  const IconComponent = stage.icon;

                  const isActive = index <= activeStageIndex;
                  const isCurrent = index === activeStageIndex;
                  const isCompleted = index < activeStageIndex;

                  const circleBase =
                    "w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 group-hover:scale-110";

                  const circleClass = isActive
                    ? `${circleBase} ${getStatusBox(true)}`
                    : `${circleBase} ${getStatusBox(false)}`;

                  const iconClass = `w-5 h-5 ${getIconTone(isActive)}`;

                  let badgeText = "Pending";
                  let badgeClass = "bg-muted text-foreground border border-border";

                  if (isCompleted) badgeText = "Completed";
                  else if (isCurrent && isActive) badgeText = "In Progress";

                  return (
                    <div key={stage.id} className="flex gap-6 group">
                      <div className="flex flex-col items-center">
                        <div className={circleClass}>
                          <IconComponent className={iconClass} />
                        </div>
                        {index !== stages.length - 1 && (
                          <div className="flex-1 w-0.5 bg-border mt-2 mb-1" />
                        )}
                      </div>

                      <div className="flex-1 pb-6">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <p className="font-semibold mb-1">{stage.label}</p>
                            <p className="text-muted-foreground mb-2">{stage.description}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4" />
                              <span>{stage.dateLabel}</span>
                            </div>
                          </div>

                          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${badgeClass}`}>
                            {badgeText}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Order Summary */}
            <Card className="p-0 shadow-sm border border-border bg-card text-card-foreground rounded-2xl">
              <div className="px-6 py-3 border-b border-border">
                <h2 className="text-sm md:text-base font-semibold">Order Summary</h2>
              </div>

              <div className="px-4 md:px-6 py-4 space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 pb-4 border-b last:border-b-0 border-dashed border-border"
                  >
                    <div className="w-20 h-28 flex-shrink-0 bg-muted border border-border rounded-2xl overflow-hidden flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground px-2 text-center">
                          No Image
                        </span>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between text-sm">
                      <div>
                        <p className="font-medium mb-1 line-clamp-2">{item.name}</p>
                        <div className="flex flex-wrap gap-3 text-[13px] text-muted-foreground">
                          <span>
                            Price: <span className="font-semibold text-foreground">TK. {item.price.toFixed(2)}</span>
                          </span>
                          <span>
                            Qty: <span className="font-semibold text-foreground">{item.quantity}</span>
                          </span>
                        </div>
                      </div>

                      <p className="text-[12px] text-muted-foreground mt-2">
                        Line Total:{" "}
                        <span className="font-semibold text-foreground">
                          TK. {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 border-t border-border flex justify-end">
                <div className="text-sm space-y-1 text-right">
                  <div className="flex justify-between gap-8 text-[13px] text-muted-foreground">
                    <span>Subtotal</span>
                    <span>TK. {subTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-8 text-[13px] text-muted-foreground">
                    <span>Delivery Charge</span>
                    <span>TK. {deliveryCharge.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-8 text-[13px] text-muted-foreground">
                    <span>Payable Amount</span>
                    <span className="font-semibold text-foreground">TK. {order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <Card className="p-6 bg-card text-card-foreground rounded-2xl shadow-sm border border-border">
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="w-5 h-5 text-foreground" />
                <h3 className="font-semibold">Delivery Information</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Customer Name</p>
                  <p className="font-semibold">{order.customer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Contact Number</p>
                  <p className="font-semibold">{order.customer.mobile}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email Address</p>
                  <p className="font-semibold break-all">{order.customer.email || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Delivery Address</p>
                  <p className="font-semibold leading-relaxed">
                    {order.customer.deliveryAddress || order.customer.address || "N/A"}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card text-card-foreground border border-border rounded-2xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border">
                  <ShieldCheck className="w-8 h-8 text-foreground" />
                </div>

                <h4 className="font-bold mb-2">Order Status & Payment</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Current Status: <strong className="text-foreground">{statusCfg.label}</strong>
                  <br />
                  Payment: <strong className="text-foreground">{paymentCfg.label}</strong> ({order.paymentMethod})
                </p>

                <div className="bg-background rounded-2xl p-3 border border-border">
                  <p className="text-xs text-muted-foreground font-mono">
                    TRACKING ID: {order.invoiceId}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}