"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
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
  Truck,
  MessageCircle,
  BarChart3,
  Warehouse,
  Forklift,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";

type MenuItem = {
  name: string;
  href?: string;
  icon: LucideIcon;
  requiredPermissions?: string[];
  subItems?: Array<{
    name: string;
    href: string;
    requiredPermissions?: string[];
  }>;
};

const menuItems: MenuItem[] = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    requiredPermissions: ["dashboard.read", "admin.panel.access"],
  },
  {
    name: "Dashboard",
    href: "/admin/warehouse",
    icon: Warehouse,
    requiredPermissions: [
      "dashboard.read",
      "inventory.manage",
      "orders.read_all",
      "shipments.manage",
    ],
  },
  {
    name: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    requiredPermissions: ["dashboard.read", "admin.panel.access"],
  },
  {
    name: "Reports",
    href: "/admin/reports",
    icon: FileText,
    requiredPermissions: ["reports.read"],
  },
  {
    name: "Users",
    href: "/admin/users",
    icon: Users,
    requiredPermissions: ["users.read", "users.manage"],
  },
  {
    name: "Products",
    href: "/admin/products",
    icon: ShoppingBag,
    requiredPermissions: ["products.manage"],
  },
  {
    name: "Orders",
    href: "/admin/orders",
    icon: FileText,
    requiredPermissions: ["orders.read_all"],
  },

  {
    name: "Shipments",
    href: "/admin/shipments",
    icon: Truck,
    requiredPermissions: ["shipments.manage", "orders.read_all"],
  },
  {
    name: "Logistics",
    href: "/admin/logistics",
    icon: Forklift,
    requiredPermissions: ["logistics.manage"],
  },
  
  {
    name: "Management",
    icon: ClipboardList,
    requiredPermissions: ["products.manage", "inventory.manage"],
    subItems: [
      {
        name: "Categories",
        href: "/admin/management/categories",
        requiredPermissions: ["products.manage"],
      },
      {
        name: "Brands",
        href: "/admin/management/brands",
        requiredPermissions: ["products.manage"],
      },
      {
        name: "Stock Management",
        href: "/admin/management/stock",
        requiredPermissions: ["inventory.manage"],
      },
      {
        name: "Blogs",
        href: "/admin/blogs",
        requiredPermissions: ["blogs.manage"],
      },
      {
        name: "Newsletter",
        href: "/admin/newsletter",
        requiredPermissions: ["newsletter.manage"],
      },
      {
        name: "Coupons",
        href: "/admin/coupons",
        requiredPermissions: ["coupons.manage"],
      },
    ],
  },
  {
    name: "Chats",
    href: "/admin/chats",
    icon: MessageCircle,
    requiredPermissions: ["chats.manage"],
  },
  {
    name: "Settings",
    icon: Settings,
    requiredPermissions: ["settings.manage"],
    subItems: [
      {
        name: "General Settings",
        href: "/admin/settings",
        requiredPermissions: ["settings.manage"],
      },
      {
        name: "Payroll",
        href: "/admin/payroll",
        requiredPermissions: ["payroll.manage"],
      },
      {
        name: "Deliveryman",
        href: "/admin/delivery-men",
        requiredPermissions: ["delivery-men.manage", "logistics.manage"],
      },
      
      {
        name: "Warehouses",
        href: "/admin/settings/warehouses",
        requiredPermissions: ["settings.warehouse.manage", "settings.manage"],
      },
      {
        name: "VAT Settings",
        href: "/admin/settings/vatclasses",
        requiredPermissions: ["settings.vat.manage", "settings.manage"],
      },
      {
        name: "Couriers",
        href: "/admin/settings/couriers",
        requiredPermissions: ["settings.courier.manage", "settings.manage"],
      },
      {
        name: "Shipping Rates",
        href: "/admin/settings/shipping-rates",
        requiredPermissions: ["settings.shipping.manage", "settings.manage"],
      },
      {
        name: "RBAC",
        href: "/admin/settings/rbac",
        requiredPermissions: ["roles.manage"],
      },
      {
        name: "Activity Log",
        href: "/admin/settings/activitylog",
        requiredPermissions: ["admin.panel.access"],
      },
    ],
  },
];

interface MenuItemProps {
  item: MenuItem;
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
  items,
  onClose,
}: {
  pathname: string;
  items: MenuItem[];
  onClose?: () => void;
}) => (
  <nav className="mt-8 pb-8 space-y-2 px-4">
    {items.map((item) => (
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
  const { data: session } = useSession();
  const permissionKeys = Array.isArray((session?.user as any)?.permissions)
    ? ((session?.user as any).permissions as string[])
    : [];
  const warehouseIds = Array.isArray((session?.user as any)?.warehouseIds)
    ? ((session?.user as any).warehouseIds as number[])
    : [];
  const defaultAdminRoute = (session?.user as any)?.defaultAdminRoute as
    | "/admin"
    | "/admin/warehouse"
    | undefined;
  const isWarehouseScopedOnly =
    defaultAdminRoute === "/admin/warehouse" && warehouseIds.length > 0;

  const hasPermission = useCallback(
    (required?: string[]) => {
      if (!required || required.length === 0) return true;
      return required.some((permission) => permissionKeys.includes(permission));
    },
    [permissionKeys],
  );

  const visibleMenuItems = useMemo<MenuItem[]>(() => {
    return menuItems
      .map((item) => {
        if (item.subItems && item.subItems.length > 0) {
          const visibleSubItems = item.subItems.filter((subItem) =>
            hasPermission(subItem.requiredPermissions),
          );
          if (
            visibleSubItems.length === 0 &&
            !hasPermission(item.requiredPermissions)
          ) {
            return null;
          }
          return {
            ...item,
            subItems: visibleSubItems,
          };
        }

        if (item.href === "/admin" && isWarehouseScopedOnly) {
          return null;
        }

        if (item.href === "/admin/warehouse" && warehouseIds.length === 0) {
          return null;
        }

        if (!hasPermission(item.requiredPermissions)) {
          return null;
        }
        return item;
      })
      .filter((item): item is MenuItem => item !== null);
  }, [hasPermission, isWarehouseScopedOnly, warehouseIds.length]);

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
          <SidebarContent
            pathname={pathname}
            items={visibleMenuItems}
            onClose={onClose}
          />
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
        <SidebarContent pathname={pathname} items={visibleMenuItems} />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border flex-shrink-0">
        <div className="text-center text-xs text-muted-foreground">
          <p>BOED Soft.</p>
          <p className="mt-1">V1.1.0</p>
        </div>
      </div>
    </aside>
  );
}
