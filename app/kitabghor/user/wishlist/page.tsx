// app/kitabghor/user/wishlist/page.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, ShoppingCart } from "lucide-react";
import { useCart } from "@/components/ecommarce/CartContext";
import { toast } from "sonner";

interface Product {
  id: number;
  name: string;
  price: number;
  original_price: number;
  discount: number;
  image: string;
}

interface WishlistApiItem {
  id: number;
  productId: number;
  product: {
    id: number;
    name: string;
    price: number | string;
    original_price?: number | string | null;
    discount?: number | null;
    image?: string | null;
  };
}

export default function WishlistPage() {
  const { addToCart } = useCart();

  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔹 API থেকে wishlist ডেটা লোড
  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/wishlist", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (res.status === 401) {
          setError("আপনার উইশলিস্ট দেখতে প্রথমে লগইন করতে হবে।");
          setWishlistProducts([]);
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          console.error("Failed to fetch wishlist:", data || res.statusText);
          setError("উইশলিস্ট লোড করতে সমস্যা হয়েছে।");
          setWishlistProducts([]);
          return;
        }

        const data = await res.json();

        const items: Product[] = Array.isArray(data.items)
          ? (data.items as WishlistApiItem[]).map((w) => ({
              id: w.product.id,
              name: w.product.name,
              price: Number(w.product.price ?? 0),
              original_price: Number(
                w.product.original_price ?? w.product.price ?? 0
              ),
              discount: Number(w.product.discount ?? 0),
              image: w.product.image ?? "/placeholder.svg",
            }))
          : [];

        setWishlistProducts(items);
      } catch (err) {
        console.error("Error fetching wishlist:", err);
        setError("উইশলিস্ট লোড করতে সমস্যা হয়েছে।");
        setWishlistProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, []);

  // 🔹 API + local state থেকে remove
  const handleRemoveItem = async (productId: number) => {
    try {
      const res = await fetch(`/api/wishlist?productId=${productId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        console.error("Failed to remove wishlist item:", data || res.statusText);
        toast.error("উইশলিস্ট থেকে সরাতে সমস্যা হয়েছে");
        return;
      }

      setWishlistProducts((prev) =>
        prev.filter((p) => p.id !== productId)
      );
      toast.success("উইশলিস্ট থেকে সরানো হয়েছে");
    } catch (err) {
      console.error("Error removing wishlist item:", err);
      toast.error("উইশলিস্ট থেকে সরাতে সমস্যা হয়েছে");
    }
  };

  const handleAddToCart = (product: Product) => {
    // তোমার CartContext এর অনুযায়ী এই কলটা ঠিক থাকলে কিছু পরিবর্তন লাগবে না
    addToCart(product.id);
    toast.success(`"${product.name}" কার্টে যোগ করা হয়েছে`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7]/30 to-white py-12 px-4">
      <div className="container mx-auto">
        {/* Enhanced Header */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/"
              className="flex items-center gap-2 text-[#0E4B4B] hover:text-[#5FA3A3] transition-colors duration-300 group"
            >
              <svg className="h-5 w-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>শপিং চালিয়ে যান</span>
            </Link>
            <div className="w-1 h-8 bg-gradient-to-b from-[#0E4B4B] to-[#5FA3A3] rounded-full"></div>
          </div>

          <div className="bg-gradient-to-r from-[#0E4B4B] to-[#5FA3A3] rounded-2xl p-6 md:p-8 text-white">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                <img
                  src="/assets/others/wishlist.png"
                  alt="Wishlist Icon"
                  className="h-8 w-8"
                />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
                  আপনার উইশলিস্ট
                </h1>
                <p className="text-white/90 opacity-90">
                  আপনার পছন্দের বইসমূহ এবং সংরক্ষিত আইটেম
                </p>
              </div>
            </div>
          </div>
        </div>

      {/* Loading / Error / Empty / List */}
        {loading ? (
          <div className="text-center py-12 text-[#5FA3A3]">
            উইশলিস্ট লোড হচ্ছে...
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-3 text-[#0D1414]">কিছু একটা সমস্যা হয়েছে</h2>
            <p className="text-[#5FA3A3] mb-6">{error}</p>
            <Link href="/">
              <Button className="rounded-full bg-gradient-to-r from-[#C0704D] to-[#A85D3F] text-white px-6 py-2 hover:shadow-lg transition-all duration-300 hover:scale-105">হোম পেইজে ফিরে যান</Button>
            </Link>
          </div>
        ) : wishlistProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
            <div className="mb-6">
              <img
                src="/assets/others/wishlist.png"
                alt="Empty Wishlist"
                className="h-16 w-16 mx-auto opacity-50"
              />
            </div>
            <h2 className="text-2xl font-semibold mb-4 text-[#0D1414]">
              আপনার উইশলিস্ট খালি
            </h2>
            <p className="text-[#5FA3A3] mb-6">
              আপনার উইশলিস্টে কোন পণ্য নেই। পছন্দের বই যোগ করতে শপিং চালিয়ে যান।
            </p>
            <Link href="/">
              <Button className="rounded-full bg-gradient-to-r from-[#C0704D] to-[#A85D3F] text-white px-8 py-3 hover:shadow-lg transition-all duration-300 hover:scale-105">
                শপিং চালিয়ে যান
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlistProducts.map((item) => (
              <Card key={item.id} className="overflow-hidden border-0 shadow-sm hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white to-[#F4F8F7] rounded-2xl relative group">
                <div className="relative">
                  <Link href={`/kitabghor/books/${item.id}`}>
                    <div className="relative h-64 w-full">
                      <Image
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform hover:scale-105"
                      />
                    </div>
                  </Link>
                  <button
                    className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1.5 shadow-md hover:bg-red-50 group/delete transition-all duration-300"
                    onClick={() => handleRemoveItem(item.id as number)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500 group-hover/delete:scale-110 transition-transform" />
                  </button>
                </div>
                <CardContent className="p-4">
                  <Link href={`/kitabghor/books/${item.id}`}>
                    <h4 className="font-semibold text-lg mb-1 text-[#0D1414] hover:text-[#0E4B4B] transition-all duration-300 line-clamp-2 group-hover:translate-x-1">
                      {item.name}
                    </h4>
                  </Link>
                  <div className="flex items-center justify-between mt-2 mb-4">
                    <div>
                      <span className="font-bold text-lg text-[#0E4B4B]">
                        ৳{item.price.toFixed(2)}
                      </span>
                      {item.original_price > item.price && (
                        <span className="text-sm text-[#5FA3A3] line-through ml-2">
                          ৳{item.original_price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    {item.discount > 0 && (
                      <span className="bg-[#C0704D] text-white px-2 py-0.5 rounded text-xs font-semibold">
                        {item.discount}% ছাড়
                      </span>
                    )}
                  </div>
                  <Button
                    className="w-full rounded-xl py-6 bg-gradient-to-r from-[#C0704D] to-[#A85D3F] hover:from-[#0E4B4B] hover:to-[#5FA3A3] text-white font-semibold border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 group/btn"
                    onClick={() => handleAddToCart(item)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                    কার্টে যোগ করুন
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
