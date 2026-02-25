"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Book, Home, Search, ArrowLeft, Library, BookOpen } from "lucide-react";

export default function NotFound() {
  const popularBooks = [
    { name: "সমকালীন উপন্যাস", href: "/kitabghor/books?category=novel" },
    { name: "ইসলামী বই", href: "/kitabghor/books?category=islamic" },
    { name: "কওমী পাঠ্যবই", href: "/kowmi/daura" },
    { name: "শিশুতোষ বই", href: "/kitabghor/books?category=children" },
    { name: "বইমেলা ২০২৫", href: "/kitabghor/book-fair" },
  ];

  return (
    <div className="min-h-screen bg-[#F4F8F7] flex items-center justify-center px-4">
      <div className="max-w-2xl mx-auto text-center">
        {/* Animated Book Icon */}
        <div className="relative mb-8">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-[#0E4B4B] to-[#086666] rounded-2xl flex items-center justify-center shadow-2xl transform rotate-6 animate-float">
            <BookOpen className="h-16 w-16 text-[#F4F8F7]" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#C0704D] rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-sm font-bold">৪০৪</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6 mb-12">
          <h1 className="text-6xl md:text-7xl font-bold text-[#0E4B4B]">৪০৪</h1>

          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-[#0D1414]">
              ওহো! বইটি খুঁজে পাচ্ছি না
            </h2>
            <p className="text-lg text-[#0D1414] max-w-md mx-auto">
              আপনি যে পৃষ্ঠাটি খুঁজছেন তা হয়তো সরিয়ে নেওয়া হয়েছে, নাম
              পরিবর্তন করা হয়েছে বা সাময়িকভাবে unavailable।
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Button
            asChild
            className="bg-[#C0704D] hover:bg-[#A85D3F] text-[#F4F8F7] px-8 py-3 rounded-full font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            <Link href="/" className="flex items-center space-x-2">
              <Home className="h-4 w-4" />
              <span>হোমপেজে ফিরে যান</span>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="border-[#0E4B4B] text-[#0E4B4B] hover:bg-[#0E4B4B] hover:text-[#F4F8F7] px-8 py-3 rounded-full font-semibold transition-all duration-300 hover:scale-105"
          >
            <Link
              href="/kitabghor/books"
              className="flex items-center space-x-2"
            >
              <Library className="h-4 w-4" />
              <span>সকল বই দেখুন</span>
            </Link>
          </Button>
        </div>

        {/* Popular Sections */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-[#5FA3A3] border-opacity-30">
          <div className="flex items-center justify-center space-x-2 mb-6">
            <Search className="h-5 w-5 text-[#C0704D]" />
            <h3 className="text-xl font-bold text-[#0D1414]">
              জনপ্রিয় বিভাগসমূহ
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {popularBooks.map((book, index) => (
              <Link
                key={index}
                href={book.href}
                className="group p-4 bg-[#F4F8F7] hover:bg-[#0E4B4B] rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-md border border-[#5FA3A3] border-opacity-30 hover:border-[#0E4B4B]"
              >
                <div className="flex items-center space-x-2">
                  <Book className="h-4 w-4 text-[#5FA3A3] group-hover:text-[#F4F8F7] transition-colors" />
                  <span className="text-sm font-medium text-[#0D1414] group-hover:text-[#F4F8F7] transition-colors text-center">
                    {book.name}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Search Suggestion */}
        <div className="mt-8 p-6 bg-gradient-to-r from-[#0E4B4B] to-[#086666] rounded-2xl text-[#F4F8F7]">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <Search className="h-5 w-5 text-[#F4F8F7]" />
            <h4 className="font-semibold">এছাড়াও আপনি চেষ্টা করতে পারেন:</h4>
          </div>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm">
            <p>🔍 সার্চ বার ব্যবহার করে বই খুঁজুন</p>
            <p>📞 আমাদের হেল্পলাইন: +৮৮০ ১৭০০-১২৩৪৫৬</p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="mt-12 flex justify-center space-x-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-[#5FA3A3] rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            ></div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) rotate(6deg);
          }
          50% {
            transform: translateY(-10px) rotate(6deg);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
