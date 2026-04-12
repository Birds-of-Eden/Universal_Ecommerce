"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { useCart } from "@/components/ecommarce/CartContext";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const STORAGE_KEY = "floating-cart-position";
const BUTTON_WIDTH = 68;
const BUTTON_HEIGHT = 64;
const EDGE_MARGIN = 12;
const DRAG_THRESHOLD = 6;

type Position = {
  x: number;
  y: number;
};

function getDefaultPosition(): Position {
  if (typeof window === "undefined") {
    return { x: 0, y: 140 };
  }

  return {
    x: window.innerWidth - BUTTON_WIDTH - EDGE_MARGIN,
    y: Math.max(120, window.innerHeight - 240),
  };
}

function clampY(y: number) {
  if (typeof window === "undefined") return y;
  const maxY = window.innerHeight - BUTTON_HEIGHT - EDGE_MARGIN;
  return Math.min(Math.max(EDGE_MARGIN, y), maxY);
}

function snapToEdge(x: number, y: number): Position {
  if (typeof window === "undefined") return { x, y };

  const middle = window.innerWidth / 2;
  const snappedX =
    x + BUTTON_WIDTH / 2 < middle
      ? EDGE_MARGIN
      : window.innerWidth - BUTTON_WIDTH - EDGE_MARGIN;

  return {
    x: snappedX,
    y: clampY(y),
  };
}

function getDrawerSide(x: number): "left" | "right" {
  if (typeof window === "undefined") return "right";
  return x + BUTTON_WIDTH / 2 < window.innerWidth / 2 ? "left" : "right";
}

export default function FloatingCartButton() {
  const router = useRouter();
  const { cartItems, cartCount, removeFromCart, updateQuantity } = useCart();

  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<Position>(getDefaultPosition);
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(false);
  const [drawerSide, setDrawerSide] = useState<"left" | "right">("right");

  const suppressClickRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    setMounted(true);

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        const fallback = getDefaultPosition();
        setPosition(fallback);
        setDrawerSide(getDrawerSide(fallback.x));
        return;
      }

      const parsed = JSON.parse(saved) as Position;
      const snapped = snapToEdge(parsed.x, parsed.y);
      setPosition(snapped);
      setDrawerSide(getDrawerSide(snapped.x));
    } catch {
      const fallback = getDefaultPosition();
      setPosition(fallback);
      setDrawerSide(getDrawerSide(fallback.x));
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  }, [mounted, position]);

  useEffect(() => {
    if (!mounted) return;

    const handleResize = () => {
      setPosition((prev) => {
        const snapped = snapToEdge(prev.x, prev.y);
        setDrawerSide(getDrawerSide(snapped.x));
        return snapped;
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mounted]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      const nextX = event.clientX - drag.offsetX;
      const nextY = event.clientY - drag.offsetY;

      if (
        Math.abs(nextX - position.x) > DRAG_THRESHOLD ||
        Math.abs(nextY - position.y) > DRAG_THRESHOLD
      ) {
        drag.moved = true;
        suppressClickRef.current = true;
      }

      setDragging(true);
      setPosition({
        x: nextX,
        y: clampY(nextY),
      });
    };

    const handlePointerUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      dragRef.current = null;
      setDragging(false);

      setPosition((prev) => {
        const snapped = snapToEdge(prev.x, prev.y);
        setDrawerSide(getDrawerSide(snapped.x));
        return snapped;
      });

      setTimeout(() => {
        suppressClickRef.current = false;
      }, 150);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [position.x, position.y]);

  const subtotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
        0,
      ),
    [cartItems],
  );

  if (!mounted) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <button
          type="button"
          onPointerDown={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();

            dragRef.current = {
              pointerId: event.pointerId,
              offsetX: event.clientX - rect.left,
              offsetY: event.clientY - rect.top,
              moved: false,
            };

            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onClick={() => {
            if (suppressClickRef.current) return;
            setOpen(true);
          }}
          style={{
            left: position.x,
            top: position.y,
          }}
          className={`fixed z-50 flex min-w-[68px] flex-col items-center rounded-xl border border-border bg-primary px-3 py-2 text-primary-foreground shadow-lg transition ${
            dragging
              ? "cursor-grabbing scale-105 shadow-2xl"
              : "cursor-grab hover:shadow-xl"
          }`}
          aria-label="Open cart drawer"
        >
          <div className="relative">
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {cartCount}
              </span>
            )}
          </div>

          <span className="mt-1 text-[11px] font-medium">Cart</span>
        </button>

        <SheetContent
          side={drawerSide}
          className="w-full border-border p-0 sm:max-w-[420px]"
        >
          <SheetHeader className="border-b bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex w-full items-center justify-between">
              <SheetTitle className="flex gap-2 items-center justify-center text-base font-semibold text-primary-foreground">
                <ShoppingCart width={20}/>
                Cart
              </SheetTitle>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 bg-destructive text-destructive-foreground transition hover:bg-destructive/90"
                aria-label="Close cart drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SheetDescription className="hidden">
              Review cart items and continue to checkout.
            </SheetDescription>
          </SheetHeader>

          <div className="flex h-full flex-col bg-background">
            <div className="flex-1 overflow-y-auto px-3 py-4">
              {cartItems.length === 0 ? (
                <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 text-center">
                  <ShoppingBag className="mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="font-medium text-foreground">Your cart is empty</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add some items to continue shopping.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div
                      key={`${item.id}-${item.variantId ?? "base"}`}
                      className="overflow-hidden rounded-md border border-border bg-card"
                    >
                      <div className="grid grid-cols-[1fr_92px] gap-3 border-b border-border p-3">
                        <div className="min-w-0">
                          <div className="line-clamp-2 text-sm font-medium text-foreground">
                            {item.name}
                          </div>
                          {item.variantLabel ? (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {item.variantLabel}
                            </div>
                          ) : null}
                        </div>
                        <div className="relative h-24 overflow-hidden rounded-md border border-border bg-background">
                          <Image
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-[90px_1fr] border-b border-border px-3 py-2 text-sm">
                        <span className="text-muted-foreground">Price</span>
                        <span className="text-right font-medium text-foreground">
                          {formatPrice(item.price)}
                        </span>
                      </div>

                      <div className="grid grid-cols-[90px_1fr] border-b border-border px-3 py-2 text-sm">
                        <span className="text-muted-foreground">Quantity</span>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.id, Math.max(0, item.quantity - 1))
                            }
                            className="rounded border border-border p-1 text-foreground transition hover:bg-accent"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-8 text-center font-medium text-foreground">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="rounded border border-border p-1 text-foreground transition hover:bg-accent"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-[90px_1fr_auto] items-center px-3 py-2 text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="text-right font-semibold text-foreground">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="ml-3 rounded bg-destructive/10 p-2 text-destructive transition hover:bg-destructive hover:text-destructive-foreground"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border bg-card">
              <div className="grid grid-cols-[1fr_auto] items-center px-4 py-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Cart Total
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    {formatPrice(subtotal)}
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setOpen(false);
                    router.push("/ecommerce/checkout");
                  }}
                  disabled={cartItems.length === 0}
                  className="h-12 rounded-none rounded-tr-none rounded-br-none bg-primary px-6 text-primary-foreground hover:bg-primary disabled:bg-muted disabled:text-muted-foreground sm:rounded-md"
                >
                  Checkout
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function formatPrice(value: number) {
  return `৳ ${Math.round(Number(value) || 0).toLocaleString("en-US")}`;
}
