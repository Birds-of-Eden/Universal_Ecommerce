// app/ecommerce/user/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { getDashboardRoute } from "@/lib/dashboard-route";


export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [profileImage, setProfileImage] = useState<string | undefined>(undefined);
  const pathname = usePathname();
  const router = useRouter();

  // not logged in হলে signin এ পাঠাই
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/signin");
      return;
    }

    if (status === "authenticated") {
      const dashboardRoute = getDashboardRoute(
        (session?.user ?? null) as {
          role?: string | null;
          permissions?: string[];
          defaultAdminRoute?: "/admin" | "/admin/warehouse";
        } | null,
      );

      if (
        dashboardRoute !== "/ecommerce/user/" &&
        (pathname === "/ecommerce/user" || pathname.startsWith("/ecommerce/user/"))
      ) {
        router.replace(dashboardRoute);
      }
    }
  }, [pathname, router, session, status]);

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


  return (
    <div>
      <div>
          {/* MAIN CONTENT AREA – সব child route এখানেই render হবে */}
          <main>{children}</main>
        </div>
      </div>
  );
}
