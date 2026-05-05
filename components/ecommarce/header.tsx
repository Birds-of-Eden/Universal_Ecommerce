// components/ecommarce/header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { isDarkLikeTheme } from "@/lib/theme";
import { useSession, signOut } from "@/lib/auth-client";
import { getDashboardRoute } from "@/lib/dashboard-route";
import { cachedFetchJson } from "@/lib/client-cache-fetch";
import { useCart } from "@/components/ecommarce/CartContext";
import { useWishlist } from "@/components/ecommarce/WishlistContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  ShoppingCart,
  Heart,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
  LogIn,
  LogOut,
  LayoutDashboard,
  Newspaper,
  Boxes,
  Sun,
  Moon,
  ChevronLeft,
  Check,
  X,
  Menu,
  MapPin,
} from "lucide-react";

const CATEGORIES_API = "/api/categories";

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "green", label: "Green" },
] as const;

interface ProductSummary {
  id: number | string;
  name: string;
  image?: string | null;
}

interface CategoryDTO {
  id: number;
  name: string;
  slug: string;
  image?: string | null;
  parentId: number | null;
}

interface CategoryNode extends CategoryDTO {
  children: CategoryNode[];
}

function normalizeCategoryList(list: CategoryDTO[]): CategoryDTO[] {
  return Array.isArray(list)
    ? list.map((c: any) => ({
        id: Number(c.id),
        name: String(c.name),
        slug: String(c.slug),
        image: c.image ?? null,
        parentId: (() => {
          const rawParentId = c.parentId ?? c.parent_id;
          const parentId =
            rawParentId === null ||
            rawParentId === undefined ||
            rawParentId === ""
              ? null
              : Number(rawParentId);
          return Number.isFinite(parentId) ? parentId : null;
        })(),
      }))
    : [];
}

type SiteSettings = {
  logo?: string | null;
  siteTitle?: string | null;
  footerDescription?: string | null;
  contactNumber?: string | null;
  contactEmail?: string | null;
  address?: string | null;
  facebookLink?: string | null;
  instagramLink?: string | null;
  twitterLink?: string | null;
  tiktokLink?: string | null;
  youtubeLink?: string | null;
};

function buildCategoryTree(list: CategoryDTO[]): CategoryNode[] {
  const map = new Map<number, CategoryNode>();
  list.forEach((c) => map.set(c.id, { ...c, children: [] }));

  const roots: CategoryNode[] = [];

  map.forEach((node) => {
    if (
      node.parentId !== null &&
      node.parentId !== undefined &&
      map.has(node.parentId)
    ) {
      map.get(node.parentId)!.children.push(node);
      return;
    }
    roots.push(node);
  });

  const sortRec = (arr: CategoryNode[]) => {
    arr.sort((a, b) => a.name.localeCompare(b.name, "bn"));
    arr.forEach((x) => sortRec(x.children));
  };

  sortRec(roots);
  return roots;
}

const ddItemBase =
  "w-full flex items-center justify-between px-4 py-2.5 text-sm transition select-none";
const ddItemInactive = "text-popover-foreground hover:bg-muted";
const ddItemActive = "bg-primary text-primary-foreground";
const ddColShell =
  "w-[250px] max-h-[420px] overflow-y-auto overflow-x-hidden bg-popover";
const ddWrapperShell =
  "bg-popover text-popover-foreground border border-border shadow-2xl rounded-xl overflow-hidden";

