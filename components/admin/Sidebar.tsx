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
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Products", href: "/admin/products", icon: ShoppingBag },
  { name: "Orders", href: "/admin/orders", icon: FileText },
  {
    name: "Management",
    icon: ClipboardList,
    subItems: [
      { name: "Writers", href: "/admin/management/writers" },
      { name: "Categories", href: "/admin/management/categories" },
      { name: "Publishers", href: "/admin/management/publishers" },
      { name: "Brands", href: "/admin/management/brands" },
      { name: "Stock Management", href: "/admin/management/stock" },
      { name: "VAT Classes", href: "/admin/management/vatclasses" },
    ],
  },
  { name: "Blogs", href: "/admin/blogs", icon: BookOpen },
  { name: "Newsletter", href: "/admin/newsletter", icon: Mail },
  { name: "Coupons", href: "/admin/coupons", icon: Tag },
  {
    name: "Settings",
    icon: Settings,
    subItems: [
      { name: "Payment Methods", href: "/admin/settings/payment" },
      { name: "Banner Settings", href: "/admin/settings/banner" },
      { name: "Shipping Methods", href: "/admin/settings/shipping" },
      { name: "Tax Settings", href: "/admin/settings/tax" },
      { name: "General Settings", href: "/admin/settings/general" },
    ],
  },
];

interface MenuItemProps {
  item: (typeof menuItems)[0];
  pathname: string;
  onClose?: () => void;
}

const MenuItem = ({ item, pathname, onClose }: MenuItemProps) => {
  const isManagementActive = pathname.startsWith("/admin/management");
  const initialOpenState = item.name === "Management" && isManagementActive;

  const [isOpen, setIsOpen] = useState(initialOpenState);
  const hasSubItems = item.subItems && item.subItems.length > 0;

  // Determine active state for parent links
  const isActive = item.href
    ? pathname === item.href ||
      (item.href !== "/admin" && pathname.startsWith(item.href))
    : isManagementActive;

  useEffect(() => {
    if (item.name === "Management" && isManagementActive) {
      setIsOpen(true);
    }
  }, [isManagementActive, item.name]);

  // Using CSS variables from global.css
  const baseClasses =
    "flex items-center gap-3 px-4 py-3 transition-all duration-300 text-sm font-medium rounded-lg";

  // Base link colors using theme variables
  const defaultLinkClasses =
    "text-muted-foreground hover:text-foreground hover:bg-accent hover:scale-105";

  // Active link colors using theme variables
  const activeLinkClasses =
    "text-primary-foreground bg-primary font-semibold shadow-lg border border-primary/20";

  // Dropdown button colors
  const buttonActiveClasses = "text-foreground bg-accent font-semibold";
  const buttonDefaultClasses =
    "text-muted-foreground hover:text-foreground hover:bg-accent";

  return (
    <div>
      {hasSubItems ? (
        <>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "w-full justify-between",
              baseClasses,
              isOpen ? buttonActiveClasses : buttonDefaultClasses,
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                  isOpen
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-muted-foreground",
                )}
              >
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
                        ? "text-primary-foreground bg-primary font-medium shadow-md border border-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent hover:translate-x-1",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full transition-all duration-300",
                          isSubItemActive
                            ? "bg-primary-foreground"
                            : "bg-muted-foreground",
                        )}
                      />
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
            isActive ? activeLinkClasses : defaultLinkClasses,
          )}
        >
          <div className="flex items-center gap-3 flex-1">
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                isActive
                  ? "bg-primary-foreground text-primary"
                  : "bg-accent text-muted-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
            </div>
            <span>{item.name}</span>
          </div>
          {isActive && (
            <div className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse" />
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

  // Using CSS variables from global.css
  const themeBg = "bg-background";
  const themeBorder = "border-border";

  if (isMobile) {
    return (
      <div className={cn("h-full flex flex-col", themeBg)}>
        {/* Modern Header */}
        <div className="h-20 flex flex-col items-center justify-center border-b border-border px-4">
          <div className="text-center">
            <h2 className={cn("font-bold text-lg text-foreground")}>BOED</h2>
            <p className="text-xs text-muted-foreground">Admin Panel</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto" onClick={onClose}>
          <SidebarContent pathname={pathname} onClose={onClose} />
        </div>
      </div>
    );
  }

  // Desktop Sidebar
  return (
    <aside
      className={cn(
        "w-60 shadow-lg h-screen fixed left-0 top-0 border-r flex flex-col",
        themeBg,
        themeBorder,
      )}
    >
      {/* Modern Desktop Header */}
      <div className="h-20 flex flex-col items-center justify-center border-b border-border sticky top-0 z-10 bg-background flex-shrink-0">
        <h2 className={cn("font-bold text-xl text-foreground")}>Admin Panel</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarContent pathname={pathname} />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border flex-shrink-0">
        <div className="text-center text-xs text-muted-foreground">
          <p>BOED Publishing</p>
          <p className="mt-1">v1.0.0</p>
        </div>
      </div>
    </aside>
  );
}
