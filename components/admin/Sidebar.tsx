"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  FileText,
  Settings,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Mail,
  Tag,
} from "lucide-react";
import { useState, useEffect } from "react";

// Updated menuItems with enhanced structure
const menuItems = [
  { name: "ড্যাশবোর্ড", href: "/admin", icon: LayoutDashboard },
  { name: "ব্যবহারকারী", href: "/admin/users", icon: Users },
  { name: "পণ্য", href: "/admin/products", icon: ShoppingBag },
  { name: "অর্ডার", href: "/admin/orders", icon: FileText },
  {
    name: "ব্যবস্থাপনা",
    icon: ClipboardList,
    subItems: [
      { name: "লেখক", href: "/admin/management/writers" },
      { name: "ক্যাটেগরি", href: "/admin/management/categories" },
      { name: "প্রকাশক", href: "/admin/management/publishers" },
    ],
  },
  { name: "ব্লগ", href: "/admin/blogs", icon: BookOpen },
  { name: "নিউজলেটার", href: "/admin/newsletter", icon: Mail },
  { name: "কুপন", href: "/admin/coupons", icon: Tag },
  { name: "সেটিংস", href: "/admin/settings", icon: Settings },
];

interface MenuItemProps {
  item: (typeof menuItems)[0];
  pathname: string;
  onClose?: () => void;
}

const MenuItem = ({ item, pathname, onClose }: MenuItemProps) => {
  const isManagementActive = pathname.startsWith("/admin/management");
  const initialOpenState = item.name === "ব্যবস্থাপনা" && isManagementActive;

  const [isOpen, setIsOpen] = useState(initialOpenState);
  const hasSubItems = item.subItems && item.subItems.length > 0;

  // Determine active state for parent links
  const isActive = item.href
    ? pathname === item.href ||
      (item.href !== "/admin" && pathname.startsWith(item.href))
    : isManagementActive;

  useEffect(() => {
    if (item.name === "ব্যবস্থাপনা" && isManagementActive) {
      setIsOpen(true);
    }
  }, [isManagementActive, item.name]);

  // Modern Theme Classes matching e-commerce header
  const baseClasses =
    "flex items-center gap-3 px-4 py-3 transition-all duration-300 text-sm font-medium rounded-lg";

  // Base link colors - matching header design
  const defaultLinkClasses =
    "text-[#F4F8F7]/80 hover:text-[#F4F8F7] hover:bg-[#F4F8F7]/10 hover:scale-105";

  // Active link colors - matching header accent
  const activeLinkClasses =
    "text-[#F4F8F7] bg-[#C0704D] font-semibold shadow-lg border border-[#C0704D]/20";

  // Dropdown button colors
  const buttonActiveClasses = "text-[#F4F8F7] bg-[#F4F8F7]/15 font-semibold";
  const buttonDefaultClasses =
    "text-[#F4F8F7]/80 hover:text-[#F4F8F7] hover:bg-[#F4F8F7]/10";

  return (
    <div>
      {hasSubItems ? (
        <>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "w-full justify-between",
              baseClasses,
              isOpen ? buttonActiveClasses : buttonDefaultClasses
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                isOpen ? "bg-[#C0704D] text-[#F4F8F7]" : "bg-[#F4F8F7]/10 text-[#5FA3A3]"
              )}>
                <item.icon className="h-4 w-4" />
              </div>
              <span>{item.name}</span>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 transition-transform duration-300" />
            ) : (
              <ChevronRight className="h-4 w-4 transition-transform duration-300" />
            )}
          </button>
          {isOpen && (
            <div className="ml-4 my-2 space-y-1">
              {item.subItems?.map((subItem) => {
                const isSubItemActive = pathname === subItem.href;
                return (
                  <Link
                    key={subItem.name}
                    href={subItem.href}
                    onClick={
                      hasSubItems ? () => onClose && onClose() : undefined
                    }
                    className={cn(
                      "block px-4 py-2 text-xs transition-all duration-300 rounded-lg",
                      isSubItemActive
                        ? "text-[#F4F8F7] bg-[#C0704D] font-medium shadow-md border border-[#C0704D]/20"
                        : "text-[#F4F8F7]/70 hover:text-[#F4F8F7] hover:bg-[#F4F8F7]/10 hover:translate-x-1"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all duration-300",
                        isSubItemActive ? "bg-[#F4F8F7]" : "bg-[#5FA3A3]"
                      )} />
                      {subItem.name}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <Link
          href={item.href || "#"}
          onClick={onClose ? () => onClose() : undefined}
          className={cn(
            baseClasses,
            "w-full",
            isActive ? activeLinkClasses : defaultLinkClasses
          )}
        >
          <div className="flex items-center gap-3 flex-1">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
              isActive ? "bg-[#F4F8F7] text-[#0E4B4B]" : "bg-[#F4F8F7]/10 text-[#5FA3A3]"
            )}>
              <item.icon className="h-4 w-4" />
            </div>
            <span>{item.name}</span>
          </div>
          {isActive && (
            <div className="w-2 h-2 bg-[#F4F8F7] rounded-full animate-pulse" />
          )}
        </Link>
      )}
    </div>
  );
};

// Sidebar Content wrapper
const SidebarContent = ({
  pathname,
  onClose,
}: {
  pathname: string;
  onClose?: () => void;
}) => (
  <nav className="mt-8 pb-8 space-y-2 px-4">
    {menuItems.map((item) => (
      <MenuItem
        key={item.name}
        item={item}
        pathname={pathname}
        onClose={onClose}
      />
    ))}
  </nav>
);

export default function Sidebar({
  isMobile = false,
  onClose,
}: {
  isMobile?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  // Modern theme matching e-commerce header
  const themeBg = "bg-gradient-to-b from-[#0E4B4B] to-[#086666]"; // Deep emerald gradient
  const themeAccent = "text-[#F4F8F7]";

  if (isMobile) {
    return (
      <div className={cn("h-full flex flex-col", themeBg)}>
        {/* Modern Header */}
        <div className="h-20 flex flex-col items-center justify-center border-b border-[#F4F8F7]/10 px-4">
          <div className="text-center">
            <h2 className={cn("font-bold text-lg", themeAccent)}>হিলফুল-ফুযুল</h2>
            <p className="text-xs text-[#F4F8F7]/70">অ্যাডমিন প্যানেল</p>
          </div>
        </div>
        <div className="flex-1  overflow-y-auto" onClick={onClose}>
          <SidebarContent pathname={pathname} onClose={onClose} />
        </div>
      </div>
    );
  }

  // Desktop Sidebar
  return (
    <aside
      className={cn(
        "w-60 shadow-2xl h-screen fixed left-0 top-0 border-r border-[#F4F8F7]/10 flex flex-col",
        themeBg
      )}
    >
      {/* Modern Desktop Header */}
      <div className="h-20 flex flex-col items-center justify-center border-b border-[#F4F8F7]/10 sticky top-0 z-10 backdrop-blur-sm bg-gradient-to-b from-[#0E4B4B] to-[#0E4B4B]/90 flex-shrink-0">
          <h2 className={cn("font-bold text-xl", themeAccent)}>অ্যাডমিন প্যানেল</h2>
      </div>
      <div className="flex-1 ">
        <SidebarContent pathname={pathname} />
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-[#F4F8F7]/10 flex-shrink-0">
        <div className="text-center text-xs text-[#F4F8F7]/50">
          <p>হিলফুল-ফুযুল প্রকাশনী</p>
          <p className="mt-1">v1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
