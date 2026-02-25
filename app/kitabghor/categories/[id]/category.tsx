"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Heart,
  ShoppingCart,
  BookOpen,
  ArrowLeft,
  Star,
  Filter,
  BookText,
} from "lucide-react";

interface CategoryPageProps {
  category: {
    id: number;
    name: string;
  } | null;
  categoryBooks: Array<{
    id: number;
    name: string;
    image: string | null;
    price: number;
    original_price?: number | null;
    discount: number;
    writer: {
      id: number;
      name: string;
    };
    stock?: number;
  }>;
  categoryCount: number | null;
  loading: boolean;
  error: string | null;
  ratings: Record<string, { averageRating: number; totalReviews: number }>;
  toggleWishlist: (bookId: number) => void;
  handleAddToCart: (book: any) => void;
  isInWishlist: (bookId: number) => boolean;
}

export default function CategoryPage({ 
  category, 
  categoryBooks, 
  categoryCount, 
  loading, 
  error, 
  ratings,
  toggleWishlist,
  handleAddToCart,
  isInWishlist
}: CategoryPageProps) {
  // ✅ Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7]/30 to-white flex items-center justify-center">
        <p className="text-[#5FA3A3]">ডাটা লোড হচ্ছে...</p>
      </div>
    );
  }

  // ✅ Error or not-found state
  if (!category || error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7]/30 to-white py-16 flex items-center justify-center">
        <div className="text-center">
          <BookText className="h-16 w-16 text-[#5FA3A3]/30 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0D1414] mb-2">
            বিভাগ পাওয়া যায়নি
          </h2>
          <p className="text-[#5FA3A3] mb-6">
            আপনার অনুসন্ধানকৃত বিভাগটি খুঁজে পাওয়া যায়নি
          </p>
          <Link href="/kitabghor/categories">
            <Button className="rounded-full bg-gradient-to-r from-[#0E4B4B] to-[#5FA3A3] hover:from-[#5FA3A3] hover:to-[#0E4B4B] text-white px-8">
              সকল বিভাগ দেখুন
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7]/30 to-white py-8 md:py-12 lg:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header */}
        <div className="mb-8 md:mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <Link
                href="/kitabghor/categories"
                className="flex items-center gap-2 text-[#0E4B4B] hover:text-[#5FA3A3] transition-colors duration-300 group"
              >
                <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                <span>সকল বিভাগ</span>
              </Link>
              <div className="w-1 h-8 bg-gradient-to-b from-[#0E4B4B] to-[#5FA3A3] rounded-full" />
            </div>

            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg border border-[#5FA3A3]/30">
              <Filter className="h-4 w-4 text-[#0E4B4B]" />
              <span className="text-sm text-[#5FA3A3]">সাজান:</span>
              <select className="bg-transparent border-0 text-sm focus:outline-none focus:ring-0">
                <option>সর্বশেষ</option>
                <option>নাম অনুসারে</option>
                <option>দাম অনুসারে</option>
              </select>
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#0E4B4B] to-[#5FA3A3] rounded-2xl p-6 md:p-8 text-white">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                <BookOpen className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
                  {category.name}
                </h1>
                <p className="text-white/90 opacity-90">
                  এই বিভাগের সকল বইয়ের সংগ্রহ
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full" />
                <span>মোট {categoryBooks.length} টি বই</span>
              </div>

              {categoryCount !== null && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full" />
                  <span>{categoryCount}টি বিভাগ</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full" />
                <span>১০০% গুণগত মান</span>
              </div>
            </div>
          </div>
        </div>

        {/* Books Grid */}
        {categoryBooks.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <BookOpen className="h-16 w-16 text-[#5FA3A3]/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#0D1414] mb-2">
              কোন বই পাওয়া যায়নি
            </h3>
            <p className="text-[#5FA3A3] mb-6">
              এই বিভাগে এখনও কোন বই যোগ করা হয়নি
            </p>
            <Link href="/kitabghor/categories">
              <Button className="rounded-full bg-gradient-to-r from-[#0E4B4B] to-[#5FA3A3] hover:from-[#5FA3A3] hover:to-[#0E4B4B] text-white px-8">
                অন্যান্য বিভাগ দেখুন
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categoryBooks.map((book, index) => {
              const enhancedBook = {
                ...book,
                isBestseller: index % 3 === 0,
                isNew: index % 4 === 0,
              };
              const isWishlisted = isInWishlist(book.id);

              const ratingInfo = ratings[String(book.id)];
              const avgRating = ratingInfo?.averageRating ?? 0;
              const reviewCount = ratingInfo?.totalReviews ?? 0;

              return (
                <Card
                  key={book.id}
                  className="group overflow-hidden border-0 bg-gradient-to-br from-white to-[#F4F8F7] shadow-lg hover:shadow-2xl transition-all duration-500 rounded-2xl relative"
                >
                  {/* Badges */}
                  <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
                    {enhancedBook.discount > 0 && (
                      <div className="bg-gradient-to-r from-[#0E4B4B] to-[#5FA3A3] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        {enhancedBook.discount}% ছাড়
                      </div>
                    )}
                    {enhancedBook.isBestseller && (
                      <div className="bg-gradient-to-r from-[#C0704D] to-[#A85D3F] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        বেস্টসেলার
                      </div>
                    )}
                    {enhancedBook.isNew && (
                      <div className="bg-gradient-to-r from-[#5FA3A3] to-[#0E4B4B] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        নতুন
                      </div>
                    )}
                  </div>

                  {/* Wishlist Button */}
                  <button
                    onClick={() => toggleWishlist(book.id)}
                    className={`absolute top-3 right-3 z-10 p-2 rounded-full backdrop-blur-sm transition-all duration-300 ${
                      isWishlisted
                        ? "bg-red-500/20 text-red-500"
                        : "bg-white/80 text-gray-500 hover:bg-red-500/20 hover:text-red-500"
                    }`}
                    aria-label={
                      isWishlisted ? "Remove from wishlist" : "Add to wishlist"
                    }
                  >
                    <Heart
                      className={`h-5 w-5 transition-all ${
                        isWishlisted
                          ? "scale-110 fill-current"
                          : "group-hover:scale-110"
                      }`}
                    />
                  </button>

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

                  <CardContent className="p-4 sm:p-5">
                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-3 min-h-[18px]">
                      {reviewCount > 0 ? (
                        <>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${
                                  star <= Math.round(avgRating)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-[#5FA3A3] ml-1">
                            ({avgRating.toFixed(1)} · {reviewCount} রিভিউ)
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-[#5FA3A3]/50">
                          এখনও কোন রিভিউ নেই
                        </span>
                      )}
                    </div>

                    {/* Book Title */}
                    <Link href={`/kitabghor/books/${book.id}`}>
                      <h4 className="font-bold text-lg mb-2 text-[#0D1414] hover:text-[#0E4B4B] duration-300 line-clamp-2 leading-tight group-hover:translate-x-1 transition-transform">
                        {book.name}
                      </h4>
                    </Link>

                    {/* Author */}
                    <p className="text-sm text-[#5FA3A3] mb-3 flex items-center">
                      <span className="w-1 h-1 bg-[#0E4B4B] rounded-full mr-2" />
                      {book.writer?.name}
                    </p>

                    {/* Price */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-xl text-[#0E4B4B]">
                          ৳{book.price}
                        </span>
                        {book.discount > 0 && enhancedBook.original_price && (
                          <span className="text-sm text-[#5FA3A3]/60 line-through">
                            ৳{enhancedBook.original_price}
                          </span>
                        )}
                      </div>
                      {book.stock === 0 ? (
                        <div className="text-xs font-semibold bg-rose-600 text-white px-2 py-1 rounded-full">
                          Stock Out
                        </div>
                      ) : (
                        book.discount > 0 && (
                          <div className="text-xs font-semibold bg-[#F4F8F7] text-[#0E4B4B] px-2 py-1 rounded-full border border-[#5FA3A3]/30">
                            সাশ্রয় করুন
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 sm:p-5 pt-0">
                    <Button
                      disabled={book.stock === 0}
                      className={`w-full rounded-xl py-3 sm:py-4 font-semibold border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 group/btn ${
                        book.stock === 0
                          ? "bg-gray-400 cursor-not-allowed opacity-60"
                          : "bg-gradient-to-r from-[#187a7a] to-[#5b9b9b] hover:from-[#0E4B4B] hover:to-[#42a8a8] text-white"
                      }`}
                      onClick={() => handleAddToCart(book)}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                      {book.stock === 0 ? "স্টক শেষ" : "কার্টে যোগ করুন"}
                    </Button>
                  </CardFooter>

                  {/* Hover Effect Border */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-[#5FA3A3]/20 transition-all duration-500 pointer-events-none" />
                </Card>
              );
            })}
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="flex justify-between items-center mt-12 pt-8 border-t border-[#5FA3A3]/30">
          <Link
            href="/kitabghor/categories"
            className="flex items-center gap-2 text-[#0E4B4B] hover:text-[#5FA3A3] transition-colors duration-300 group"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span>সকল বিভাগে ফিরে যান</span>
          </Link>

          <div className="text-sm text-[#5FA3A3]">
            মোট{" "}
            <span className="font-semibold text-[#0E4B4B]">
              {categoryBooks.length}
            </span>{" "}
            টি বই
          </div>
        </div>
      </div>
    </div>
  );
}
