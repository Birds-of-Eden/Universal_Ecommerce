"use client";

import { SidebarProvider, useSidebar } from "@/providers/sidebar-provider";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/admin/Sidebar";
import Header from "@/components/admin/Header";

// Client component that uses the Sidebar context
function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { openMobile, toggleSidebar, setOpenMobile } = useSidebar();
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    } else if (status === "authenticated" && session?.user?.role !== "admin") {
      router.push("/kitabghor/user");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0E4B4B] to-[#086666]">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#0E4B4B] to-[#5FA3A3] rounded-2xl flex items-center justify-center mb-4 shadow-xl animate-pulse">
            <div className="w-8 h-8 bg-[#F4F8F7]/20 rounded-lg animate-spin border-2 border-[#F4F8F7] border-t-transparent"></div>
          </div>
          <p className="text-[#F4F8F7] font-semibold">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#F8FFFE] to-[#F0F9F8] relative">
      {/* Mobile Sidebar Overlay */}
      {openMobile && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden transition-opacity duration-300"
          onClick={() => setOpenMobile(false)}
        />
      )}
      
      {/* Mobile Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${openMobile ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out z-30 lg:hidden`}>
        <Sidebar isMobile onClose={() => setOpenMobile(false)} />
      </div>
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block lg:w-60">
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header onMenuClick={toggleSidebar} />
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#F8FFFE] to-[#F0F9F8]">
          <div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </SidebarProvider>
  );
}