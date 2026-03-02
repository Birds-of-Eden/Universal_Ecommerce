"use client";

import { useCart } from "@/components/ecommarce/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingCart,
  ArrowRight,
  Tag,
  Truck,
  Shield,
  ArrowLeft,
  Home,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "@/lib/auth-client";

// Server cart item local shape
interface LocalCartItem {
  id: number | string; // cartItem id (DB)
  productId: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart();

  // Auth session
  const { status } = useSession(); // "loading" | "authenticated" | "unauthenticated"
  const isAuthenticated = status === "authenticated";
  const router = useRouter();

  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [hasMounted, setHasMounted] = useState(false);

  // Server cart items
  const [serverCartItems, setServerCartItems] = useState<LocalCartItem[] | null>(
    null
  );
  const [loadingServerCart, setLoadingServerCart] = useState(false);

  useEffect(() => setHasMounted(true), []);

  // Load server cart when authenticated
  useEffect(() => {
    if (!hasMounted) return;

    if (!isAuthenticated) {
      setServerCartItems(null);
      return;
    }

    const fetchServerCart = async () => {
      try {
        setLoadingServerCart(true);
        const res = await fetch("/api/cart", { cache: "no-store" });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          console.error("Failed to load server cart:", data || res.statusText);
          return;
        }

        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];

        const mapped: LocalCartItem[] = items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          name: item.product?.name ?? "Unknown Product",
          price: Number(item.product?.basePrice ?? 0),
          image: item.product?.image ?? "/placeholder.svg",
          quantity: Number(item.quantity ?? 1),
        }));

        setServerCartItems((prev) => {
          const prevStr = JSON.stringify(prev || []);
          const newStr = JSON.stringify(mapped);
          return prevStr === newStr ? prev : mapped;
        });
      } catch (err) {
        console.error("Error loading server cart:", err);
      } finally {
        setLoadingServerCart(false);
      }
    };

    // Sync guest cart to server after login (avoids duplicates)
    const syncGuestCartToServer = async () => {
      if (cartItems.length === 0) {
        await fetchServerCart();
        return;
      }

      try {
        setLoadingServerCart(true);

        const serverRes = await fetch("/api/cart", { cache: "no-store" });
        if (!serverRes.ok) throw new Error("Failed to fetch server cart");

        const serverData = await serverRes.json();
        const existingItems = Array.isArray(serverData.items)
          ? serverData.items
          : [];

        const itemsToSync = cartItems.filter(
          (localItem) =>
            !existingItems.some(
              (serverItem: any) =>
                String(serverItem.productId) === String(localItem.productId)
            )
        );

        for (const item of itemsToSync) {
          await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: item.productId,
              quantity: item.quantity,
            }),
          });
        }

        clearCart();
        await fetchServerCart();
      } catch (err) {
        console.error("Error syncing guest cart to server:", err);
        await fetchServerCart();
      } finally {
        setLoadingServerCart(false);
      }
    };

    syncGuestCartToServer();
  }, [isAuthenticated, hasMounted, cartItems, clearCart]);

  // Listen for server-side cart cleared events
  useEffect(() => {
    const handler = () => setServerCartItems([]);
    window.addEventListener("serverCartCleared", handler);
    return () => window.removeEventListener("serverCartCleared", handler);
  }, []);

  if (!hasMounted) return null;

  // Render list: server cart if logged in, else local context cart
  const itemsToRender: LocalCartItem[] =
    isAuthenticated && serverCartItems ? serverCartItems : (cartItems as any);

  const subtotal = itemsToRender.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const shippingCost = subtotal > 500 ? 0 : 60;
  const total = subtotal - discountAmount + shippingCost;
  const isCartEmpty = itemsToRender.length === 0;

  // Checkout -> login if needed
  const handleCheckout = async () => {
    if (!isAuthenticated) {
      sessionStorage.setItem("pendingCheckout", JSON.stringify(cartItems));
      sessionStorage.setItem("redirectAfterLogin", "/kitabghor/checkout");
      toast.info("Please log in to continue to checkout.");
      await signIn(undefined, { callbackUrl: "/kitabghor/checkout" });
      return;
    }
    router.push("/kitabghor/checkout");
  };

  // Clear cart -> API + context + local server state
  const handleClearCart = async () => {
    if (itemsToRender.length === 0) return;

    try {
      if (isAuthenticated) {
        const res = await fetch("/api/cart", { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          console.error("Clear cart failed:", data || res.statusText);
          toast.error("Failed to clear cart.");
          return;
        }
        setServerCartItems([]);
      }

      clearCart();
      toast.success("Cart cleared.");
    } catch (error) {
      console.error("Error clearing cart:", error);
      toast.error("Failed to clear cart.");
    }
  };

  // Remove single item -> API + context + local server state
  const handleRemoveItem = async (itemId: string | number) => {
    try {
      if (isAuthenticated) {
        const res = await fetch(`/api/cart/${itemId}`, { method: "DELETE" });

        // If 404, still remove locally to fix desync
        if (!res.ok && res.status !== 404) {
          const data = await res.json().catch(() => null);
          console.error("Remove cart item failed:", data || res.statusText);
          toast.error("Failed to remove item.");
          return;
        }

        setServerCartItems((prev) =>
          prev ? prev.filter((i) => i.id !== itemId) : prev
        );
      }

      removeFromCart(Number(itemId));
      toast.success("Item removed.");
    } catch (error) {
      console.error("Error removing cart item:", error);
      toast.error("Failed to remove item.");
    }
  };

  // Quantity update -> API + context + local server state
  const handleUpdateQuantity = async (
    itemId: string | number,
    newQuantity: number
  ) => {
    if (newQuantity < 1) return;

    try {
      if (isAuthenticated) {
        const res = await fetch(`/api/cart/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: newQuantity }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          console.error("Update quantity failed:", data || res.statusText);
          toast.error("Failed to update quantity.");
          return;
        }

        setServerCartItems((prev) =>
          prev
            ? prev.map((i) =>
                i.id === itemId ? { ...i, quantity: newQuantity } : i
              )
            : prev
        );
      }

      updateQuantity(Number(itemId), newQuantity);
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Failed to update quantity.");
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error("Enter a coupon code.");
      return;
    }

    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          subtotal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to apply coupon.");
      }

      if (data.success) {
        setDiscountAmount(data.coupon.discountAmount);
        setAppliedCoupon(data.coupon);
        toast.success("Coupon applied!");
        setCouponCode("");
      }
    } catch (error) {
      console.error("Coupon application error:", error);
      toast.error(error instanceof Error ? error.message : "Invalid coupon code.");
      setDiscountAmount(0);
      setAppliedCoupon(null);
    }
  };

  const removeCoupon = () => {
    setDiscountAmount(0);
    setAppliedCoupon(null);
    setCouponCode("");
    toast.info("Coupon removed.");
  };

  return (
    <div className="min-h-screen bg-muted/40 text-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs (like screenshot) */}
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/"
            className="inline-flex items-center gap-2 hover:text-foreground transition"
          >
            <Home className="h-4 w-4" />
          </Link>
          <span>/</span>
          <span className="text-foreground/90">Shopping Cart</span>
        </div>

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Shopping Cart</h1>
          {isAuthenticated && loadingServerCart && (
            <p className="mt-2 text-sm text-muted-foreground">
              Syncing your cart...
            </p>
          )}
        </div>

        {isCartEmpty ? (
          <div className="rounded-xl border border-border bg-background p-10 text-center shadow-sm">
            <ShoppingCart className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">
              Add some products to get started.
            </p>
            <Link href="/">
              <Button className="rounded-md">
                Continue Shopping <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Items + Coupon/Voucher */}
            <div className="lg:col-span-2 space-y-6">
              {/* Items Card */}
              <div className="rounded-xl border border-border bg-background shadow-sm">
                <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                  <div>
                    <h2 className="text-lg font-semibold">Your Products</h2>
                    <p className="text-sm text-muted-foreground">
                      {itemsToRender.length} item(s)
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleClearCart}
                    className="rounded-md"
                  >
                    Clear Cart
                  </Button>
                </div>

                <div className="divide-y divide-border">
                  {itemsToRender.map((item) => (
                    <div key={item.id} className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        {/* Image */}
                        <div className="relative h-16 w-16 rounded-md overflow-hidden border border-border bg-muted">
                          <Image
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </div>

                        {/* Name + meta */}
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/kitabghor/products/${item.productId}`}
                            className="block"
                          >
                            <div className="font-medium truncate hover:underline">
                              {item.name}
                            </div>
                          </Link>
                          <div className="mt-1 text-sm text-muted-foreground">
                            Unit Price: ৳{item.price.toLocaleString()}
                          </div>
                        </div>

                        {/* Qty control (matches screenshot style) */}
                        <div className="flex items-center rounded-md border border-border overflow-hidden">
                          <button
                            className="h-10 w-10 grid place-items-center hover:bg-muted transition disabled:opacity-40"
                            onClick={() =>
                              handleUpdateQuantity(item.id, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <div className="h-10 w-12 grid place-items-center text-sm font-medium border-x border-border bg-background">
                            {item.quantity}
                          </div>
                          <button
                            className="h-10 w-10 grid place-items-center hover:bg-muted transition"
                            onClick={() =>
                              handleUpdateQuantity(item.id, item.quantity + 1)
                            }
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Price + remove */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-semibold">
                              ৳{(item.price * item.quantity).toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ৳{item.price.toLocaleString()}/unit
                            </div>
                          </div>

                          <button
                            className="h-10 w-10 grid place-items-center rounded-md hover:bg-muted transition text-muted-foreground hover:text-foreground"
                            onClick={() => handleRemoveItem(item.id)}
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom left link like screenshot */}
                <div className="px-6 py-5 border-t border-border">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Continue Shopping
                  </Link>
                </div>
              </div>

              {/* Coupon/Voucher Card (matches screenshot two columns) */}
              <div className="rounded-xl border border-border bg-background shadow-sm">
                <div className="md:grid-cols-2 gap-0">
                  {/* Coupon */}
                  <div className="p-6 md:border-r md:border-border">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-orange-600">
                        <Tag className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold">Have a Coupon?</div>
                        <div className="text-sm text-muted-foreground">
                          Apply your coupon for an instant discount.
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      {appliedCoupon ? (
                        <div className="rounded-md border border-border bg-muted/40 p-3">
                          <div className="flex items-center justify-between">
                            <div className="text-sm">
                              <span className="font-semibold">
                                {appliedCoupon.code}
                              </span>
                              {appliedCoupon.discountType === "percentage" && (
                                <span className="ml-2 text-muted-foreground">
                                  ({appliedCoupon.discountValue}%)
                                </span>
                              )}
                            </div>
                            <button
                              onClick={removeCoupon}
                              className="text-sm text-destructive hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Coupon applied successfully.
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            placeholder="PROMO / COUPON Code"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value)}
                            className="rounded-md"
                          />
                          <Button onClick={applyCoupon} className="rounded-md">
                            Apply Coupon
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* Right: Order Summary */}
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-border bg-background shadow-sm sticky top-6">
                <div className="px-6 py-5 border-b border-border">
                  <h2 className="text-lg font-semibold">Order Summary</h2>
                </div>

                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sub-Total:</span>
                    <span className="font-semibold">
                      ৳{subtotal.toLocaleString()}
                    </span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        Discount{appliedCoupon?.discountType === "percentage"
                          ? ` (${appliedCoupon.discountValue}%)`
                          : ""}
                        :
                      </span>
                      <span className="font-semibold text-green-600">
                        -৳{discountAmount.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Shipping:</span>
                    <span className="font-semibold">
                      {shippingCost === 0 ? "Free" : `৳${shippingCost}`}
                    </span>
                  </div>

                  <div className="border-t border-border pt-4 flex items-center justify-between">
                    <span className="text-sm font-semibold">Total:</span>
                    <span className="text-xl font-bold text-orange-600">
                      ৳{total.toLocaleString()}
                    </span>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <Link href="/" className="flex-1">
                      <Button variant="outline" className="w-full rounded-md">
                        <Plus className="mr-2 h-4 w-4" />
                        Add More
                      </Button>
                    </Link>

                    <Button
                      className="flex-1 rounded-md"
                      onClick={handleCheckout}
                      disabled={isCartEmpty}
                    >
                      Checkout
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  {/* Trust row (simple, professional) */}
                  <div className="pt-4 border-t border-border">
                    <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Secure payment
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Fast delivery
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Optional note (matches screenshot spacing) */}
              <div className="mt-4 text-xs text-muted-foreground">
                Shipping may vary based on location and weight.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}