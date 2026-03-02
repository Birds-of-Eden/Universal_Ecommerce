"use client";

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";

// API থেকে যেটুকু লাগবে শুধু সেটার টাইপ
interface ProductApiItem {
  id: number | string;
  name: string;
  price: number;
  image?: string | null;
}

export interface CartItem {
  id: string | number; // ✅ server id string হতে পারে
  productId: string | number;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (productId: string | number, quantity?: number) => void;
  removeFromCart: (id: string | number) => void; // ✅ updated
  updateQuantity: (id: string | number, quantity: number) => void; // ✅ updated
  clearCart: () => void;
  cartCount: number;

  // ✅ NEW: server/cart page থেকে context replace করার জন্য
  replaceCart: (items: CartItem[]) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  // 🛒 cartItems -> localStorage synced
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("cartItems");
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        console.error("Failed to parse cartItems from localStorage:", e);
        return [];
      }
    }
    return [];
  });

  // 📚 API থেকে আনা প্রোডাক্ট লিস্ট
  const [products, setProducts] = useState<ProductApiItem[]>([]);

  // ✅ External replace (server sync / cart page sync)
  const replaceCart = (items: CartItem[]) => {
    setCartItems(Array.isArray(items) ? items : []);
  };

  // cartItems localStorage এ sync
  useEffect(() => {
    try {
      localStorage.setItem("cartItems", JSON.stringify(cartItems));
    } catch (e) {
      console.error("Failed to save cartItems to localStorage:", e);
    }
  }, [cartItems]);

  // 🔁 অন্য ট্যাব বা কোড থেকে localStorage change হলে অটো sync
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "cartItems") {
        try {
          if (!e.newValue) {
            setCartItems([]);
            return;
          }
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setCartItems(parsed);
          else setCartItems([]);
        } catch (err) {
          console.error("Failed to sync cartItems from storage event:", err);
          setCartItems([]);
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // 🧲 CartProvider মাউন্ট হলে একবারই /api/products থেকে প্রোডাক্ট লোড
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        if (!res.ok) {
          console.error("Failed to fetch products for cart:", res.statusText);
          return;
        }

        const data = await res.json();
        if (!Array.isArray(data)) {
          console.error("Invalid products response for cart:", data);
          return;
        }

        const mapped: ProductApiItem[] = data.map((p: any) => ({
          id: p.id,
          name: p.name,
          // ✅ use basePrice instead of price
          price: Number(p.basePrice ?? 0),
          image: p.image ?? "/placeholder.svg",
        }));

        setProducts(mapped);
      } catch (err) {
        console.error("Error fetching products for cart:", err);
      }
    };

    loadProducts();
  }, []);

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const addToCart = (productId: string | number, quantity: number = 1) => {
    const numericId =
      typeof productId === "string" ? Number(productId) : productId;

    const product = products.find((p) => Number(p.id) === Number(numericId));

    if (!product) {
      console.warn(
        "Product not found in CartProvider products state for id:",
        productId,
        "Available products:",
        products.map((p) => ({ id: p.id, name: p.name, price: p.price }))
      );
      return;
    }

    setCartItems((prevItems) => {
      const existingItem = prevItems.find(
        (item) => Number(item.productId) === Number(numericId)
      );

      if (existingItem) {
        return prevItems.map((item) =>
          Number(item.productId) === Number(numericId)
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }

      return [
        ...prevItems,
        {
          id: Date.now(),
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity,
          image: product.image || "/placeholder.svg",
        },
      ];
    });
  };

  const removeFromCart = (id: string | number) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string | number, quantity: number) => {
    if (quantity < 1) return;

    setCartItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        replaceCart, // ✅ expose
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}