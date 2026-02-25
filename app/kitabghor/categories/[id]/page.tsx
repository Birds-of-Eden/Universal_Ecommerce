"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useCart } from "@/components/ecommarce/CartContext";
import { useWishlist } from "@/components/ecommarce/WishlistContext";
import { toast } from "sonner";
import CategoryPage from "./category";

interface PageProps {
  params: Promise<{ id: string }>;
}

type Writer = {
  id: number;
  name: string;
};

type Book = {
  id: number;
  name: string;
  image: string | null;
  price: number;
  original_price?: number | null;
  discount: number;
  writer: Writer;
  stock?: number;
};

type Category = {
  id: number;
  name: string;
};

interface RatingInfo {
  averageRating: number;
  totalReviews: number;
}

export default function Page({ params }: PageProps) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [categoryBooks, setCategoryBooks] = useState<Book[]>([]);
  const [categoryCount, setCategoryCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, RatingInfo>>({});
  const isMounted = useRef(true);

  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  // Resolve params
  useEffect(() => {
    const resolveParams = async () => {
      const param = await params;
      setResolvedParams(param);
    };
    resolveParams();
  }, [params]);

  // ✅ Load single category + books + ratings (optimized)
  useEffect(() => {
    if (!resolvedParams?.id) return;

    const abortController = new AbortController();
    const signal = abortController.signal;
    isMounted.current = true;

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (isMounted.current && loading) {
        console.error('Request timeout - taking too long to fetch category data');
        setError("লোড হতে অনেক সময় লাগছে। দয়া করে পুনরায় চেষ্টা করুন।");
        setLoading(false);
      }
    }, 10000); // 10 seconds timeout

    // Memoized fetch function
    const fetchCategoryData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) category + products
        const res = await fetch(`/api/categories/${resolvedParams.id}`, {
          cache: "no-store",
          signal,
        });
        if (!res.ok) {
          if (res.status === 404) {
            setCategory(null);
            setCategoryBooks([]);
            setError("বিভাগ পাওয়া যায়নি");
            return;
          }
          throw new Error("Failed to fetch category");
        }

        const data: { category: Category; products: Book[] } = await res.json();
        setCategory(data.category);
        setCategoryBooks(data.products);

        // 2) সব ক্যাটাগরি কাউন্ট (header info) - with caching
        const resAll = await fetch("/api/categories", {
          cache: "force-cache", // Cache this as it doesn't change often
          next: { revalidate: 300 }, // Revalidate every 5 minutes
          signal,
        });
        if (resAll.ok) {
          const allCats: Category[] = await resAll.json();
          setCategoryCount(allCats.length);
        }

        // 3) এই ক্যাটাগরির বইগুলোর রেটিং লোড (batch API)
        const ids = Array.from(
          new Set(
            data.products
              .map((b) => Number(b.id))
              .filter((id) => !!id && !Number.isNaN(id))
          )
        );

        if (ids.length > 0) {
          try {
            const batchRes = await fetch("/api/reviews/batch", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ productIds: ids }),
              cache: "no-store",
              signal,
            });

            if (batchRes.ok) {
              const batchData = await batchRes.json();
              if (batchData.success) {
                setRatings(batchData.data);
              } else {
                setRatings({});
              }
            } else {
              setRatings({});
            }
          } catch (err: any) {
            if (!isMounted.current || err.name === 'AbortError') return;
            console.error("Error fetching batch ratings:", err);
            setRatings({});
          }
        } else {
          setRatings({});
        }
      } catch (err: any) {
        if (!isMounted.current || err.name === 'AbortError') return;
        console.error(err);
        setError("ডাটা লোড করতে সমস্যা হচ্ছে");
      } finally {
        clearTimeout(timeoutId);
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    fetchCategoryData();

    return () => {
      isMounted.current = false;
      abortController.abort();
      clearTimeout(timeoutId);
    };
  }, [resolvedParams?.id, loading]);

  // Memoized toggle wishlist function
  const toggleWishlist = useCallback(
    (bookId: number) => {
      if (isInWishlist(bookId)) {
        removeFromWishlist(bookId);
        toast.success("উইশলিস্ট থেকে সরানো হয়েছে");
      } else {
        addToWishlist(bookId);
        toast.success("উইশলিস্টে যোগ করা হয়েছে");
      }
    },
    [isInWishlist, removeFromWishlist, addToWishlist]
  );

  // Memoized add to cart function
  const handleAddToCart = useCallback(
    async (book: Book) => {
      try {
        // ১) server-side cart এ যোগ করার চেষ্টা (login থাকলে সফল হবে)
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId: book.id,
            quantity: 1,
          }),
        });

        // 401 মানে user লগইন না, তখন error দেখাবো না।
        if (!res.ok && res.status !== 401) {
          const data = await res.json().catch(() => null);
          const message = data?.error || "কার্টে যোগ করতে সমস্যা হয়েছে";
          throw new Error(message);
        }

        // ২) সবসময় local cart context update হবে (login থাকুক/না থাকুক)
        addToCart(book.id, 1);

        toast.success(`"${book.name}" কার্টে যোগ করা হয়েছে`);
      } catch (err) {
        console.error("Error adding to cart:", err);
        toast.error(
          err instanceof Error ? err.message : "কার্টে যোগ করতে সমস্যা হয়েছে"
        );
      }
    },
    [addToCart]
  );

  // ⏳ Enhanced Skeleton Loader state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7]/30 to-white py-8 md:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Skeleton Header */}
          <div className="mb-8 md:mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="h-6 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="w-1 h-8 bg-gradient-to-b from-[#0E4B4B] to-[#5FA3A3] rounded-full"></div>
              </div>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg border border-[#5FA3A3]/30">
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-[#0E4B4B] to-[#5FA3A3] rounded-2xl p-6 md:p-8 text-white">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                  <div className="h-8 w-8 bg-white/10 rounded animate-pulse"></div>
                </div>
                <div>
                  <div className="h-8 w-64 bg-white/20 rounded-lg animate-pulse mb-2"></div>
                  <div className="h-4 w-48 bg-white/10 rounded-lg animate-pulse"></div>
                </div>
              </div>
              <div className="flex flex-wrap gap-6 text-sm">
                <div className="h-4 w-24 bg-white/10 rounded-lg animate-pulse"></div>
                <div className="h-4 w-20 bg-white/10 rounded-lg animate-pulse"></div>
                <div className="h-4 w-24 bg-white/10 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Skeleton Books Grid */}
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, index) => (
              <div key={index} className="group overflow-hidden border-0 bg-gradient-to-br from-white to-[#F4F8F7] shadow-lg rounded-2xl">
                {/* Skeleton Badges */}
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
                  <div className="w-16 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="w-16 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
                {/* Skeleton Wishlist Button */}
                <div className="absolute top-3 right-3 z-10">
                  <div className="w-10 h-10 bg-white/80 rounded-full animate-pulse"></div>
                </div>
                {/* Skeleton Book Image */}
                <div className="relative w-full overflow-hidden bg-white p-4">
                  <div className="relative aspect-[3/4] w-full bg-gray-200 animate-pulse"></div>
                </div>
                <div className="p-4 sm:p-5">
                  {/* Skeleton Rating */}
                  <div className="flex items-center gap-1 mb-3 min-h-[18px]">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <div key={star} className="h-3 w-3 bg-gray-200 rounded animate-pulse"></div>
                      ))}
                    </div>
                    <div className="h-3 w-20 bg-gray-200 rounded animate-pulse ml-1"></div>
                  </div>
                  {/* Skeleton Book Name */}
                  <div className="h-6 w-full bg-gray-200 rounded-lg animate-pulse mb-2"></div>
                  <div className="h-6 w-3/4 bg-gray-200 rounded-lg animate-pulse mb-3"></div>
                  {/* Skeleton Author */}
                  <div className="h-4 w-32 bg-gray-200 rounded-lg animate-pulse mb-3"></div>
                  {/* Skeleton Price */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-baseline gap-2">
                      <div className="h-6 w-16 bg-gray-200 rounded-lg animate-pulse"></div>
                      <div className="h-4 w-12 bg-gray-200 rounded-lg animate-pulse"></div>
                    </div>
                    <div className="h-6 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
                  </div>
                </div>
                {/* Skeleton Button */}
                <div className="p-4 sm:p-5 pt-0">
                  <div className="w-full h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <CategoryPage
      category={category}
      categoryBooks={categoryBooks}
      categoryCount={categoryCount}
      loading={loading}
      error={error}
      ratings={ratings}
      toggleWishlist={toggleWishlist}
      handleAddToCart={handleAddToCart}
      isInWishlist={isInWishlist}
    />
  );
}