function DesktopCategoryDropdown({
  categories,
  loading,
  onClose,
}: {
  categories: CategoryNode[];
  loading: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [activeParentId, setActiveParentId] = useState<number | null>(null);
  const [activeSubId, setActiveSubId] = useState<number | null>(null);

  const activeParent = useMemo(
    () => categories.find((c) => c.id === activeParentId) ?? null,
    [categories, activeParentId],
  );

  const subList = activeParent?.children ?? [];

  const activeSub = useMemo(
    () => subList.find((s) => s.id === activeSubId) ?? null,
    [subList, activeSubId],
  );

  const childList = activeSub?.children ?? [];

  useEffect(() => {
    setActiveParentId(null);
    setActiveSubId(null);
  }, [categories.length]);

  const go = (slug: string) => {
    router.push(`/ecommerce/categories?slug=${encodeURIComponent(slug)}`);
    onClose();
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-popover px-5 py-4 text-sm shadow-2xl">
        Loading...
      </div>
    );
  }

  if (!categories.length) {
    return (
      <div className="rounded-xl border border-border bg-popover px-5 py-4 text-sm shadow-2xl">
        No categories found.
      </div>
    );
  }

  return (
    <div className={ddWrapperShell}>
      <div className="flex">
        <div className={`${ddColShell} border-r border-border`}>
          {categories.map((p) => {
            const isActive = p.id === activeParentId;
            const hasSub = p.children.length > 0;

            return (
              <button
                key={p.id}
                type="button"
                onMouseEnter={() => {
                  setActiveParentId(p.id);
                  setActiveSubId(null);
                }}
                onClick={() => go(p.slug)}
                className={`${ddItemBase} ${
                  isActive ? ddItemActive : ddItemInactive
                }`}
                title={p.name}
              >
                <span className="truncate font-medium">{p.name}</span>
                {hasSub ? <ChevronRight className="h-4 w-4" /> : <span />}
              </button>
            );
          })}
        </div>

        <div
          className={`${ddColShell} border-r border-border ${activeParentId ? "block" : "hidden"}`}
        >
          {subList.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No subcategories.
            </div>
          ) : (
            subList.map((s) => {
              const isActive = s.id === activeSubId;
              const hasChild = s.children.length > 0;

              return (
                <button
                  key={s.id}
                  type="button"
                  onMouseEnter={() => setActiveSubId(s.id)}
                  onClick={() => go(s.slug)}
                  className={`${ddItemBase} ${
                    isActive ? ddItemActive : ddItemInactive
                  }`}
                  title={s.name}
                >
                  <span className="truncate">{s.name}</span>
                  {hasChild ? <ChevronRight className="h-4 w-4" /> : <span />}
                </button>
              );
            })
          )}
        </div>

        <div className={`${ddColShell} ${activeSubId ? "block" : "hidden"}`}>
          {childList.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No child categories.
            </div>
          ) : (
            childList.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => go(c.slug)}
                className={`${ddItemBase} ${ddItemInactive}`}
                title={c.name}
              >
                <span className="truncate">{c.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function MobileCategoryTree({
  categories,
  loading,
  onGo,
}: {
  categories: CategoryNode[];
  loading: boolean;
  onGo: (slug: string) => void;
}) {
  const [openIds, setOpenIds] = useState<Set<number>>(() => new Set());

  const toggle = (id: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!categories.length) {
    return (
      <div className="text-sm text-muted-foreground">No categories found.</div>
    );
  }

  const Row = ({ node, level }: { node: CategoryNode; level: number }) => {
    const hasChildren = node.children.length > 0;
    const isOpen = openIds.has(node.id);
    const padLeft = 14 + level * 14;

    return (
      <div>
        <div
          className="flex items-center justify-between gap-3 py-3 hover:bg-muted"
          style={{ paddingLeft: padLeft, paddingRight: 12 }}
        >
          <button
            type="button"
            onClick={() => onGo(node.slug)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
              <Image
                src={node.image || "/placeholder.svg"}
                alt={node.name}
                fill
                className="object-cover"
                sizes="36px"
              />
            </span>
            <span className="truncate text-sm font-semibold">{node.name}</span>
          </button>

          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggle(node.id)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background"
            >
              <ChevronRight
                className={`h-5 w-5 transition-transform ${
                  isOpen ? "rotate-90" : ""
                }`}
              />
            </button>
          ) : (
            <span className="h-9 w-9" />
          )}
        </div>

        {hasChildren && isOpen && (
          <div
            className="border-l border-border"
            style={{ marginLeft: padLeft + 18 }}
          >
            {node.children.map((child) => (
              <Row key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      {categories.map((c) => (
        <Row key={c.id} node={c} level={0} />
      ))}
    </div>
  );
}

export default function Header({
  siteSettingsData,
  productsData,
  categoriesData,
}: {
  siteSettingsData?: SiteSettings;
  productsData?: ProductSummary[];
  categoriesData?: CategoryDTO[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const { cartItems } = useCart();
  const { wishlistCount } = useWishlist();

  const [hasMounted, setHasMounted] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const [siteSettings, setSiteSettings] = useState<SiteSettings>(
    siteSettingsData ?? {},
  );

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [allProducts, setAllProducts] = useState<ProductSummary[]>([]);
  const [searchResults, setSearchResults] = useState<ProductSummary[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [hasLoadedProducts, setHasLoadedProducts] = useState(false);

  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);

  const [catOpen, setCatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const [navHoverCatId, setNavHoverCatId] = useState<number | null>(null);
  const [navHoverSubId, setNavHoverSubId] = useState<number | null>(null);
  const [navMenuPos, setNavMenuPos] = useState<{ left: number; top: number }>({
    left: 0,
    top: 0,
  });

  const catWrapRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const navCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navScrollRef = useRef<HTMLDivElement | null>(null);

  const scrollDesktopNav = (direction: "left" | "right") => {
    const el = navScrollRef.current;
    if (!el) return;

    el.scrollBy({
      left: direction === "left" ? -260 : 260,
      behavior: "smooth",
    });
  };

  useEffect(() => setHasMounted(true), []);

  useEffect(() => {
    const loadSiteSettings = async () => {
      try {
        if (siteSettingsData) {
          setSiteSettings(siteSettingsData);
          return;
        }

        const data = await cachedFetchJson<any>("/api/site", {
          ttlMs: 5 * 60 * 1000,
        });
        setSiteSettings(data);
      } catch (error) {
        console.error("Failed to load site settings:", error);
      }
    };

    loadSiteSettings();
  }, [siteSettingsData]);

  const activeTheme = (theme === "system" ? resolvedTheme : theme) ?? "light";
  const darkLikeActiveTheme = isDarkLikeTheme(activeTheme);

  useEffect(() => {
    const total =
      cartItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    setCartCount(total);
  }, [cartItems]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        if (productsData) {
          setAllProducts(productsData);
          setHasLoadedProducts(true);
          return;
        }

        setSearchLoading(true);

        const data = await cachedFetchJson<any[]>("/api/products", {
          ttlMs: 2 * 60 * 1000,
        });

        const mapped: ProductSummary[] = Array.isArray(data)
          ? data.map((p: any) => ({
              id: p.id,
              name: p.name,
              image: p.image ?? null,
            }))
          : [];

        setAllProducts(mapped);
        setHasLoadedProducts(true);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    };

    loadProducts();
  }, [productsData]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        if (categoriesData) {
          setCategoryTree(
            buildCategoryTree(normalizeCategoryList(categoriesData)),
          );
          setCategoryLoading(false);
          return;
        }

        setCategoryLoading(true);

        const data = await cachedFetchJson<any[]>(CATEGORIES_API, {
          ttlMs: 5 * 60 * 1000,
        });

        const mapped: CategoryDTO[] = Array.isArray(data)
          ? data.map((c) => ({
              id: Number(c.id),
              name: String(c.name),
              slug: String(c.slug),
              image: c.image ?? null,
              parentId:
                c.parentId === null ||
                c.parentId === undefined ||
                c.parentId === ""
                  ? null
                  : Number(c.parentId),
            }))
          : [];

        setCategoryTree(buildCategoryTree(mapped));
      } catch (err) {
        console.error(err);
      } finally {
        setCategoryLoading(false);
      }
    };

    loadCategories();
  }, [categoriesData]);

  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2 || !hasLoadedProducts) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const term = searchTerm.toLowerCase();

    const filtered = allProducts
      .filter((p) => p.name.toLowerCase().includes(term))
      .slice(0, 8);

    setSearchResults(filtered);
    setShowSearchDropdown(filtered.length > 0);
  }, [searchTerm, allProducts, hasLoadedProducts]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;

      if (catWrapRef.current && !catWrapRef.current.contains(target)) {
        setCatOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }

      const el = e.target as HTMLElement;
      if (!el.closest?.(".header-search-wrapper")) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  const handleSelectProduct = (p: ProductSummary) => {
    setSearchTerm("");
    setShowSearchDropdown(false);
    router.push(`/ecommerce/products/${p.id}`);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchResults.length > 0) {
      handleSelectProduct(searchResults[0]);
    }
  };

  const handleSignOut = async () => {
    setIsPending(true);

    try {
      await signOut();
      router.push("/");
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsPending(false);
    }
  };

  const sessionUser = (session?.user ?? null) as {
    name?: string | null;
    role?: string;
    roleNames?: string[];
    permissions?: string[];
    defaultAdminRoute?: "/admin" | "/admin/warehouse";
  } | null;

  const userName = sessionUser?.name || "User";
  const userRole = sessionUser?.role || "user";
  const displayRole =
    Array.isArray(sessionUser?.roleNames) && sessionUser.roleNames.length > 0
      ? sessionUser.roleNames.join(", ")
      : userRole;

  const dashboardHref = getDashboardRoute(sessionUser);

  const goCategoryFromMobile = (slug: string) => {
    setMobileMenuOpen(false);
    router.push(`/ecommerce/categories?slug=${encodeURIComponent(slug)}`);
  };

  const goCategoryFromDesktop = (slug: string) => {
    router.push(`/ecommerce/categories?slug=${encodeURIComponent(slug)}`);
  };

  const headerIconClass =
    "relative flex flex-col items-center justify-center gap-1 text-xs font-medium text-foreground transition hover:text-primary";

  const hoveredNavCat = useMemo(() => {
    if (navHoverCatId === null) return null;
    return categoryTree.find((c) => c.id === navHoverCatId) ?? null;
  }, [categoryTree, navHoverCatId]);

  const hoveredNavSub = useMemo(() => {
    if (!hoveredNavCat || navHoverSubId === null) return null;
    return hoveredNavCat.children.find((c) => c.id === navHoverSubId) ?? null;
  }, [hoveredNavCat, navHoverSubId]);

  const clearNavCloseTimer = useCallback(() => {
    if (navCloseTimerRef.current) {
      clearTimeout(navCloseTimerRef.current);
      navCloseTimerRef.current = null;
    }
  }, []);

  const scheduleNavClose = useCallback(() => {
    clearNavCloseTimer();
    navCloseTimerRef.current = setTimeout(() => {
      setNavHoverCatId(null);
      setNavHoverSubId(null);
    }, 120);
  }, [clearNavCloseTimer]);

  return (
    <header className="sticky top-0 z-50 bg-background text-foreground">
      <div className="border-b border-border bg-background">
        <div className="container mx-auto flex h-[86px] items-center justify-between gap-4 px-4">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border bg-card">
              <Image
                src={siteSettings.logo || "/assets/examplelogo.jpg"}
                alt="Logo"
                fill
                className="object-contain"
                sizes="48px"
              />
            </div>

            <div className="hidden leading-none sm:block">
              <div className="max-w-[190px] truncate text-xl font-extrabold uppercase tracking-tight text-primary">
                {siteSettings.siteTitle || "Ecommerce"}
              </div>
              {/* <div className="text-xl font-extrabold uppercase tracking-tight text-primary">
                BAZAR
              </div> */}
            </div>
          </Link>

          <div className="header-search-wrapper relative hidden w-full max-w-[620px] md:block">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() =>
                searchResults.length > 0 && setShowSearchDropdown(true)
              }
              placeholder="Search in..."
              className="h-12 w-full rounded-lg border border-border bg-muted px-5 pr-12 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />

            <button
              type="button"
              onClick={() => {
                if (searchResults.length > 0)
                  handleSelectProduct(searchResults[0]);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground"
              aria-label="Search"
            >
              <Search className="h-6 w-6" />
            </button>

            {showSearchDropdown && (
              <div className="absolute top-full z-[9999] mt-2 max-h-80 w-full overflow-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl">
                {searchLoading && !hasLoadedProducts ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    Loading...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground">
                    No results found.
                  </div>
                ) : (
                  searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectProduct(p)}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-muted"
                    >
                      {p.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            {/* <Link href="/ecommerce/track-order" className={`${headerIconClass} hidden lg:flex`}>
              <MapPin className="h-6 w-6" />
              <span>Track Order</span>
            </Link> */}

            <div ref={profileRef} className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setProfileOpen((p) => !p)}
                className={headerIconClass}
                aria-label="Profile"
              >
                <UserIcon className="h-6 w-6" />
                <span>{hasMounted && session ? "Sign Out" : "Sign In"}</span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-3 w-56 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl">
                  {hasMounted && session ? (
                    <>
                      <div className="border-b border-border px-4 py-3">
                        <div className="text-sm font-semibold">{userName}</div>
                        <div className="text-xs text-muted-foreground">
                          {displayRole}
                        </div>
                      </div>

                      <Link
                        href={dashboardHref}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted"
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Link>

                      <button
                        type="button"
                        disabled={isPending}
                        onClick={async () => {
                          setProfileOpen(false);
                          await handleSignOut();
                        }}
                        className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-muted disabled:opacity-60"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push("/signin")}
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-muted"
                    >
                      <LogIn className="h-4 w-4" />
                      Login
                    </button>
                  )}
                </div>
              )}
            </div>

            <Link
              href="/ecommerce/wishlist"
              className={`${headerIconClass} hidden sm:flex`}
            >
              <Heart className="h-6 w-6" />
              {hasMounted && wishlistCount > 0 && (
                <span className="absolute -right-2 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                  {wishlistCount}
                </span>
              )}
              <span>Wishlist</span>
            </Link>

            <Link href="/ecommerce/cart" className={headerIconClass}>
              <ShoppingCart className="h-7 w-7" />
              {hasMounted && cartCount > 0 && (
                <span className="absolute -right-2 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">
                  {cartCount}
                </span>
              )}
              <span className="hidden sm:inline">Cart</span>
            </Link>

            {hasMounted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`${headerIconClass} hidden xl:flex`}
                    title="Select theme"
                  >
                    {darkLikeActiveTheme ? (
                      <Sun className="h-6 w-6" />
                    ) : (
                      <Moon className="h-6 w-6" />
                    )}
                    <span>Theme</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {THEME_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setTheme(option.value)}
                      className="flex items-center justify-between"
                    >
                      <span>{option.label}</span>
                      {activeTheme === option.value ? (
                        <Check className="h-4 w-4" />
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className={`${headerIconClass} md:hidden`}
              aria-label="Open menu"
            >
              <Menu className="h-7 w-7" />
              <span className="hidden">More</span>
            </button>
          </div>
        </div>

        <div className="container mx-auto px-4 pb-4 md:hidden">
          <div className="header-search-wrapper relative">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              onFocus={() =>
                searchResults.length > 0 && setShowSearchDropdown(true)
              }
              placeholder="Search in..."
              className="h-11 w-full rounded-lg border border-border bg-muted px-4 pr-11 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Search className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2" />

            {showSearchDropdown && (
              <div className="absolute top-full z-[9999] mt-2 max-h-72 w-full overflow-auto rounded-xl border border-border bg-popover shadow-2xl">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectProduct(p)}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-muted"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <nav className="relative z-[60] hidden bg-secondary text-secondary-foreground md:block">
        <div className="container relative mx-auto px-4 overflow-visible group">
          {/* Left Arrow - Primary Color */}
          <button
            type="button"
            onClick={() => scrollDesktopNav("left")}
            className="absolute left-1 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg backdrop-blur transition-all duration-300 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto hover:bg-primary/80 hover:scale-110 active:scale-95"
            aria-label="Scroll categories left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Right Arrow - Primary Color */}
          <button
            type="button"
            onClick={() => scrollDesktopNav("right")}
            className="absolute right-1 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg backdrop-blur transition-all duration-300 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto hover:bg-primary/80 hover:scale-110 active:scale-95"
            aria-label="Scroll categories right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div
            ref={navScrollRef}
            className="mx-10 flex h-14 items-center gap-8 overflow-hidden"
            onMouseLeave={scheduleNavClose}
            onMouseEnter={clearNavCloseTimer}
          >
            {categoryTree.slice(0, 12).map((cat) => (
              <div
                key={cat.id}
                className="relative shrink-0 group"
                onMouseEnter={(e) => {
                  clearNavCloseTimer();
                  setNavHoverCatId(cat.children.length > 0 ? cat.id : null);
                  setNavHoverSubId(null);

                  const rect = (
                    e.currentTarget as HTMLDivElement
                  ).getBoundingClientRect();

                  setNavMenuPos({ left: rect.left, top: rect.bottom });
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (cat.children.length === 0) {
                      goCategoryFromDesktop(cat.slug);
                    }
                  }}
                  className="flex h-14 items-center gap-1 whitespace-nowrap text-sm font-semibold transition-all duration-300 text-secondary-foreground hover:text-primary group-hover:text-primary"
                >
                  {cat.name}
                  {cat.children.length > 0 && (
                    <ChevronDown className="h-4 w-4 transition-transform duration-300 group-hover:rotate-180" />
                  )}
                </button>

                {/* Hover underline effect */}
                <div className="absolute -bottom-[2px] left-0 h-[2px] w-0 bg-primary transition-all duration-300 group-hover:w-full" />
              </div>
            ))}

            <Link
              href="/ecommerce/blogs"
              className="relative shrink-0 whitespace-nowrap text-sm font-semibold transition-all duration-300 text-secondary-foreground hover:text-primary group"
            >
              Blog
              <div className="absolute -bottom-[2px] left-0 h-[2px] w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>

            <Link
              href="/ecommerce/products"
              className="relative shrink-0 whitespace-nowrap text-sm font-semibold transition-all duration-300 text-secondary-foreground hover:text-primary group"
            >
              All Products
              <div className="absolute -bottom-[2px] left-0 h-[2px] w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
          </div>
        </div>

        {hoveredNavCat && hoveredNavCat.children.length > 0 && (
          <div
            className="fixed z-[10000]"
            style={{ left: navMenuPos.left, top: navMenuPos.top }}
            onMouseEnter={clearNavCloseTimer}
            onMouseLeave={scheduleNavClose}
          >
            <div className="min-w-60 rounded-b-xl border border-border bg-popover py-2 text-popover-foreground shadow-2xl animate-in slide-in-from-top-2 duration-200">
              {hoveredNavCat.children.map((sub) => (
                <div
                  key={sub.id}
                  className="relative"
                  onMouseEnter={() => setNavHoverSubId(sub.id)}
                >
                  <button
                    type="button"
                    onClick={() => goCategoryFromDesktop(sub.slug)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-all duration-200 hover:bg-primary hover:text-primary-foreground"
                  >
                    <span className="truncate">{sub.name}</span>
                    {sub.children.length > 0 ? (
                      <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                    ) : (
                      <span className="h-4 w-4" />
                    )}
                  </button>

                  {sub.children.length > 0 && hoveredNavSub?.id === sub.id && (
                    <div className="absolute left-full top-0 z-[10001] ml-0 min-w-60 rounded-xl border border-border bg-popover py-2 text-popover-foreground shadow-2xl animate-in slide-in-from-left-2 duration-200">
                      {sub.children.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => goCategoryFromDesktop(child.slug)}
                          className="block w-full px-4 py-2.5 text-left text-sm transition-all duration-200 hover:bg-primary hover:text-primary-foreground"
                        >
                          <span className="truncate">{child.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </nav>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[9999]">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu overlay"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="absolute right-0 top-0 h-full w-[78%] max-w-[340px] overflow-y-auto border-l border-border bg-background text-foreground shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-w-0 items-center gap-3"
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                  <Image
                    src={siteSettings.logo || "/assets/examplelogo.jpg"}
                    alt="Logo"
                    fill
                    className="object-contain"
                    sizes="44px"
                  />
                </div>

                <div className="min-w-0">
                  <div className="truncate text-base font-bold">
                    {siteSettings.siteTitle || "BOED"}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {siteSettings.footerDescription || "E-Commerce"}
                  </div>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-4">
              {/* User Profile Card - simplified */}
              {hasMounted && session && (
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                  <div className="border-b border-border bg-primary/10 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {userName?.charAt(0)?.toUpperCase() || "U"}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold">
                          {userName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {displayRole}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dashboard */}
              {hasMounted && session && (
                <Link
                  href={dashboardHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold"
                >
                  <LayoutDashboard className="h-5 w-5" />
                  Dashboard
                </Link>
              )}

              {/* Login (only when not logged in) */}
              {!session && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push("/signin");
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
                >
                  <LogIn className="h-5 w-5" />
                  Login
                </button>
              )}

              {/* Logout (only when logged in) */}
              {hasMounted && session && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={async () => {
                    setMobileMenuOpen(false);
                    await handleSignOut();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold text-destructive hover:bg-muted disabled:opacity-60"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              )}

              {/* Navigation Items */}
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/ecommerce/products"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold"
                >
                  <Boxes className="mb-2 h-5 w-5" />
                  All Products
                </Link>

                <Link
                  href="/ecommerce/blogs"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold"
                >
                  <Newspaper className="mb-2 h-5 w-5" />
                  Blog
                </Link>

                <Link
                  href="/ecommerce/wishlist"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold"
                >
                  <Heart className="mb-2 h-5 w-5" />
                  Wishlist
                </Link>

                <Link
                  href="/ecommerce/cart"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold"
                >
                  <ShoppingCart className="mb-2 h-5 w-5" />
                  Cart
                </Link>
              </div>

              {/* Theme Switcher */}
              {hasMounted && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="mb-3 text-sm font-bold">Theme</div>
                  <div className="grid grid-cols-3 gap-2">
                    {THEME_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setTheme(option.value)}
                        className={`rounded-lg border px-3 py-2 text-sm ${
                          activeTheme === option.value
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="mb-3">
                  <div className="text-sm font-bold">All Categories</div>
                  <div className="text-xs text-muted-foreground">
                    Browse products by category
                  </div>
                </div>

                <MobileCategoryTree
                  categories={categoryTree}
                  loading={categoryLoading}
                  onGo={goCategoryFromMobile}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
