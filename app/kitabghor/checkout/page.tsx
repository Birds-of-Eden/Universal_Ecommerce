"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useCart } from "@/components/ecommarce/CartContext";
import { Button } from "@/components/ui/button";
import { LabeledInput } from "@/components/ui/labeled-input";
import { toast } from "sonner";
import { Check, ArrowLeft, Truck, Shield, CreditCard, BookOpen } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

export default function CheckoutPage() {
  const { cartItems, clearCart } = useCart();
  const { data: session } = useSession();

  const [isMounted, setIsMounted] = useState(false);
  const [step, setStep] = useState<"details" | "payment" | "confirm">("details");

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");

  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [prefilled, setPrefilled] = useState(false);
  const [paymentGateways, setPaymentGateways] = useState<any[]>([]);

  const isAuthenticated = !!session;

  // Server cart
  const [serverCartItems, setServerCartItems] = useState<any[] | null>(null);
  const [loadingServerCart, setLoadingServerCart] = useState(false);

  // Screenshot upload
  const [paymentScreenshotPreview, setPaymentScreenshotPreview] = useState<string | null>(null);
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState<string | null>(null);
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);

  useEffect(() => setIsMounted(true), []);

  // Payment gateways
  useEffect(() => {
    const fetchGateways = async () => {
      try {
        const res = await fetch("/api/payment", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setPaymentGateways(Array.isArray(data.payments) ? data.payments : []);
      } catch {
        // silent
      }
    };
    fetchGateways();
  }, []);

  // Load server cart + sync guest cart after login
  useEffect(() => {
    if (!isMounted) return;

    if (!isAuthenticated) {
      setServerCartItems(null);
      return;
    }

    const fetchServerCart = async () => {
      try {
        setLoadingServerCart(true);
        const res = await fetch("/api/cart", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        const items = Array.isArray(data.items) ? data.items : [];

        const mapped = items.map((item: any) => ({
          id: item.id,
          productId: item.productId,
          name: item.product?.name ?? "Unknown product",
          // basePrice string -> Number()
          price: Number(item.product?.basePrice ?? item.product?.variants?.[0]?.price ?? 0),
          image: item.product?.image ?? "/placeholder.svg",
          quantity: Number(item.quantity ?? 1),
        }));

        setServerCartItems(mapped);
      } catch (err) {
        console.error("Error loading server cart:", err);
      } finally {
        setLoadingServerCart(false);
      }
    };

    const syncGuestCartToServer = async () => {
      if (cartItems.length === 0) {
        fetchServerCart();
        return;
      }

      try {
        setLoadingServerCart(true);

        for (const item of cartItems) {
          const res = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: item.productId, quantity: item.quantity }),
          });

          if (!res.ok) console.error("Failed to sync cart item:", item.productId);
        }

        clearCart();
        fetchServerCart();
      } catch (err) {
        console.error("Error syncing guest cart to server:", err);
        fetchServerCart();
      } finally {
        setLoadingServerCart(false);
      }
    };

    syncGuestCartToServer();
  }, [isAuthenticated, isMounted, cartItems, clearCart]);

  // Prefill
  useEffect(() => {
    if (!session || prefilled || !(session.user as any)?.id) return;

    const loadUser = async () => {
      try {
        const userId = (session.user as any).id as string;
        const res = await fetch(`/api/users/${userId}`, { cache: "no-store" });
        if (!res.ok) return;

        const current = await res.json();

        if (current) {
          setName(current.name || "");
          setMobile(current.phone || "");
          setEmail(current.email || "");

          let addr = "";
          const address = current.address as
            | { addresses?: string[] }
            | string
            | null
            | undefined;

          if (Array.isArray((address as any)?.addresses)) addr = (address as any).addresses.join(", ");
          else if (typeof address === "string") addr = address;

          if (addr) {
            setLocation(addr);
            setDeliveryAddress(addr);
          }

          setPrefilled(true);
        }
      } catch {
        // silent
      }
    };

    loadUser();
  }, [session, prefilled]);

  const itemsToRender = isAuthenticated && serverCartItems ? serverCartItems : cartItems;

  const getChannelInitials = (channel: string): string => {
    const words = channel.trim().split(/\s+/);
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return words.map((w) => w.charAt(0).toUpperCase()).join("");
  };

  const selectedGateway = paymentGateways.find((p) => {
    if (!paymentMethod || paymentMethod === "CashOnDelivery") return false;
    const channel = (p as any)?.paymentGatewayData?.channel as string | undefined;
    if (!channel) return false;
    const slug = channel.toLowerCase().replace(/\s+/g, "");
    return slug === paymentMethod;
  });

  const selectedGatewayAccounts =
    ((selectedGateway as any)?.paymentGatewayData?.accountNumbers as string[] | undefined) || [];

  const subtotal = itemsToRender.reduce(
    (total, item) => total + Number(item.price) * Number(item.quantity),
    0
  );
  const shipping = 60;
  const total = subtotal + shipping;

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPaymentScreenshotPreview(URL.createObjectURL(file));

    try {
      setIsUploadingScreenshot(true);

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) throw new Error("File size should be less than 5MB");
      if (!file.type.startsWith("image/")) throw new Error("Please upload a valid image file");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/upload/paymentScreenshot`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to upload screenshot");
      }

      const data = await res.json();
      const uploadedUrl =
        (typeof data === "string" && data) ||
        data?.url ||
        data?.fileUrl ||
        data?.path ||
        data?.location ||
        null;

      if (!uploadedUrl) throw new Error("Upload response missing URL");
      setPaymentScreenshotUrl(uploadedUrl);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to upload screenshot");
      setPaymentScreenshotUrl(null);
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  const getPaymentStatusFromMethod = (method: string) => {
    if (!method) return "Unknown";
    return method === "CashOnDelivery" ? "Unpaid" : "Paid";
  };

  const handleGoToPaymentStep = () => {
    if (!location.trim() || !deliveryAddress.trim()) {
      toast.error("প্রাথমিক ঠিকানা এবং ডেলিভারি ঠিকানা পূরণ করুন");
      return;
    }
    setStep("payment");
  };

  const handlePlaceOrder = async () => {
    if (itemsToRender.length === 0) {
      toast.error("আপনার কার্ট খালি");
      return;
    }

    if (!name || !mobile || !location || (paymentMethod !== "CashOnDelivery" && !transactionId)) {
      toast.error("সব প্রয়োজনীয় তথ্য পূরণ করুন");
      return;
    }

    if (paymentMethod !== "CashOnDelivery" && (!paymentScreenshotUrl || isUploadingScreenshot)) {
      if (isUploadingScreenshot) toast.error("স্ক্রিনশট আপলোড শেষ হওয়া পর্যন্ত অপেক্ষা করুন");
      else toast.error("পেমেন্ট স্ক্রিনশট আবশ্যক");
      return;
    }

    const computedPaymentStatus = paymentMethod === "CashOnDelivery" ? "UNPAID" : "PAID";
    const localInvoiceId = uuidv4();

    const uiOrderData = {
      invoiceId: localInvoiceId,
      customer: {
        name,
        mobile,
        email,
        address: location,
        deliveryAddress: deliveryAddress || location,
      },
      itemsToRender,
      paymentMethod,
      transactionId: paymentMethod !== "CashOnDelivery" ? transactionId : null,
      total,
      createdAt: new Date().toISOString(),
      paymentStatus: computedPaymentStatus,
    };

    const items = itemsToRender.map((item) => ({
      productId: item.productId ?? item.id,
      quantity: item.quantity,
    }));

    const payload = {
      name,
      email: email || null,
      phone_number: mobile,
      alt_phone_number: null,
      country: "Bangladesh",
      district: location || "N/A",
      area: deliveryAddress || location || "N/A",
      address_details: deliveryAddress || location || "N/A",
      payment_method: paymentMethod,
      items,
      transactionId: paymentMethod !== "CashOnDelivery" ? transactionId : null,
      paymentStatus: computedPaymentStatus,
      image: paymentScreenshotUrl || null,
    };

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "অর্ডার করতে সমস্যা হয়েছে, পরে আবার চেষ্টা করুন");
        return;
      }

      const createdOrder = await res.json();
      setPlacedOrder({ ...uiOrderData, orderId: createdOrder.id });

      try {
        if ((session as any)?.user) {
          await fetch("/api/cart", { method: "DELETE" });
          window.dispatchEvent(new Event("serverCartCleared"));
        }
      } catch {
        // non-fatal
      }

      clearCart();
      setInvoiceId(localInvoiceId);
      setStep("confirm");
      toast.success("অর্ডার তৈরি হয়েছে, এখন নিশ্চিত করুন");
    } catch (err) {
      console.error(err);
      toast.error("অর্ডার করতে সমস্যা হয়েছে");
    }
  };

  const handleConfirmOrder = async () => {
    if (email) {
      try {
        await fetch("/api/newsletter/subscribers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
      } catch {
        // silent
      }
    }

    clearCart();
    setOrderConfirmed(true);
    setShowModal(true);
    toast.success("অর্ডার সফলভাবে সম্পন্ন হয়েছে!");
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-6 sm:mb-8 overflow-x-auto pb-2">
      {["details", "payment", "confirm"].map((s, i) => (
        <div key={s} className="flex items-center gap-1 sm:gap-2 min-w-fit">
          <div
            className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 rounded-full border-2 transition-all duration-300 ${
              step === s
                ? "bg-[#819A91] border-[#819A91] text-white shadow-lg shadow-[#819A91]/30"
                : i < ["details", "payment", "confirm"].indexOf(step) || (s === "confirm" && orderConfirmed)
                ? "bg-[#A7C1A8] border-[#A7C1A8] text-white"
                : "border-border text-foreground/70"
            }`}
          >
            {step === s ? (
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full" />
            ) : i < ["details", "payment", "confirm"].indexOf(step) || (s === "confirm" && orderConfirmed) ? (
              <Check className="w-3 h-3 sm:w-4 sm:h-5" />
            ) : (
              <span className="text-xs sm:text-sm font-medium">{i + 1}</span>
            )}
          </div>

          <span
            className={`text-xs sm:text-sm font-medium capitalize transition-colors duration-300 hidden lg:block ${
              step === s ? "text-foreground" : "text-foreground/70"
            }`}
          >
            {s === "details" ? "ব্যক্তিগত তথ্য" : s === "payment" ? "পেমেন্ট" : "নিশ্চিতকরণ"}
          </span>

          {i < 2 && <div className={`w-4 sm:w-6 lg:w-12 h-0.5 ml-0.5 sm:ml-1 lg:ml-3 ${i < ["details", "payment", "confirm"].indexOf(step) ? "bg-[#A7C1A8]" : "bg-border"}`} />}
        </div>
      ))}
    </div>
  );

  if (!isMounted || (isAuthenticated && loadingServerCart)) return null;

  return (
    <div className="min-h-screen bg-background py-6 sm:py-8 lg:py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#819A91] rounded-full flex items-center justify-center">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              Checkout
            </h1>
          </div>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Follow the steps below to complete your order.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2">
            <div className="bg-card text-card-foreground rounded-xl sm:rounded-2xl shadow-lg border border-border p-4 sm:p-6 lg:p-8">
              {renderStepIndicator()}

              {/* Step 1 */}
              {step === "details" && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-2 h-8 bg-[#819A91] rounded-full"></div>
                    <h2 className="text-2xl font-bold text-foreground">Personal Details</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <LabeledInput
                      id="name"
                      label="Full Name *"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                    />

                    <LabeledInput
                      id="mobile"
                      label="Mobile *"
                      placeholder="01XXXXXXXXX"
                      value={mobile}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMobile(e.target.value)}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                    />

                    <LabeledInput
                      id="email"
                      label="Email (Optional)"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground sm:col-span-2"
                    />

                    <LabeledInput
                      id="location"
                      label="Primary Address *"
                      placeholder="House, road, area"
                      value={location}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground sm:col-span-2"
                    />

                    <div className="space-y-2 sm:col-span-2">
                      <label htmlFor="deliveryAddress" className="text-sm font-medium text-foreground">
                        Delivery Address (Optional)
                      </label>
                      <textarea
                        id="deliveryAddress"
                        className="w-full h-24 sm:h-32 p-3 sm:p-4 border border-border rounded-lg sm:rounded-xl bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#819A91]/30"
                        placeholder="If different from primary address"
                        value={deliveryAddress}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDeliveryAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full bg-[#819A91] hover:bg-[#819A91]/90 text-white py-2 sm:py-3 text-base sm:text-lg font-semibold rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={handleGoToPaymentStep}
                  >
                    Next Step
                  </Button>
                </div>
              )}

              {/* Step 2 */}
              {step === "payment" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-2 h-6 sm:h-8 bg-[#819A91] rounded-full"></div>
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground">Payment Method</h2>
                    </div>

                    <Button
                      variant="ghost"
                      onClick={() => setStep("details")}
                      className="text-foreground/70 hover:text-foreground hover:bg-muted"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                  </div>

                  <div className="grid gap-4">
                    {[
                      ...paymentGateways
                        .map((p) => {
                          const channel = (p as any)?.paymentGatewayData?.channel as string | undefined;
                          if (!channel) return null;
                          const slug = channel.toLowerCase().replace(/\s+/g, "");
                          return { id: slug, name: channel, color: "bg-gradient-to-r from-emerald-500 to-green-500" };
                        })
                        .filter(Boolean),
                      { id: "CashOnDelivery", name: "Cash On Delivery", color: "bg-gradient-to-r from-[#A7C1A8] to-[#819A91]" },
                    ].map((method: any) => (
                      <div
                        key={method.id}
                        className={`border-2 rounded-lg sm:rounded-xl p-3 sm:p-4 cursor-pointer transition-all duration-300 ${
                          paymentMethod === method.id
                            ? "border-[#819A91] bg-muted shadow-md"
                            : "border-border hover:bg-muted"
                        }`}
                        onClick={() => setPaymentMethod(method.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${method.color} flex items-center justify-center shadow-md`}>
                              <span className="text-white font-bold text-sm sm:text-lg">
                                {method.id === "CashOnDelivery" ? "COD" : getChannelInitials(method.name)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-foreground text-sm sm:text-base block truncate">
                                {method.name}
                              </span>
                              {method.id === "CashOnDelivery" && (
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                  Pay when you receive the product.
                                </p>
                              )}
                            </div>
                          </div>

                          <div
                            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center ${
                              paymentMethod === method.id ? "border-[#819A91] bg-[#819A91]" : "border-border"
                            }`}
                          >
                            {paymentMethod === method.id && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {paymentMethod && paymentMethod !== "CashOnDelivery" && (
                    <div className="bg-muted rounded-lg sm:rounded-xl p-4 sm:p-6 border border-border">
                      <div className="flex items-center gap-3 mb-4">
                        <CreditCard className="w-5 h-5 text-[#819A91]" />
                        <h3 className="font-semibold text-foreground">Payment Instructions</h3>
                      </div>

                      <p className="text-sm text-foreground mb-2">Pay to these numbers:</p>

                      {selectedGatewayAccounts.length > 0 ? (
                        <ul className="text-sm text-foreground mb-4 list-disc list-inside space-y-1">
                          {selectedGatewayAccounts.map((acc, idx) => (
                            <li key={idx}>
                              <strong>{acc}</strong>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground mb-4">No account numbers found.</p>
                      )}

                      <LabeledInput
                        id="transactionId"
                        label="Transaction ID *"
                        placeholder="Enter transaction ID"
                        value={transactionId}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransactionId(e.target.value)}
                        className="bg-background border-border text-foreground placeholder:text-muted-foreground mt-4"
                      />

                      <div className="mt-4 space-y-2">
                        <label className="text-sm font-medium text-foreground">Payment Screenshot</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotChange}
                          className="w-full text-sm text-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#819A91] file:text-white hover:file:bg-[#819A91]/90 cursor-pointer"
                        />

                        {(paymentScreenshotUrl || paymentScreenshotPreview) && (
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                            <div className="relative w-40 h-40 border border-border rounded-xl overflow-hidden bg-background">
                              <Image
                                src={paymentScreenshotUrl || paymentScreenshotPreview!}
                                alt="Payment screenshot preview"
                                fill
                                className="object-cover"
                              />
                            </div>
                          </div>
                        )}

                        {isUploadingScreenshot && (
                          <p className="text-xs text-muted-foreground mt-1">Uploading screenshot...</p>
                        )}
                      </div>
                    </div>
                  )}

                  {paymentMethod && (
                    <Button
                      className="w-full bg-[#819A91] hover:bg-[#819A91]/90 text-white py-2 sm:py-3 text-base sm:text-lg font-semibold rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                      onClick={handlePlaceOrder}
                      disabled={isUploadingScreenshot}
                    >
                      {isUploadingScreenshot ? "Uploading..." : "Place Order"}
                    </Button>
                  )}
                </div>
              )}

              {/* Step 3 */}
              {step === "confirm" && placedOrder && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-2 h-6 sm:h-8 bg-[#819A91] rounded-full"></div>
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground">Confirm Order</h2>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => setStep("payment")}
                      className="text-foreground/70 hover:text-foreground hover:bg-muted"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                  </div>

                  <div className="bg-muted border border-border rounded-lg sm:rounded-xl p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-[#A7C1A8] rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-semibold text-foreground">Order created successfully!</h3>
                    </div>
                    <p className="text-foreground">
                      Invoice ID: <strong>{invoiceId}</strong>
                    </p>
                    {placedOrder?.orderId && (
                      <p className="text-muted-foreground mt-1 text-sm">
                        Order ID (DB): <strong className="text-foreground">{placedOrder.orderId}</strong>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground">Customer</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p><span className="text-foreground/80">Name:</span> <span className="text-foreground">{placedOrder.customer.name}</span></p>
                        <p><span className="text-foreground/80">Mobile:</span> <span className="text-foreground">{placedOrder.customer.mobile}</span></p>
                        <p><span className="text-foreground/80">Email:</span> <span className="text-foreground">{placedOrder.customer.email || "N/A"}</span></p>
                        <p><span className="text-foreground/80">Address:</span> <span className="text-foreground">{placedOrder.customer.address}</span></p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-foreground">Order</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p><span className="text-foreground/80">Payment:</span> <span className="text-foreground">{placedOrder.paymentMethod}</span></p>
                        <p>
                          <span className="text-foreground/80">Status:</span>{" "}
                          <span className="text-foreground font-semibold">{getPaymentStatusFromMethod(placedOrder.paymentMethod)}</span>
                        </p>
                        {placedOrder.transactionId && (
                          <p><span className="text-foreground/80">Txn:</span> <span className="text-foreground">{placedOrder.transactionId}</span></p>
                        )}
                      </div>
                    </div>
                  </div>

                  {(paymentScreenshotUrl || paymentScreenshotPreview) && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Payment Screenshot</h4>
                      <div className="relative w-40 h-40 border border-border rounded-xl overflow-hidden bg-background">
                        <Image
                          src={paymentScreenshotUrl || paymentScreenshotPreview!}
                          alt="Payment screenshot preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full bg-[#A7C1A8] hover:bg-[#A7C1A8]/90 text-white py-2 sm:py-3 text-base sm:text-lg font-semibold rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={handleConfirmOrder}
                    disabled={orderConfirmed}
                  >
                    {orderConfirmed ? "Order Completed" : "Complete Order"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-1">
            <div className="bg-card text-card-foreground rounded-xl sm:rounded-2xl shadow-lg border border-border p-4 sm:p-6 lg:sticky lg:top-6">
              <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-border">
                Order Summary
              </h2>

              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6 max-h-64 sm:max-h-96 overflow-y-auto">
                {itemsToRender.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border"
                  >
                    <div className="relative w-16 h-20 flex-shrink-0">
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        fill
                        className="rounded-lg object-cover"
                      />
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#819A91] text-white rounded-full text-xs flex items-center justify-center">
                        {item.quantity}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground line-clamp-2 text-sm">
                        {item.name}
                      </p>
                      <p className="text-foreground font-semibold text-sm mt-1">
                        ৳{(Number(item.price) * Number(item.quantity)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-border pt-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="text-foreground">৳{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Shipping</span>
                  <span className="text-foreground">৳{shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-base text-foreground border-t border-border pt-3">
                  <span>Total</span>
                  <span>৳{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border space-y-3">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4 text-[#A7C1A8]" />
                  <span>Secure payment</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Truck className="w-4 h-4 text-[#819A91]" />
                  <span>Delivery in 2-4 business days</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground rounded-xl sm:rounded-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl border border-border">
            <div className="w-16 h-16 bg-[#A7C1A8] rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-white" />
            </div>

            <h2 className="text-2xl font-bold text-foreground">🎉 Order Successful!</h2>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed px-2">
              Your order has been placed successfully. Click below to track your order.
            </p>

            <div className="space-y-3">
              <Link href="/kitabghor/user/orders" className="block">
                <Button className="w-full bg-[#819A91] hover:bg-[#819A91]/90 text-white py-3 rounded-xl">
                  Track Order
                </Button>
              </Link>

              <Link href="/kitabghor/books">
                <Button variant="outline" className="w-full border-border text-foreground hover:bg-muted rounded-xl">
                  Continue Shopping
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}