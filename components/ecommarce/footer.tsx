"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  Facebook,
  Instagram,
  Twitter,
  Mail,
  Phone,
  MapPin,
  BookOpen,
  Shield,
  Truck,
  HeadphonesIcon,
  Send,
  ArrowRight,
  Copyright,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const isAuthenticated = status === "authenticated";

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("অনুগ্রহ করে আপনার ইমেইল ঠিকানা দিন");
      return;
    }

    setIsSubscribing(true);

    try {
      // 🔍 Step 1 — Email validity check
      const checkRes = await fetch("/api/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const check = await checkRes.json();

      if (!check.valid) {
        toast.error("এই ইমেইলটি বৈধ নয় বা ইমেইল গ্রহণযোগ্য নয়");
        setIsSubscribing(false);
        return;
      }

      // 📨 Step 2 — Subscribe
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("সফলভাবে সাবস্ক্রাইব হয়েছে!");
        setEmail("");
      } else {
        toast.error(data.error || "সাবস্ক্রিপশন ব্যর্থ হয়েছে");
      }
    } catch (error) {
      console.error(error);
      toast.error("সার্ভারের সাথে সংযোগ ব্যর্থ হয়েছে");
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer className="bg-gradient-to-b from-[#0E4B4B] to-[#086666] text-[#F4F8F7] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-20 h-20 border-2 border-[#5FA3A3] rounded-full"></div>
        <div className="absolute top-1/3 right-20 w-16 h-16 border border-[#C0704D] rotate-45"></div>
        <div className="absolute bottom-20 left-1/4 w-24 h-24 border-2 border-[#5FA3A3] rounded-full"></div>
        <div className="absolute bottom-10 right-10 w-12 h-12 bg-[#C0704D] rotate-12"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 py-16">
          {/* Left Section - Brand & Contact */}
          <div className="space-y-8">
            {/* Brand */}
            <div className="space-y-4">
              <Link href="/" className="inline-block group">
                <div className="flex items-center gap-3">
                  <div className="bg-[#F4F8F7] p-2 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#0E4B4B] to-[#5FA3A3] rounded-lg flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-[#F4F8F7]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[#F4F8F7]">
                      কিতাবঘর
                    </h3>
                    <p className="text-white text-sm">
                      জ্ঞানের আলো ছড়িয়ে দেয়া
                    </p>
                  </div>
                </div>
              </Link>
              <p className="text-[#ffffff] leading-relaxed max-w-md">
                কিতাবঘর হলো একটি পূর্ণাঙ্গ অনলাইন বুকস্টোর যেখানে আপনি ইসলামিক
                বই কিনতে পারবেন কিংবা PDF পড়তে পারবেন। জ্ঞানের আলো ছড়িয়ে
                দেয়ার লক্ষ্যে আমরা নিরলসভাবে কাজ করে যাচ্ছি।
              </p>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 group cursor-pointer">
                <div className="bg-[#5FA3A3] p-2 rounded-lg group-hover:bg-[#0E4B4B] transition-colors">
                  <Phone className="h-4 w-4 text-[#F4F8F7]" />
                </div>
                <div>
                  <p className="text-sm text-white">কল করুন</p>
                  <p className="font-semibold text-[#F4F8F7]">
                    +88-01842781978
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 group cursor-pointer">
                <div className="bg-[#5FA3A3] p-2 rounded-lg group-hover:bg-[#0E4B4B] transition-colors">
                  <Mail className="h-4 w-4 text-[#F4F8F7]" />
                </div>
                <div>
                  <p className="text-sm text-white">ইমেইল করুন</p>
                  <p className="font-semibold text-[#F4F8F7]">
                    islamidawainstitute@gmail.com
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 group cursor-pointer">
                <div className="bg-[#5FA3A3] p-2 rounded-lg group-hover:bg-[#0E4B4B] transition-colors mt-1">
                  <MapPin className="h-4 w-4 text-[#F4F8F7]" />
                </div>
                <div>
                  <p className="text-sm text-white">ঠিকানা</p>
                  <p className="font-semibold text-[#F4F8F7] leading-relaxed">
                    গ্রীন রোড, ঢাকা-১২১৫
                    <br />
                    বাংলাদেশ
                  </p>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex gap-3">
              <a
                href="https://birdsofeden.me/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl bg-[#5FA3A3] hover:bg-[#0E4B4B] text-[#F4F8F7] hover:scale-110 transition-all duration-300 border-0"
                >
                  <Facebook className="h-5 w-5" />
                </Button>
              </a>
              <a
                href="https://birdsofeden.me/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl bg-[#5FA3A3] hover:bg-[#0E4B4B] text-[#F4F8F7] hover:scale-110 transition-all duration-300 border-0"
                >
                  <Instagram className="h-5 w-5" />
                </Button>
              </a>
              <a
                href="https://birdsofeden.me/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl bg-[#5FA3A3] hover:bg-[#0E4B4B] text-[#F4F8F7] hover:scale-110 transition-all duration-300 border-0"
                >
                  <Twitter className="h-5 w-5" />
                </Button>
              </a>
            </div>
          </div>

          {/* Right Section - Links & Newsletter */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-[#F4F8F7] flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-[#5FA3A3] to-[#C0704D] rounded-full"></div>
                দ্রুত লিংক
              </h3>
              <ul className="space-y-3">
                {[
                  { href: "/kitabghor/books/", label: "সকল বই" },
                  { href: "/kitabghor/categories", label: "বিষয়সমূহ" },
                  { href: "/kitabghor/about", label: "আমাদের সম্পর্কে" },
                  { href: "/kitabghor/contact", label: "যোগাযোগ" },
                  { href: "/kitabghor/faq", label: "সাধারণ জিজ্ঞাসা" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-white hover:text-[#F4F8F7] flex items-center gap-2 group transition-all duration-300 hover:translate-x-1"
                    >
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Customer Service */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-[#F4F8F7] flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-[#5FA3A3] to-[#C0704D] rounded-full"></div>
                গ্রাহক সেবা
              </h3>
              <ul className="space-y-3">
                {[
                  {
                    href: "/kitabghor/shipping",
                    label: "শিপিং নীতিমালা",
                    icon: Truck,
                  },
                  {
                    href: "/kitabghor/returns",
                    label: "রিটার্ন এবং রিফান্ড",
                    icon: HeadphonesIcon,
                  },
                  {
                    href: "/kitabghor/privacy",
                    label: "প্রাইভেসি পলিসি",
                    icon: Shield,
                  },
                  {
                    href: "/kitabghor/terms",
                    label: "ব্যবহারের শর্তাবলি",
                    icon: BookOpen,
                  },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-white hover:text-[#F4F8F7] flex items-center gap-2 group transition-all duration-300"
                    >
                      <link.icon className="h-3 w-3" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter */}
            <div>
              <h3 className="text-lg font-bold mb-6 text-[#F4F8F7] flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-[#5FA3A3] to-[#C0704D] rounded-full"></div>
                নিউজলেটার
              </h3>
              <div className="space-y-4">
                <p className="text-white text-sm leading-relaxed">
                  নতুন বই ও অফার সম্পর্কে জানতে আমাদের নিউজলেটার সাবস্ক্রিপ
                  করুন।
                </p>

                <form onSubmit={handleSubscribe} className="space-y-3">
                  <div className="relative">
                    <Input
                      type="email"
                      placeholder="আপনার ইমেইল দিন"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="rounded-xl bg-white/10 border-2 border-[#5FA3A3]/30 focus:border-[#C0704D] text-[#e4fdf7] placeholder-[#5FA3A3] pl-4 pr-12 py-6 backdrop-blur-sm"
                    />
                    <Send className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white" />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubscribing}
                    className="w-full rounded-xl bg-gradient-to-r from-[#C0704D] to-[#A85D3F] hover:from-[#A85D3F] hover:to-[#C0704D] text-[#F4F8F7] font-semibold py-6 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                  >
                    {isSubscribing
                      ? "সাবস্ক্রাইব হচ্ছে..."
                      : "সাবস্ক্রাইব করুন"}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[#5FA3A3]/30"></div>

        {/* Bottom Bar */}
        <div className="py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-white">
              <Copyright className="h-4 w-4" />
              <span>{currentYear} কিতাবঘর। সর্বস্বত্ব সংরক্ষিত।</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-white">
              <Link
                href="/privacy"
                className="hover:text-[#F4F8F7] transition-colors"
              >
                গোপনীয়তা নীতি
              </Link>
              <Link
                href="/terms"
                className="hover:text-[#F4F8F7] transition-colors"
              >
                ব্যবহারের শর্তাবলী
              </Link>
              <Link
                href="/sitemap"
                className="hover:text-[#F4F8F7] transition-colors"
              >
                সাইটম্যাপ
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute bottom-10 right-10 opacity-10">
        <BookOpen className="h-20 w-20" />
      </div>
    </footer>
  );
}
