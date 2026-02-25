// app/kitabghor/user/orders/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

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
  invoiceId: string; // API থেকে order.id string করে রাখছি
  customer: Customer;
  cartItems?: CartItem[] | null;
  paymentMethod: string;
  transactionId: string | null;
  total: number;
  createdAt: string;
  status: string;         // 🔹 OrderStatus (PENDING, CONFIRMED, SHIPPED, DELIVERED, ...)
  paymentStatus: string;  // 🔹 PaymentStatus (UNPAID, PAID)
}

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

// 🔹 Order status badge helper
const getOrderStatusConfig = (status: string) => {
  const s = status?.toUpperCase();
  if (s === "DELIVERED") {
    return {
      label: "Delivered",
      className:
        "bg-emerald-100 text-emerald-800 border border-emerald-200",
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

// 🔹 Payment status badge helper
const getPaymentStatusConfig = (paymentStatus: string) => {
  const s = paymentStatus?.toUpperCase();
  if (s === "PAID") {
    return {
      label: "Paid",
      className:
        "bg-emerald-50 text-emerald-700 border border-emerald-200",
    };
  }
  // default UNPAID / unknown
  return {
    label: "Unpaid",
    className: "bg-rose-50 text-rose-700 border border-rose-200",
  };
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔹 API থেকে অর্ডার লোড
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/orders?limit=50", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (res.status === 401) {
          setError("অর্ডার দেখতে আপনাকে আগে লগইন করতে হবে।");
          setOrders([]);
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          console.error("Failed to fetch orders:", data || res.statusText);
          setError("অর্ডার লোড করতে সমস্যা হয়েছে।");
          setOrders([]);
          return;
        }

        const data = await res.json();

        // data.orders → আমাদের UI-র ফরম্যাটে ম্যাপ করে নিচ্ছি
        const mapped: Order[] = Array.isArray(data.orders)
          ? data.orders.map((o: any) => {
              const items: CartItem[] = Array.isArray(o.orderItems)
                ? o.orderItems.map((oi: any) => ({
                    id: oi.id,
                    productId: oi.productId,
                    name: oi.product?.name ?? "Unknown product",
                    price: Number(oi.price ?? 0),
                    quantity: oi.quantity ?? 1,
                    image: oi.product?.image ?? "",
                  }))
                : [];

              return {
                invoiceId: String(o.id),
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
                status: o.status ?? "PENDING",               // 🔹 নতুন
                paymentStatus: o.paymentStatus ?? "UNPAID",  // 🔹 নতুন
              };
            })
          : [];

        setOrders(mapped);
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError("অর্ডার লোড করতে সমস্যা হয়েছে।");
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const totalOrders = orders.length;
  const orderedList = useMemo(() => orders, [orders]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7]/30 to-white py-8">
      <div className="container mx-auto px-4">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/kitabghor/user"
              className="flex items-center gap-2 text-[#0E4B4B] hover:text-[#5FA3A3] transition-colors duration-300 group"
            >
              <svg className="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>ড্যাশবোর্ড</span>
            </Link>
            <div className="w-1 h-8 bg-gradient-to-b from-[#0E4B4B] to-[#5FA3A3] rounded-full"></div>
          </div>

          <div className="bg-gradient-to-r from-[#0E4B4B] to-[#5FA3A3] rounded-2xl p-6 md:p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
                  আমার অর্ডারসমূহ
                </h1>
                <p className="text-white/90 opacity-90">
                  আপনার সকল অর্ডারের বিস্তারিত তথ্য
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Loading / Error / Empty / List */}
        {loading ? (
          <Card className="mt-4 p-6 text-center text-sm text-[#5FA3A3] bg-white rounded-2xl shadow-sm border border-[#5FA3A3]/20">
            অর্ডার লোড হচ্ছে...
          </Card>
        ) : error ? (
          <Card className="mt-4 p-6 text-center text-sm text-red-600 bg-white rounded-2xl shadow-sm border border-red-200">
            {error}
          </Card>
        ) : orderedList.length === 0 ? (
          <Card className="mt-4 p-6 text-center text-sm text-[#5FA3A3] bg-white rounded-2xl shadow-sm border border-[#5FA3A3]/20">
            <div className="mb-4">
              <svg className="h-16 w-16 mx-auto opacity-50 text-[#5FA3A3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-[#0D1414] mb-2">কোন অর্ডার নেই</p>
            <p className="text-sm text-[#5FA3A3]">আপনি এখনও কোন অর্ডার করেননি।</p>
          </Card>
      ) : (
        <div className="mt-4 space-y-4">
          {orderedList.map((order) => {
            const items = Array.isArray(order.cartItems)
              ? order.cartItems
              : [];

            const statusCfg = getOrderStatusConfig(order.status);
            const paymentCfg = getPaymentStatusConfig(order.paymentStatus);

            return (
              <Card
                key={order.invoiceId}
                className="p-4 md:p-6 shadow-sm hover:shadow-lg transition-all duration-300 bg-white rounded-2xl border border-[#5FA3A3]/20"
              >
                {/* Order header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                  <div className="text-sm text-[#0D1414]">
                    <p>
                      <span className="font-medium text-[#0E4B4B]">Your Order ID: </span>
                      <Link
                        href={`/kitabghor/user/orders/${order.invoiceId}`}
                        className="text-[#0E4B4B] hover:text-[#5FA3A3] hover:underline break-all transition-colors duration-300"
                      >
                        {order.invoiceId}
                      </Link>
                    </p>
                    <p className="text-[12px] text-[#5FA3A3] mt-0.5">
                      Placed on: {formatDateTime(order.createdAt)}
                    </p>
                    <p className="text-[12px] text-[#5FA3A3] mt-0.5">
                      Customer:{" "}
                      <span className="font-medium text-[#0D1414]">
                        {order.customer.name}
                      </span>{" "}
                      | Mobile: {order.customer.mobile}
                    </p>
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-2 text-sm">
                    {/* 🔹 Dynamic order status badge */}
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusCfg.className}`}
                    >
                      {statusCfg.label}
                    </span>

                    {/* 🔹 Payment status badge */}
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium ${paymentCfg.className}`}
                    >
                      Payment: {paymentCfg.label}
                    </span>

                    <Link
                      href={`/kitabghor/user/orders/${order.invoiceId}`}
                      className="mt-1 bg-gradient-to-r from-[#C0704D] to-[#A85D3F] hover:from-[#0E4B4B] hover:to-[#5FA3A3] text-white text-xs font-semibold rounded-full px-4 py-2 transition-all duration-300 hover:scale-105 inline-flex items-center"
                    >
                      Track My Order →
                    </Link>
                  </div>
                </div>

                {/* Items ( ছোট summary ) */}
                <div className="border-t border-[#5FA3A3]/20 pt-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 mb-4 last:mb-0 pb-4 last:pb-0 border-b last:border-b-0 border-dashed border-[#5FA3A3]/20"
                    >
                      <div className="w-16 h-20 flex-shrink-0 bg-[#F4F8F7] border border-[#5FA3A3]/30 rounded-xl overflow-hidden flex items-center justify-center">
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
                      <div className="flex-1 text-sm">
                        <p className="font-medium text-[#0D1414] line-clamp-1 hover:text-[#0E4B4B] transition-colors duration-300">
                          {item.name}
                        </p>
                        <p className="text-[12px] text-[#5FA3A3] mt-1">
                          TK. {item.price.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order total */}
                <div className="pt-3 border-t border-[#5FA3A3]/20 mt-2 flex justify-end">
                  <div className="text-right text-sm">
                    <p className="text-[#5FA3A3] text-xs">Order Total</p>
                    <p className="text-base font-semibold text-[#0E4B4B]">
                      TK. {order.total.toFixed(2)}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
