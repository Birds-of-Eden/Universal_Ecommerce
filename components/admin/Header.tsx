"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Menu, Home, LogOut, LayoutDashboard, BookOpen } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { useState } from "react";

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { data: session } = useSession();
  const [isPending, setIsPending] = useState(false);

  const handleLogout = async () => {
    setIsPending(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsPending(false);
    }
  };

  const userName = (session?.user as any)?.name || "ব্যবহারকারী";
  const userRole = (session?.user as any)?.role || "admin";

  return (
    <header className="w-full h-20 bg-gradient-to-r from-[#0E4B4B] to-[#086666] border-b border-[#F4F8F7]/10 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20 shadow-lg backdrop-blur-sm">
      {/* Mobile menu toggle */}
      <button
        className="lg:hidden p-2 rounded-full bg-[#F4F8F7]/10 hover:bg-[#F4F8F7]/20 transition-all duration-300 hover:scale-105"
        onClick={onMenuClick}
        aria-label="Toggle Menu"
      >
        <Menu className="w-5 h-5 text-[#F4F8F7]" />
      </button>

      {/* Logo and Title */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-[#0E4B4B] to-[#5FA3A3] rounded-xl flex items-center justify-center shadow-lg">
          <LayoutDashboard className="h-5 w-5 text-[#F4F8F7]" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-[#F4F8F7] hidden sm:block">
            হিলফুল-ফুযুল অ্যাডমিন
          </h1>
          <p className="text-xs text-[#F4F8F7]/70 hidden sm:block">
            প্রকাশনী ব্যবস্থাপনা সিস্টেম
          </p>
          <h1 className="text-lg font-bold text-[#F4F8F7] sm:hidden">অ্যাডমিন</h1>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* View Site Link */}
        <Link
          href="/"
          className="text-sm font-medium transition-all duration-300 hover:scale-105"
          title="View Live Site"
        >
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:flex bg-[#F4F8F7]/10 hover:bg-[#F4F8F7]/20 text-[#F4F8F7] border border-[#F4F8F7]/20 hover:border-[#F4F8F7]/30 rounded-full px-4"
          >
            <Home className="w-4 h-4 mr-2" />
            সাইটে যান
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden bg-[#F4F8F7]/10 hover:bg-[#F4F8F7]/20 text-[#F4F8F7] rounded-full"
          >
            <Home className="w-4 h-4" />
          </Button>
        </Link>

        {/* User Info & Avatar */}
        <div className="hidden md:flex flex-col text-right">
          <p className="text-[#F4F8F7] text-sm font-semibold leading-none">
            {userName}
          </p>
          <p className="text-[#F4F8F7]/70 text-xs leading-none mt-1">
            {userRole}
          </p>
        </div>

        <Link href="/admin/profile" title="View Profile">
          <Avatar className="h-9 w-9 border-2 border-[#F4F8F7]/30 cursor-pointer hover:opacity-80 transition-all duration-300 hover:scale-105 hover:border-[#C0704D]">
            <AvatarImage
              src={(session?.user as any)?.image ?? undefined}
              alt={session?.user?.name ?? "Profile"}
            />
            <AvatarFallback className="bg-[#C0704D] text-[#F4F8F7] font-bold text-sm">
              {(session?.user?.name || "Me")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          disabled={isPending}
          className="hidden sm:flex bg-[#C0704D] hover:bg-[#A85D3F] text-[#F4F8F7] font-semibold px-6 rounded-full transition-all duration-300 hover:shadow-lg hover:scale-105 border border-[#C0704D] hover:border-[#A85D3F]"
        >
          {isPending ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <>
              <LogOut className="w-4 h-4 mr-2" />
              লগআউট
            </>
          )}
        </Button>
        <Button
          onClick={handleLogout}
          disabled={isPending}
          variant="ghost"
          size="icon"
          className="sm:hidden bg-[#F4F8F7]/10 hover:bg-[#F4F8F7]/20 text-[#F4F8F7] rounded-full"
          title="Logout"
        >
          {isPending ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <LogOut className="w-4 h-4" />
          )}
        </Button>
      </div>
    </header>
  );
}