// app/kitabghor/user/layout.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [profileImage, setProfileImage] = useState<string | undefined>(undefined);
  const pathname = usePathname();
  const router = useRouter();

  // not logged in হলে signin এ পাঠাই
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/signin");
    }
  }, [status, router]);

  // সর্বশেষ প্রোফাইল ইমেজ লোড করি, যেন sidebar সব সময় আপডেট থাকে
  useEffect(() => {
    const loadProfileImage = async () => {
      if (status !== "authenticated") return;
      try {
        const res = await fetch("/api/user/profile");
        if (!res.ok) return;
        const data = await res.json();
        if (data.image) {
          setProfileImage(data.image as string);
        }
      } catch {
        // ignore
      }
    };

    loadProfileImage();
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-gradient-to-b from-[#F4F8F7]/30 to-white">
        <p className="text-sm text-[#5FA3A3]">Loading...</p>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const userName = session.user.name || "User";
  const userEmail = session.user.email || "";
  const userRole = (session.user as any).role ?? "user";
  const sessionImage = (session.user as any).image as string | undefined;
  const userImage = profileImage ?? sessionImage;

  const menuItems = [
    { label: "My Profile", href: "/kitabghor/user" },
    { label: "My Orders", href: "/kitabghor/user/orders" },
    { label: "My WishList", href: "/kitabghor/user/wishlist" },
  ];

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-[#F4F8F7]/30 to-white py-6">
      <div className="px-2 sm:px-4">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* SIDEBAR */}
          <aside className="w-full md:w-64 flex-shrink-0 space-y-4">
            {/* Hello card */}
            <Card className="p-4 flex items-center gap-3 shadow-sm border border-[#5FA3A3]/20 bg-white rounded-2xl">
              {userImage ? (
                <img
                  src={userImage}
                  alt={userName}
                  className="h-12 w-12 rounded-full object-cover border-2 border-[#5FA3A3]/30 shadow-sm"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#0E4B4B] to-[#5FA3A3] flex items-center justify-center text-white font-semibold text-lg uppercase shadow-sm">
                  {userName.charAt(0)}
                </div>
              )}
              <div className="leading-tight">
                <p className="text-xs text-[#5FA3A3]">Hello,</p>
                <p className="text-sm font-semibold text-[#0D1414] truncate">
                  {userName}
                </p>
                <p className="text-[11px] text-[#5FA3A3] truncate">
                  {userEmail}
                </p>
                <p className="text-[11px] text-[#5FA3A3]">Role: {userRole}</p>
              </div>
            </Card>

            {/* Menu */}
            <Card className="p-3 shadow-sm border border-[#5FA3A3]/20 bg-white rounded-2xl">
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all border-l-4 ${
                        isActive
                          ? "bg-[#0E4B4B]/10 text-[#0E4B4B] border-[#0E4B4B] shadow-sm"
                          : "bg-white text-[#5FA3A3] border-transparent hover:bg-[#F4F8F7] hover:text-[#0E4B4B] hover:border-[#5FA3A3]/30"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </Card>
          </aside>

          {/* MAIN CONTENT AREA – সব child route এখানেই render হবে */}
          <main className="flex-1 space-y-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
