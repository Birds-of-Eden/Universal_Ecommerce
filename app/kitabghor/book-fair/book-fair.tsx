"use client";

import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  memo,
  Suspense,
} from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Filter,
  Calendar,
  BookOpen,
  ArrowRight,
  Zap,
  Sparkles,
  Gift,
  Clock,
} from "lucide-react";

// ====== API Types (তোমার দেওয়া API অনুযায়ী) ======
interface CategoryApi {
  id: number;
  name: string;
  productCount: number; // /api/categories এ আমরা নিজেই map করে পাঠাচ্ছি
}

interface CategoryDetailApi {
  category: {
    id: number;
    name: string;
  };
  products: ProductApi[];
}

interface ProductApi {
  id: number;
  name: string;
  image?: string | null;
  price?: number | string | null;
  original_price?: number | string | null;
  stock?: number | null;
  writer?: {
    id: number;
    name: string;
  } | null;
}

// UI তে আমরা যে শেপে বই দেখাব
interface Book {
  id: number;
  name: string;
  image: string;
  price: number;
  original_price: number;
  writer: {
    name: string;
  };
  category: {
    id: number;
    name: string;
  };
  stock?: number;
}

interface Category {
  id: number;
  name: string;
  productCount: number;
}

const BookFairPage = memo(function BookFairPage() {
  // Global cache for fair data
  const [fairData, setFairData] = useState<{
    categories: Category[];
    productsByCategory: Record<number, Book[]>;
    allProducts: Book[];
  } | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔹 Optimized data loading with caching
  useEffect(() => {
    if (fairData) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) Fetch categories with caching
        const catRes = await fetch("/api/categories", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "force-cache",
          next: { revalidate: 300 }, // Cache for 5 minutes
        });

        if (!catRes.ok) {
          throw new Error("Failed to fetch categories");
        }

        const catData = (await catRes.json()) as CategoryApi[];
        const catList: Category[] = catData.map((c) => ({
          id: c.id,
          name: c.name,
          productCount: c.productCount ?? 0,
        }));

        // 2) Fetch all category details in parallel with caching
        const detailResponses = await Promise.all(
          catList.map(async (cat) => {
            try {
              const r = await fetch(`/api/categories/${cat.id}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
                cache: "force-cache",
                next: { revalidate: 300 },
              });

              if (!r.ok) return null;
              const detail = (await r.json()) as CategoryDetailApi;
              return detail;
            } catch (e) {
              console.error(`Error fetching category ${cat.id}:`, e);
              return null;
            }
          })
        );

        // 3) Process data efficiently
        const productsByCat: Record<number, Book[]> = {};
        const allBooksMap = new Map<number, Book>();

        detailResponses.forEach((detail) => {
          if (!detail) return;
          const { category, products } = detail;
          if (!category || !Array.isArray(products)) return;

          const catId = category.id;
          const catName = category.name;

          const books: Book[] = products.map((p) => ({
            id: p.id,
            name: p.name,
            image: p.image || "/placeholder.svg",
            price: Number(p.price ?? 0),
            original_price: Number(p.original_price ?? p.price ?? 0),
            stock: Number(p.stock ?? 0),
            writer: {
              name: p.writer?.name || "অজ্ঞাত লেখক",
            },
            category: {
              id: catId,
              name: catName,
            },
          }));

          productsByCat[catId] = books;
          books.forEach((b) => {
            if (!allBooksMap.has(b.id)) {
              allBooksMap.set(b.id, b);
            }
          });
        });

        // Cache the processed data
        setFairData({
          categories: catList,
          productsByCategory: productsByCat,
          allProducts: Array.from(allBooksMap.values()),
        });
      } catch (err) {
        console.error("Error loading book fair data:", err);
        setError("বইমেলার তথ্য লোড করতে সমস্যা হয়েছে।");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fairData]);

  // 🔹 Memoized filtered books
  const filteredBooks = useMemo(() => {
    if (!fairData) return [];

    return selectedCategoryId === null
      ? fairData.allProducts
      : fairData.productsByCategory[selectedCategoryId] || [];
  }, [fairData, selectedCategoryId]);

  // 🔹 Memoized category data
  const fairCategories = useMemo(() => fairData?.categories || [], [fairData]);

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId || !fairData) return null;
    return fairData.categories.find((c) => c.id === selectedCategoryId) ?? null;
  }, [selectedCategoryId, fairData]);

  // 🔹 Memoized callbacks
  const handleCategorySelect = useCallback((categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/30 via-white to-teal-50/20 py-8 md:py-12 lg:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header */}
        <div className="text-center mb-12 md:mb-16 relative">
          {/* Background decoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/4 w-32 h-32 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl"></div>
            <div className="absolute top-0 right-1/4 w-40 h-40 bg-gradient-to-r from-teal-400/20 to-emerald-400/20 rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-3 h-16 bg-gradient-to-b from-emerald-600 to-teal-600 rounded-full shadow-lg"></div>
              <div className="relative">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
                  বইমেলা ২০২৫
                </h1>
                <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 rounded-full opacity-50"></div>
              </div>
              <div className="w-3 h-16 bg-gradient-to-b from-teal-600 to-emerald-600 rounded-full shadow-lg"></div>
            </div>

            <p className="text-gray-600 text-xl max-w-3xl mx-auto mb-8 leading-relaxed">
              বিশেষ বইমেলা অফার! সীমিত সময়ের জন্য বিশেষ মূল্যে বই কিনুন
            </p>

            {/* Enhanced Fair Countdown/Tag */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <div className="inline-flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
                <Sparkles className="h-6 w-6 animate-pulse" />
                <span className="font-bold text-lg">
                  স্পেশাল অফার - সীমিত সময়ের জন্য
                </span>
                <Gift className="h-6 w-6 animate-bounce" />
              </div>

              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-full shadow-lg">
                <Clock className="h-5 w-5" />
                <span className="font-semibold">অফার শেষ হতে আরও কিছুক্ষণ</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filter */}
          <div className="lg:col-span-1">
            <Card className="bg-gradient-to-br from-emerald-50/50 to-white/80 backdrop-blur-sm shadow-2xl rounded-3xl sticky top-8 hover:shadow-3xl transition-all duration-500 border border-emerald-200/30">
              <CardContent className="p-8">
                {/* Enhanced Filter Header */}
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-emerald-200/50">
                  <div className="p-2 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg">
                    <Filter className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                      কওমী পাঠ্য কিতাব
                    </h2>
                    <p className="text-sm text-gray-600">
                      ক্যাটাগরি অনুযায়ী বই দেখুন
                    </p>
                  </div>
                </div>

                {/* Enhanced Category List */}
                <div className="space-y-2">
                  {/* All Categories Button */}
                  <button
                    className={`w-full text-left p-4 rounded-2xl transition-all duration-300 flex items-center justify-between group transform hover:scale-105 ${
                      selectedCategoryId === null
                        ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl border-2 border-transparent"
                        : "bg-white hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 text-gray-700 border-2 border-emerald-200/50 hover:border-emerald-400/50"
                    }`}
                    onClick={() => handleCategorySelect(null)}
                    disabled={loading || !!error}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          selectedCategoryId === null
                            ? "bg-white"
                            : "bg-emerald-600"
                        }`}
                      ></div>
                      <span className="font-bold text-base">সকল বই</span>
                    </div>
                    <div
                      className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                        selectedCategoryId === null
                          ? "bg-white/20 text-white"
                          : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg"
                      }`}
                    >
                      {fairData?.allProducts.length || 0}
                    </div>
                  </button>

                  {fairCategories.map((category) => (
                    <button
                      key={category.id}
                      className={`w-full text-left p-4 rounded-2xl transition-all duration-300 flex items-center justify-between group transform hover:scale-105 ${
                        selectedCategoryId === category.id
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl border-2 border-transparent"
                          : "bg-white hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 text-gray-700 border-2 border-emerald-200/50 hover:border-emerald-400/50"
                      }`}
                      onClick={() => handleCategorySelect(category.id)}
                      disabled={loading || !!error}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            selectedCategoryId === category.id
                              ? "bg-white"
                              : "bg-emerald-600"
                          }`}
                        ></div>
                        <span className="font-bold text-sm group-hover:translate-x-2 transition-transform duration-300">
                          {category.name}
                        </span>
                      </div>
                      <div
                        className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                          selectedCategoryId === category.id
                            ? "bg-white/20 text-white"
                            : "bg-gradient-to-r from-emerald-600/80 to-teal-600/80 text-white shadow-lg"
                        }`}
                      >
                        {category.productCount}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Enhanced Fair Info */}
                <div className="mt-8 p-6 bg-gradient-to-br from-emerald-100/50 via-teal-100/50 to-emerald-100/50 rounded-2xl border border-emerald-200/50 backdrop-blur-sm">
                  <h3 className="font-bold text-lg bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-4 flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    বইমেলা তথ্য
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl">
                      <Gift className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700">
                        বিশেষ মূল্যে সকল বই
                      </span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl">
                      <Sparkles className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700">
                        হোম ডেলিভারি
                      </span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl">
                      <Zap className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700">
                        এক্সক্লুসিভ অফার
                      </span>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl">
                      <Clock className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      <span className="text-sm font-medium text-gray-700">
                        সীমিত সময়ের জন্য
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Book Grid */}
          <div className="lg:col-span-3">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="text-gray-600">
                {loading ? (
                  <span>বই লোড হচ্ছে...</span>
                ) : error ? (
                  <span className="text-red-500">{error}</span>
                ) : (
                  <>
                    <span className="font-semibold text-emerald-600 mr-1">
                      {filteredBooks.length}
                    </span>
                    টি বই পাওয়া গেছে
                    {selectedCategory && (
                      <span className="ml-2">
                        -{" "}
                        <span className="font-semibold">
                          {selectedCategory.name}
                        </span>
                      </span>
                    )}
                  </>
                )}
              </div>

              {selectedCategory && !loading && !error && (
                <Button
                  variant="outline"
                  onClick={() => handleCategorySelect(null)}
                  className="rounded-full border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                >
                  ফিল্টার সরান
                </Button>
              )}
            </div>

            {/* Books Grid */}
            {loading ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
                <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  বই লোড হচ্ছে...
                </h3>
              </div>
            ) : error ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
                <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-red-500 mb-2">
                  {error}
                </h3>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
                <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  কোন বই পাওয়া যায়নি
                </h3>
                <p className="text-gray-500 mb-6">
                  এই বিভাগে এখনও কোন বই যোগ করা হয়নি
                </p>
                <Button
                  onClick={() => handleCategorySelect(null)}
                  className="rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8"
                >
                  সব বই দেখুন
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBooks.map((book) => (
                  <Card
                    key={book.id}
                    className="group overflow-hidden bg-gradient-to-br from-white to-emerald-50/80 backdrop-blur-sm shadow-2xl hover:shadow-3xl transition-all duration-700 rounded-3xl relative transform hover:scale-105 hover:-translate-y-2"
                  >
                    {/* Enhanced Fair Badge */}
                    <div className="absolute top-4 left-4 z-10">
                      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-xl flex items-center gap-2 animate-pulse">
                        <Sparkles className="h-3 w-3" />
                        বইমেলা বিশেষ
                      </div>
                    </div>

                    {/* Book Image */}
                    <Link href={`/kitabghor/books/${book.id}`}>
                      <div className="relative w-full overflow-hidden bg-white p-4">
                        <div className="relative aspect-[3/4] w-full">
                          <Image
                            src={book.image || "/placeholder.svg"}
                            alt={book.name}
                            fill
                            className="object-contain transition-transform duration-700 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                          />
                        </div>
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        {/* Quick View */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="bg-white/90 backdrop-blur-sm rounded-full p-3 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            <BookOpen className="h-6 w-6 text-[#0E4B4B]" />
                          </div>
                        </div>
                      </div>
                    </Link>

                    <CardContent className="p-5 sm:p-6">
                      {/* Enhanced Book Title */}
                      <Link href={`/kitabghor/books/${book.id}`}>
                        <h3 className="font-bold text-lg sm:text-xl mb-3 text-gray-800 hover:text-emerald-600 line-clamp-2 leading-tight group-hover:translate-x-2 transition-transform duration-300">
                          {book.name}
                        </h3>
                      </Link>

                      {/* Enhanced Author */}
                      <p className="text-sm text-gray-600 mb-4 flex items-center">
                        <span className="w-1.5 h-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-full mr-3 inline-block"></span>
                        <span className="font-medium">{book.writer.name}</span>
                      </p>

                      {/* Enhanced Price */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-baseline gap-3">
                          <span className="font-bold text-xl sm:text-2xl bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                            ৳{book.price}
                          </span>
                          {book.original_price > book.price && (
                            <span className="text-sm text-gray-500 line-through">
                              ৳{book.original_price}
                            </span>
                          )}
                        </div>

                        {book.stock === 0 ? (
                          <div className="text-xs font-semibold bg-rose-600 text-white px-2 py-1 rounded-full">
                            Stock Out
                          </div>
                        ) : (
                          book.original_price > book.price && (
                            <div className="text-xs font-bold bg-gradient-to-r from-emerald-100 to-teal-100 text-gray-700 px-3 py-1.5 rounded-full border border-emerald-300/30">
                              সাশ্রয় করুন
                            </div>
                          )
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="p-5 sm:p-6 pt-0">
                      <Link
                        href={`/kitabghor/books/${book.id}`}
                        className="w-full"
                      >
                        <Button
                          disabled={book.stock === 0}
                          className={`w-full rounded-2xl py-4 sm:py-5 font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group/btn text-base ${
                            book.stock === 0
                              ? "bg-gray-400 cursor-not-allowed opacity-60"
                              : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-600 text-white"
                          }`}
                        >
                          <BookOpen className="mr-3 h-5 w-5 group-hover/btn:scale-110 transition-transform" />
                          {book.stock === 0 ? "স্টক শেষ" : "বিস্তারিত দেখুন"}
                          {book.stock !== 0 && (
                            <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                          )}
                        </Button>
                      </Link>
                    </CardFooter>

                    {/* Enhanced Hover Effect Border */}
                    <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-emerald-600/30 transition-all duration-700 pointer-events-none"></div>
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-emerald-600/5 to-teal-600/5 opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none"></div>
                  </Card>
                ))}
              </div>
            )}

            {/* Load More Section */}
            {filteredBooks.length > 0 && !loading && !error && (
              <div className="text-center mt-12">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-0.5 rounded-full inline-block">
                  <Button
                    variant="ghost"
                    className="rounded-full bg-white hover:bg-gray-50 text-gray-800 font-semibold px-8 py-6 group text-sm sm:text-base"
                  >
                    <span className="mr-2">আরও বই লোড করুন</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

BookFairPage.displayName = "BookFairPage";

export default function BookFair() {
  return (
    <Suspense fallback={<BookFairSkeleton />}>
      <BookFairPage />
    </Suspense>
  );
}

// Skeleton component for loading state
function BookFairSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/30 via-white to-teal-50/20 py-8 md:py-12 lg:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="text-center mb-12 md:mb-16">
          <Skeleton className="h-16 w-64 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto mb-8" />
          <div className="flex justify-center gap-4">
            <Skeleton className="h-12 w-48 rounded-full" />
            <Skeleton className="h-12 w-40 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Skeleton */}
          <div className="lg:col-span-1">
            <Card className="p-8">
              <Skeleton className="h-8 w-32 mb-6" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            </Card>
          </div>

          {/* Content Skeleton */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-64 w-full" />
                  <div className="p-6 space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
