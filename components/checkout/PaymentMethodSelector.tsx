"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LabeledInput } from "@/components/ui/labeled-input";
import { ArrowLeft, CreditCard, Shield } from "lucide-react";
import Image from "next/image";


interface PaymentGatewayData {
  type?: string;
  channel?: string;
  accountNumbers?: string[];
  storeId?: string;
  storePassword?: string;
  sandbox?: boolean;
  successUrl?: string;
  failUrl?: string;
  cancelUrl?: string;
  ipnUrl?: string;
}

interface Payment {
  id: number;
  paymentGatewayData: PaymentGatewayData | null;
  createdAt: string;
  updatedAt: string;
}

interface PaymentMethodSelectorProps {
  paymentGateways: Payment[];
  selectedMethod: string;
  onMethodChange: (method: string) => void;
  transactionId: string;
  onTransactionIdChange: (id: string) => void;
  paymentScreenshotUrl: string | null;
  paymentScreenshotPreview: string | null;
  onScreenshotChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isUploadingScreenshot: boolean;
  onBack: () => void;
  onNext: () => void;
  total: number;
}

export default function PaymentMethodSelector({
  paymentGateways,
  selectedMethod,
  onMethodChange,
  transactionId,
  onTransactionIdChange,
  paymentScreenshotUrl,
  paymentScreenshotPreview,
  onScreenshotChange,
  isUploadingScreenshot,
  onBack,
  onNext,
  total,
}: PaymentMethodSelectorProps) {
  const selectedGateway = paymentGateways.find((p) => {
    if (!selectedMethod || selectedMethod === "CashOnDelivery") return false;
    const channel = p?.paymentGatewayData?.channel as string | undefined;
    if (!channel) return false;
    const slug = channel.toLowerCase().replace(/\s+/g, "");
    return slug === selectedMethod;
  });

  const selectedGatewayAccounts =
    (selectedGateway?.paymentGatewayData?.accountNumbers as string[] | undefined) || [];

  const getChannelInitials = (channel: string): string => {
    const words = channel.trim().split(/\s+/);
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return words.map((w) => w.charAt(0).toUpperCase()).join("");
  };

  const paymentMethods = [
    ...paymentGateways
      .map((p) => {
        const type = String(p?.paymentGatewayData?.type || "").toUpperCase();
        if (type === "SSLCOMMERZ") {
          return { id: "SSLCOMMERZ", name: "SSLCommerz", color: "bg-gradient-to-r from-violet-500 to-purple-500" };
        }
        return null;
      })
      .filter(Boolean),
    { id: "CashOnDelivery", name: "Cash On Delivery", color: "bg-gradient-to-r from-[#A7C1A8] to-[#819A91]" },
  ].filter((method, index, all) => {
    if (!method) return false;
    return all.findIndex((m: any) => m?.id === (method as any).id) === index;
  });

  const isFormValid = () => {
    if (!selectedMethod) return false;
    
    if (selectedMethod === "CashOnDelivery") return true;

    if (selectedMethod === "SSLCOMMERZ") return true;
    
    // For manual payment gateways, require transaction ID and screenshot
    return transactionId.trim() !== "" && (paymentScreenshotUrl || paymentScreenshotPreview);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-2 h-6 sm:h-8 bg-[#819A91] rounded-full"></div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Payment Method</h2>
        </div>

        <Button
          variant="ghost"
          onClick={onBack}
          className="text-foreground/70 hover:text-foreground hover:bg-muted"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="grid gap-4">
        {paymentMethods.map((method: any) => (
          <Card
            key={method.id}
            className={`border-2 cursor-pointer transition-all duration-300 ${
              selectedMethod === method.id
                ? "border-[#819A91] bg-muted shadow-md"
                : "border-border hover:bg-muted"
            }`}
            onClick={() => onMethodChange(method.id)}
          >
            <CardContent className="p-3 sm:p-4">
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
                    selectedMethod === method.id ? "border-[#819A91] bg-[#819A91]" : "border-border"
                  }`}
                >
                  {selectedMethod === method.id && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedMethod && selectedMethod !== "CashOnDelivery" && selectedMethod !== "SSLCOMMERZ" && (
        <Card className="bg-muted border border-border">
          <CardContent className="p-4 sm:p-6">
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onTransactionIdChange(e.target.value)}
              className="bg-background border-border text-foreground placeholder:text-muted-foreground mt-4"
            />

            <div className="mt-4 space-y-2">
              <label className="text-sm font-medium text-foreground">Payment Screenshot *</label>
              <input
                type="file"
                accept="image/*"
                onChange={onScreenshotChange}
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
          </CardContent>
        </Card>
      )}

      {selectedMethod === "SSLCOMMERZ" && (
        <Card className="bg-muted border border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center gap-3 mb-2">
              <CreditCard className="w-5 h-5 text-[#819A91]" />
              <h3 className="font-semibold text-foreground">Online Payment (SSLCommerz)</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              You will be redirected to SSLCommerz to complete your payment securely.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Order Summary */}
      <Card className="border border-border">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-[#A7C1A8]" />
            <h3 className="font-semibold text-foreground">Order Summary</h3>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-semibold text-foreground">৳{total.toFixed(2)}</span>
            </div>
            
            {selectedMethod === "CashOnDelivery" && (
              <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                💡 You'll pay when you receive your order. No advance payment required.
              </div>
            )}
            
            {selectedMethod && selectedMethod !== "CashOnDelivery" && selectedMethod !== "SSLCOMMERZ" && (
              <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                💡 Complete payment and upload screenshot to confirm your order.
              </div>
            )}

            {selectedMethod === "SSLCOMMERZ" && (
              <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                💡 Click "Complete Order" to proceed to SSLCommerz payment.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <Button
        className="w-full bg-[#819A91] hover:bg-[#819A91]/90 text-white py-2 sm:py-3 text-base sm:text-lg font-semibold rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={onNext}
        disabled={!isFormValid() || isUploadingScreenshot}
      >
        {isUploadingScreenshot ? "Uploading..." : "Complete Order"}
      </Button>
    </div>
  );
}
