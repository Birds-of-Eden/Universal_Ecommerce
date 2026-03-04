"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card } from "@/components/ui/card";
import AccountMenu from "../AccountMenu";
import { Home, ChevronRight, User } from "lucide-react";
import AccountHeader from "../AccountHeader";

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

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const getOrderStatusConfig = (status: string) => {
  const s = status?.toUpperCase();
  if (s === "DELIVERED") {
    return {
      label: "Delivered",
      className: "bg-muted text-foreground border border-border",
    };
  }
  if (s === "SHIPPED" || s === "PROCESSING" || s === "CONFIRMED") {
    return {
      label: s === "SHIPPED" ? "Shipped" : s === "PROCESSING" ? "Processing" : "Confirmed",
      className: "bg-muted text-foreground border border-border",
    };
  }
  if (s === "CANCELLED") {
    return {
      label: "Cancelled",
      className: "bg-muted text-foreground border border-border",
    };
  }
  return {
    label: "Pending",
    className: "bg-muted text-foreground border border-border",
  };
};

const getPaymentStatusConfig = (paymentStatus: string) => {
  const s = paymentStatus?.toUpperCase();
  if (s === "PAID") {
    return {
      label: "Paid",
      className: "bg-muted text-foreground border border-border",
    };
  }
  return {
    label: "Unpaid",
    className: "bg-muted text-foreground border border-border",
  };
};

export default function OrdersPage() {
  const { data: session } = useSession();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // You can wire these later from API if you have them
  const starPoints = 0;
  const storeCredit = 0;

  const userName =
    session?.user?.name ||
    (session?.user?.email ? session.user.email.split("@")[0] : "") ||
    "User";

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/orders?limit=50", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        if (res.status === 401) {
          setError("You need to login to view your orders.");
          setOrders([]);
          return;
        }

        if (!res.ok) {
          setError("Failed to load orders.");
          setOrders([]);
          return;
        }

        const data = await res.json();

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
            })
          : [];

        setOrders(mapped);
      } catch (err) {
        console.error(err);
        setError("Failed to load orders.");
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const orderedList = useMemo(() => orders, [orders]);

  return (
    <div className="min-h-screen bg-background text-foreground">
     {/* Breadcrumb */}
<div className="px-6 pt-6">
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    
    <Link
      href="/"
      className="flex items-center gap-1 hover:text-foreground transition-colors"
    >
      <Home className="h-4 w-4" />
      <span>Home</span>
    </Link>

    <span>›</span>

    <Link
      href="/ecommerce/user"
      className="hover:text-foreground transition-colors"
    >
      Account
    </Link>

    <span>›</span>

    <span className="text-foreground">
      Order History
    </span>

  </div>
</div>

      {/* Header row (avatar + hello + points/credit) */}
    <AccountHeader />

      {/* SS Menu (separate component) */}
      <AccountMenu />

      {/* Page content */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-medium mb-6">Order History</h2>

        {loading ? (
          <Card className="p-6 bg-card text-card-foreground border border-border">
            <p className="text-sm text-muted-foreground">Loading orders...</p>
          </Card>
        ) : error ? (
          <Card className="p-6 bg-card text-card-foreground border border-border">
            <p className="text-sm">{error}</p>
          </Card>
        ) : orderedList.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            You have not made any previous orders!
          </div>
        ) : (
          <div className="space-y-4">
            {orderedList.map((order) => {
              const items = Array.isArray(order.cartItems) ? order.cartItems : [];
              const statusCfg = getOrderStatusConfig(order.status);
              const paymentCfg = getPaymentStatusConfig(order.paymentStatus);

              return (
                <Card
                  key={order.invoiceId}
                  className="p-4 md:p-6 bg-card text-card-foreground border border-border"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                    <div className="text-sm">
                      <p>
                        <span className="font-medium">Order ID: </span>
                        <Link
                          href={`/ecommerce/user/orders/${order.invoiceId}`}
                          className="underline underline-offset-2 hover:no-underline"
                        >
                          {order.invoiceId}
                        </Link>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Placed on: {formatDateTime(order.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Customer: <span className="text-foreground font-medium">{order.customer.name}</span>{" "}
                        | Mobile: {order.customer.mobile}
                      </p>
                    </div>

                    <div className="flex flex-col md:items-end gap-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusCfg.className}`}>
                        {statusCfg.label}
                      </span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs ${paymentCfg.className}`}>
                        Payment: {paymentCfg.label}
                      </span>

                      <Link
                        href={`/ecommerce/user/orders/${order.invoiceId}`}
                        className="text-sm font-medium underline underline-offset-2 hover:no-underline"
                      >
                        Track My Order →
                      </Link>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-4 py-4 border-b border-border last:border-b-0"
                      >
                        <div className="w-16 h-20 flex-shrink-0 bg-muted border border-border rounded-xl overflow-hidden flex items-center justify-center">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground px-2 text-center">
                              No Image
                            </span>
                          )}
                        </div>

                        <div className="flex-1 text-sm">
                          <p className="font-medium line-clamp-1">{item.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            TK. {item.price.toFixed(2)} × {item.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-border mt-2 flex justify-end">
                    <div className="text-right text-sm">
                      <p className="text-xs text-muted-foreground">Order Total</p>
                      <p className="text-base font-semibold">TK. {order.total.toFixed(2)}</p>
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