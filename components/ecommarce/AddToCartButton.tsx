"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/ecommarce/CartContext";

export default function AddToCartButton({
  productId,
  quantity = 1,
  className = "",
  children = "Add to Cart",
}: {
  productId: string | number;
  quantity?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!productId) return;

    try {
      setLoading(true);

      // ✅ Your existing CartContext function (localStorage cart)
      addToCart(productId, quantity);

      // optional: small success feedback
      // (You can replace alert with toast if you have one)
      // alert("Added to cart!");
    } catch (e) {
      console.error(e);
      alert("Failed to add to cart");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={loading}
      className={
        className ||
        "h-11 px-6 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-95 transition disabled:opacity-50"
      }
    >
      {loading ? "Adding..." : children}
    </button>
  );
}