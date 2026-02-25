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
  Clock,
  MapPin,
  Calendar,
  Receipt,
  ShieldCheck,
  BadgeCheck,
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
  status: string; // OrderStatus from API
  paymentStatus: string; // PaymentStatus from API
}

// 🔹 Shipment info (API থেকে)
interface Shipment {
  status: string;
  courier?: string | null;
  trackingNumber?: string | null;
  shippedAt?: string | null;
  expectedDate?: string | null;
  deliveredAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null; // cancelled case সহ অন্যান্য জায়গায় ব্যবহার হবে
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

// 🔹 Order status badge helper (label + class)
const getOrderStatusConfig = (status: string) => {
  const s = status?.toUpperCase();
  if (s === "DELIVERED") {
    return {
      label: "Delivered",
      className: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    };
  }
  if (s === "SHIPPED" || s === "PROCESSING" || s === "CONFIRMED") {
    return {
      label:
        s === "SHIPPED"
          ? "Shipped"
          : s === "PROCESSING"
          ? "Processing"
          : "Confirmed",
      className: "bg-blue-100 text-blue-800 border border-blue-200",
    };
  }
  if (s === "CANCELLED") {
    return {
      label: "Cancelled",
      className: "bg-red-100 text-red-800 border border-red-200",
    };
  }
  // default PENDING / unknown
  return {
    label: "Pending",
    className: "bg-amber-100 text-amber-800 border border-amber-200",
  };
};

// 🔹 Payment status helper
const getPaymentStatusConfig = (paymentStatus: string) => {
  const s = paymentStatus?.toUpperCase();
  if (s === "PAID") {
    return {
      label: "Paid",
      className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    };
  }
  // default UNPAID / unknown
  return {
    label: "Unpaid",
    className: "bg-rose-50 text-rose-700 border border-rose-200",
  };
};

export default function OrderDetailsPage() {
  const params = useParams();
  const invoiceId = params?.invoiceId as string | undefined;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔹 shipment state
  const [shipment, setShipment] = useState<Shipment | null>(null);

  // 🔹 API থেকে একক order load করছি (/api/orders/[id])
  useEffect(() => {
    if (!invoiceId) {
      setError("Order ID পাওয়া যায়নি।");
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
          setError("এই অর্ডার দেখতে লগইন প্রয়োজন।");
          setOrder(null);
          return;
        }

        if (res.status === 404) {
          setError("কোন অর্ডার পাওয়া যায়নি।");
          setOrder(null);
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          console.error("Failed to fetch order:", data || res.statusText);
          setError("অর্ডার লোড করতে সমস্যা হয়েছে।");
          setOrder(null);
          return;
        }

        const o = await res.json();

        // 🔹 raw orderItems
        const orderItemsRaw: any[] = Array.isArray(o.orderItems)
          ? o.orderItems
          : [];

        // 🔹 unique productId গুলো বের করি
        const uniqueProductIds = Array.from(
          new Set(
            orderItemsRaw
              .map((oi) => Number(oi.productId))
              .filter((id) => !!id && !Number.isNaN(id))
          )
        );

        // 🔹 productId => image map বানাবো /api/products/[id] থেকে
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
                if (pData && pData.image) {
                  imageMap[pid] = pData.image as string;
                }
              } catch (err) {
                console.error(
                  "Failed to fetch product for order item image:",
                  pid,
                  err
                );
              }
            })
          );
        }

        // 🔹 API data → UI format এ map
        const items: CartItem[] = orderItemsRaw.map((oi: any) => {
          const pidNum = Number(oi.productId);
          const imageFromProducts =
            (!Number.isNaN(pidNum) && imageMap[pidNum]) || "";
          const fallbackImage = oi.product?.image ?? "";

          return {
            id: oi.id,
            productId: oi.productId,
            name: oi.product?.name ?? "Unknown product",
            price: Number(oi.price ?? 0),
            quantity: oi.quantity ?? 1,
            // ✅ প্রাধান্য: /api/products/[id] থেকে আসা image → না থাকলে oi.product.image
            image: imageFromProducts || fallbackImage,
          };
        });

        const mapped: Order = {
          invoiceId: String(o.id), // URL / My Orders এর সাথে match
          customer: {
            name: o.name,
            mobile: o.phone_number,
            email: o.email ?? "",
            address: o.address_details ?? "",
            location: `${o.area || ""}, ${o.district || ""}, ${
              o.country || ""
            }`
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
        console.error("Error fetching order:", err);
        setError("অর্ডার লোড করতে সমস্যা হয়েছে।");
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [invoiceId]);

  // 🔹 Shipment data load করছি /api/shipments থেকে
  useEffect(() => {
    if (!invoiceId) return;

    const fetchShipment = async () => {
      try {
        const res = await fetch(`/api/shipments?orderId=${invoiceId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (!res.ok) {
          // shipment না থাকলে timeline শুধু "Order Placed" active থাকবে
          return;
        }

        const data = await res.json();

        let s: any = null;
        if (Array.isArray(data)) {
          s = data[0] ?? null;
        } else if (Array.isArray(data?.shipments)) {
          s = data.shipments[0] ?? null;
        } else if (data?.shipment) {
          s = data.shipment;
        } else {
          s = data;
        }

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
        console.error("Error fetching shipment:", err);
      }
    };

    fetchShipment();
  }, [invoiceId]);

  const getStatusColor = (color: string) => {
    const colors = {
      emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
      blue: "bg-blue-50 border-blue-200 text-blue-700",
      purple: "bg-purple-50 border-purple-200 text-purple-700",
      orange: "bg-orange-50 border-orange-200 text-orange-700",
      amber: "bg-amber-50 border-amber-200 text-amber-700",
      green: "bg-green-50 border-green-200 text-green-700",
      red: "bg-red-50 border-red-200 text-red-700",
    };
    return colors[color as keyof typeof colors] || colors.emerald;
  };

  const getIconColor = (color: string) => {
    const colors = {
      emerald: "text-emerald-600",
      blue: "text-blue-600",
      purple: "text-purple-600",
      orange: "text-orange-600",
      amber: "text-amber-600",
      green: "text-green-600",
      red: "text-red-600",
    };
    return colors[color as keyof typeof colors] || colors.emerald;
  };

  // 🔹 Shipment + Order → Dynamic stages বানানো
  type Stage = {
    id: number;
    label: string;
    description: string;
    dateLabel: string;
    icon: any;
    color: "emerald" | "blue" | "purple" | "orange" | "amber" | "green" | "red";
  };

  const buildStages = (order: Order, shipment: Shipment | null): Stage[] => {
    const sStatus = shipment?.status?.toUpperCase() ?? "PENDING";
    const oStatus = order.status?.toUpperCase();

    // Cancelled case: single red stage
    if (sStatus === "CANCELLED" || oStatus === "CANCELLED") {
      return [
        {
          id: 1,
          label: "Order Cancelled",
          description: "This order has been cancelled.",
          dateLabel: formatDate(shipment?.updatedAt || order.createdAt),
          icon: ShieldCheck,
          color: "red",
        },
      ];
    }

    const placed: Stage = {
      id: 1,
      label: "Order Placed",
      description: "We received your order and it is being processed.",
      dateLabel: formatDate(order.createdAt),
      icon: ShieldCheck,
      color: "emerald",
    };

    const shipped: Stage = {
      id: 2,
      label: "Shipped",
      description: shipment?.courier
        ? `Handed over to courier (${shipment.courier})${
            shipment.trackingNumber ? `, Tracking: ${shipment.trackingNumber}` : ""
          }.`
        : "Order has been shipped from our warehouse.",
      dateLabel: formatDate(shipment?.shippedAt || shipment?.createdAt),
      icon: Package,
      color: "blue",
    };

    const outForDelivery: Stage = {
      id: 3,
      label: "Out for Delivery",
      description: "Courier is on the way to your delivery address.",
      dateLabel: formatDate(shipment?.expectedDate || shipment?.shippedAt),
      icon: Truck,
      color: "orange",
    };

    const delivered: Stage = {
      id: 4,
      label: "Delivered",
      description: "Order delivered to your address.",
      dateLabel: formatDate(shipment?.deliveredAt),
      icon: CheckCircle,
      color: "green",
    };

    return [placed, shipped, outForDelivery, delivered];
  };

  // Shipment status → কোন stage পর্যন্ত active
  const getActiveStageIndex = (
    stages: Stage[],
    order: Order,
    shipment: Shipment | null
  ) => {
    if (stages.length === 1 && stages[0].label === "Order Cancelled") {
      return 0;
    }

    const sStatus = shipment?.status?.toUpperCase() ?? "PENDING";
    const oStatus = order.status?.toUpperCase();

    if (sStatus === "DELIVERED" || oStatus === "DELIVERED") {
      return stages.length - 1;
    }
    if (sStatus === "OUT_FOR_DELIVERY") {
      return Math.min(2, stages.length - 1);
    }
    if (sStatus === "IN_TRANSIT") {
      return Math.min(1, stages.length - 1);
    }

    // PENDING or unknown → only first stage active
    return 0;
  };

  // Loading / error / not found UI
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7]/30 to-white flex items-center justify-center">
        <Card className="px-6 py-4 text-sm text-[#5FA3A3] bg-white rounded-2xl shadow-sm border border-[#5FA3A3]/20">
          অর্ডার লোড হচ্ছে...
        </Card>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7]/30 to-white flex items-center justify-center">
        <Card className="px-6 py-4 text-sm text-[#5FA3A3] bg-white rounded-2xl shadow-sm border border-[#5FA3A3]/20 text-center space-y-3">
          <p>{error || "অর্ডার পাওয়া যায়নি।"}</p>
          <Link
            href="/kitabghor/user/orders"
            className="text-sm text-[#0E4B4B] hover:text-[#5FA3A3] hover:underline transition-colors duration-300"
          >
            ফিরে যান My Orders পেইজে
          </Link>
        </Card>
      </div>
    );
  }

  const items = Array.isArray(order.cartItems) ? order.cartItems : [];
  const subTotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const deliveryCharge = Math.max(order.total - subTotal, 0);

  const statusCfg = getOrderStatusConfig(order.status);
  const paymentCfg = getPaymentStatusConfig(order.paymentStatus);

  const stages = buildStages(order, shipment);
  const activeStageIndex = getActiveStageIndex(stages, order, shipment);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7]/30 to-white py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <Link
            href="/kitabghor/user/orders"
            className="inline-flex items-center text-sm font-medium text-[#0E4B4B] hover:text-[#5FA3A3] transition-colors duration-300 mb-4 group"
          >
            <svg
              className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Orders
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#0D1414]">
                Order Details
              </h1>
              <p className="text-[#5FA3A3] mt-2">
                Track your order progress and details
              </p>
            </div>
            <div className="bg-white px-4 py-3 rounded-2xl border border-[#5FA3A3]/20 shadow-sm text-sm">
              <p className="text-[#5FA3A3]">Order Date</p>
              <p className="font-semibold text-[#0E4B4B]">
                {formatDate(order.createdAt)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusCfg.className}`}
                >
                  Status: {statusCfg.label}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentCfg.className}`}
                >
                  Payment: {paymentCfg.label}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - 2/3 width */}
          <div className="lg:col-span-2 space-y-8">
            {/* Order Status Header */}
            <Card className="bg-gradient-to-r from-[#0E4B4B] to-[#5FA3A3] text-white overflow-hidden rounded-2xl shadow-lg">
              <div className="p-8">
                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                    <CheckCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {statusCfg.label === "Delivered"
                        ? "This order has been delivered"
                        : `Order status: ${statusCfg.label}`}
                    </h2>
                    <p className="text-white/90 opacity-90">
                      Payment: {paymentCfg.label} • Method: {" "}
                      {order.paymentMethod}
                      {order.transactionId
                        ? ` • TxID: ${order.transactionId}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="text-white/90 text-sm font-medium">
                        Order Number
                      </p>
                      <p className="font-mono text-lg font-bold tracking-wide">
                        {order.invoiceId}
                      </p>
                    </div>
                    <div className="bg-white text-[#0E4B4B] px-4 py-2 rounded-2xl font-semibold">
                      {statusCfg.label}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* 🔹 Dynamic Order Journey (shipment based) */}
            <Card className="p-8 bg-white rounded-2xl shadow-sm border border-[#5FA3A3]/20">
              <div className="flex items-center gap-3 mb-8">
                <Receipt className="w-6 h-6 text-[#0E4B4B]" />
                <h3 className="text-xl font-bold text-[#0D1414]">
                  Order Journey
                </h3>
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
                    ? `${circleBase} ${getStatusColor(stage.color)}`
                    : `${circleBase} bg-white border-gray-300`;

                  const iconClass = isActive
                    ? `w-5 h-5 ${getIconColor(stage.color)}`
                    : "w-5 h-5 text-gray-400";

                  // 🔹 Delivered stage + status DELIVERED হলে সরাসরি Completed
                  const shipmentStatus = shipment?.status?.toUpperCase();
                  const orderStatus = order.status?.toUpperCase();
                  const isDeliveredStage = stage.label === "Delivered";
                  const isDeliveredFinal =
                    shipmentStatus === "DELIVERED" ||
                    orderStatus === "DELIVERED";

                  let badgeText = "Pending";
                  let badgeClass =
                    "bg-gray-50 text-gray-600 border-gray-200";

                  if (isCompleted || (isDeliveredStage && isDeliveredFinal)) {
                    // আগের স্টেপগুলো + Delivered final স্টেপ = Completed
                    badgeText = "Completed";
                    badgeClass =
                      "bg-emerald-50 text-emerald-700 border-emerald-200";
                  } else if (isCurrent && isActive) {
                    // মাঝের/current স্টেপগুলোতে In Progress
                    badgeText = "In Progress";
                    badgeClass =
                      "bg-blue-50 text-blue-700 border-blue-200";
                  }

                  return (
                    <div key={stage.id} className="flex gap-6 group">
                      {/* Timeline Line & Icon */}
                      <div className="flex flex-col items-center">
                        <div className={circleClass}>
                          <IconComponent className={iconClass} />
                        </div>
                        {index !== stages.length - 1 && (
                          <div className="flex-1 w-0.5 bg-gray-200 mt-2 mb-1" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-6">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <p className="font-semibold text-[#0D1414] mb-1">
                              {stage.label}
                            </p>
                            <p className="text-[#5FA3A3] mb-2">
                              {stage.description}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-[#5FA3A3]">
                              <Calendar className="w-4 h-4" />
                              <span>{stage.dateLabel}</span>
                            </div>
                          </div>

                          <div
                            className={`px-3 py-1 rounded-full text-xs font-medium border ${badgeClass}`}
                          >
                            {badgeText}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Order Summary (items + totals) */}
            <Card className="p-0 shadow-sm border border-[#5FA3A3]/20 bg-white rounded-2xl">
              <div className="px-6 py-3 border-b border-[#5FA3A3]/20">
                <h2 className="text-sm md:text-base font-semibold text-[#0D1414]">
                  Order Summary
                </h2>
              </div>

              <div className="px-4 md:px-6 py-4 space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 pb-4 border-b last:border-b-0 border-dashed border-gray-200"
                  >
                    <div className="w-20 h-28 flex-shrink-0 bg-[#F4F8F7] border border-[#5FA3A3]/30 rounded-2xl overflow-hidden flex items-center justify-center">
                        {item.image ? (
                          <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-[#5FA3A3] px-2 text-center">
                          No Image
                        </span>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between text-sm">
                      <div>
                        <p className="font-medium text-[#0D1414] mb-1 line-clamp-2 hover:text-[#0E4B4B] transition-colors duration-300">
                          {item.name}
                        </p>
                        <div className="flex flex-wrap gap-3 text-[13px] text-[#5FA3A3]">
                          <span>
                            Price:{" "}
                            <span className="font-semibold text-[#0E4B4B]">
                              TK. {item.price.toFixed(2)}
                            </span>
                          </span>
                          <span>
                            Qty:{" "}
                            <span className="font-semibold text-[#0E4B4B]">
                              {item.quantity}
                            </span>
                          </span>
                        </div>
                      </div>
                      <p className="text-[12px] text-[#5FA3A3] mt-2">
                        Line Total:{" "}
                        <span className="font-semibold text-[#0E4B4B]">
                          TK. {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-6 py-4 border-t border-[#5FA3A3]/20 flex justify-end">
                <div className="text-sm space-y-1 text-right">
                  <div className="flex justify-between gap-8 text-[13px] text-[#5FA3A3]">
                    <span>Subtotal</span>
                    <span>TK. {subTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-8 text-[13px] text-[#5FA3A3]">
                    <span>Delivery Charge</span>
                    <span>TK. {deliveryCharge.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-8 text-[13px] text-[#5FA3A3]">
                    <span>Payable Amount</span>
                    <span className="font-semibold text-[#0E4B4B]">
                      TK. {order.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-8">
            {/* Customer Information */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-[#5FA3A3]/20">
              <div className="flex items-center gap-3 mb-6">
                <MapPin className="w-5 h-5 text-[#0E4B4B]" />
                <h3 className="font-semibold text-[#0D1414]">
                  Delivery Information
                </h3>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[#5FA3A3] mb-1">Customer Name</p>
                  <p className="font-semibold text-[#0D1414]">
                    {order.customer.name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#5FA3A3] mb-1">Contact Number</p>
                  <p className="font-semibold text-[#0D1414]">
                    {order.customer.mobile}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#5FA3A3] mb-1">Email Address</p>
                  <p className="font-semibold text-[#0D1414] break-all">
                    {order.customer.email || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#5FA3A3] mb-1">
                    Delivery Address
                  </p>
                  <p className="font-semibold text-[#0D1414] leading-relaxed">
                    {order.customer.deliveryAddress ||
                      order.customer.address ||
                      "N/A"}
                  </p>
                </div>
              </div>
            </Card>

            {/* Order Verification Stamp */}
            <Card className="p-6 bg-gradient-to-br from-[#F4F8F7] to-[#5FA3A3]/20 border border-[#5FA3A3]/30 rounded-2xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#0E4B4B]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-8 h-8 text-[#0E4B4B]" />
                </div>
                <h4 className="font-bold text-[#0D1414] mb-2">
                  Order Status & Payment
                </h4>
                <p className="text-sm text-[#5FA3A3] mb-4">
                  Current Status: <strong className="text-[#0E4B4B]">{statusCfg.label}</strong>
                  <br />
                  Payment: <strong className="text-[#0E4B4B]">{paymentCfg.label}</strong> (
                  {order.paymentMethod})
                </p>
                <div className="bg-white rounded-2xl p-3 border border-[#5FA3A3]/30">
                  <p className="text-xs text-[#5FA3A3] font-mono">
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
