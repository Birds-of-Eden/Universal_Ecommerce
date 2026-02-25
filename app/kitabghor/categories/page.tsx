"use client";

import { useEffect, useState, useMemo, useCallback, memo, Suspense } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, ArrowRight, Library } from "lucide-react";

type Category = {
  id: number;
  name: string;
  productCount: number;
  slug?: string; // thakle use korte parba
};

const CategoryCardsPage = memo(function CategoryCardsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔹 Memoized icon function
  const getCategoryIcon = useCallback((name: string) => {
    switch (name) {
      case "আত্মজীবনী":
        return "📖";
      case "রীতিনীতি":
        return "🏛️";
      case "হযরত মাওলানা কালিম সিদ্দিকী":
        return "👳";
      case "ইসলাম ও হেদায়েত":
        return "🕌";
      case "দাওয়াত ও দায়ী":
        return "📢";
      case "হিন্দু ভাইদের জন্য":
        return "🕉️";
      case "খ্রিষ্টান ভাইদের জন্য":
        return "✝️";
      default:
        return "📚";
    }
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories", {
          cache: "force-cache",
          next: { revalidate: 600 } // Cache for 10 minutes
        });

        if (!res.ok) {
          throw new Error("Failed to fetch categories");
        }

        const data: Category[] = await res.json();
        setCategories(data);
      } catch (err) {
        console.error(err);
        setError("বিষয়সমূহ লোড করতে সমস্যা হচ্ছে");
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F4F8F7]/30 to-white py-8 md:py-12 lg:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-2 h-12 bg-gradient-to-b from-[#0E4B4B] to-[#5FA3A3] rounded-full"></div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#0D1414]">
              বিষয়সমূহ
            </h1>
            <Library className="h-8 w-8 md:h-10 md:w-10 text-[#0E4B4B]" />
          </div>
          <p className="text-[#5FA3A3] text-lg max-w-2xl mx-auto">
            বিভিন্ন বিষয়ের উপর লেখা আমাদের বইগুলির সংগ্রহ ব্রাউজ করুন
          </p>
        </div>

        {/* Loading / Error */}
        {loading && (
          <p className="text-center text-[#5FA3A3]">বিষয়সমূহ লোড হচ্ছে...</p>
        )}
        {error && (
          <p className="text-center text-red-500 font-medium">{error}</p>
        )}

        {/* Categories Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {categories.map((category) => {
              const icon = getCategoryIcon(category.name);
              const count = category.productCount ?? 0;

              return (
                <Link
                  href={`/kitabghor/categories/${category.id}`}
                  key={category.id}
                  className="group hover:no-underline block"
                >
                  <Card className="h-full border-0 bg-gradient-to-br from-white to-[#F4F8F7] shadow-lg hover:shadow-2xl transition-all duration-500 rounded-2xl overflow-hidden relative">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute top-2 right-2 w-8 h-8 border border-[#0E4B4B] rounded-full"></div>
                      <div className="absolute bottom-2 left-2 w-6 h-6 bg-[#5FA3A3] rotate-45"></div>
                    </div>

                    {/* Hover Border Effect */}
                    <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-[#5FA3A3]/20 transition-all duration-500 pointer-events-none"></div>

                    <CardContent className="p-6 md:p-8 text-center flex flex-col items-center justify-center h-full relative z-10">
                      {/* Icon Container */}
                      <div className="relative mb-4 md:mb-6">
                        {/* Background Circle */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0E4B4B] to-[#5FA3A3] rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-300"></div>

                        {/* Main Icon */}
                        <div className="relative bg-white p-4 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 border border-[#5FA3A3]/30">
                          <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center text-2xl md:text-3xl">
                            {icon}
                          </div>
                        </div>

                        {/* Book Count Badge */}
                        <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-[#0E4B4B] to-[#5FA3A3] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                          {count}
                        </div>
                      </div>

                      {/* Category Name */}
                      <h3 className="text-lg md:text-xl font-bold text-[#0D1414] mb-2 group-hover:text-[#0E4B4B] transition-colors duration-300 line-clamp-2 leading-tight">
                        {category.name}
                      </h3>

                      {/* Book Count Text */}
                      <p className="text-sm text-[#5FA3A3] mb-4 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-[#0E4B4B]" />
                        <span>মোট {count} টি বই</span>
                      </p>

                      {/* CTA Button */}
                      <div className="flex items-center justify-center gap-2 text-[#0E4B4B] group-hover:text-[#5FA3A3] transition-colors duration-300 font-semibold text-sm">
                        <span>ব্রাউজ করুন</span>
                        <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                      </div>

                      {/* Hover Effect Line */}
                      <div className="w-0 group-hover:w-12 h-0.5 bg-gradient-to-r from-[#0E4B4B] to-[#5FA3A3] rounded-full transition-all duration-500 mt-2"></div>
                    </CardContent>

                    {/* Gradient Overlay on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0E4B4B]/5 to-[#5FA3A3]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"></div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {/* Bottom CTA Section */}
        <div className="text-center mt-12 md:mt-16">
          <div className="bg-gradient-to-r from-[#0E4B4B] to-[#5FA3A3] p-0.5 rounded-full inline-block">
            <div className="bg-white rounded-full px-8 py-4">
              <p className="text-[#0D1414] font-semibold text-lg">
                আরও বিষয়সমূহ শীঘ্রই আসছে...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CategoryCardsPage.displayName = 'CategoryCardsPage';

export default function CategoriesPage() {
  return (
    <Suspense fallback={<CategoriesSkeleton />}>
      <CategoryCardsPage />
    </Suspense>
  );
}

// Skeleton component for loading state
function CategoriesSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Skeleton */}
        <div className="text-center mb-12">
          <Skeleton className="h-12 w-48 mx-auto mb-4" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="h-48 bg-white rounded-2xl shadow-lg">
              <CardContent className="p-8 text-center space-y-4">
                <Skeleton className="h-12 w-12 mx-auto rounded-full" />
                <Skeleton className="h-6 w-3/4 mx-auto" />
                <Skeleton className="h-4 w-1/2 mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
