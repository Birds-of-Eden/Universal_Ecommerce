//components/ecommarce/header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { isDarkLikeTheme } from "@/lib/theme";
import { useSession, signOut } from "@/lib/auth-client";
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
  Check,
  X,
} from "lucide-react";

const CATEGORIES_API = "/api/categories";
const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "navy", label: "Navy" },
  { value: "plum", label: "Plum" },
  { value: "olive", label: "Olive" },
  { value: "rose", label: "Rose" },
] as const;

/* =========================
   Types
========================= */
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

/* =========================
   Helpers
========================= */
function buildCategoryTree(list: CategoryDTO[]): CategoryNode[] {
  const map = new Map<number, CategoryNode>();
  list.forEach((c) => map.set(c.id, { ...c, children: [] }));

  const roots: CategoryNode[] = [];
  map.forEach((node) => {
    if (node.parentId) {
      const parent = map.get(node.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    } else roots.push(node);
  });

  const sortRec = (arr: CategoryNode[]) => {
    arr.sort((a, b) => a.name.localeCompare(b.name, "bn"));
    arr.forEach((x) => sortRec(x.children));
  };
  sortRec(roots);

  return roots;
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

/* =========================
   Dropdown shared styles
========================= */
const ddItemBase =
  "w-full flex items-center justify-between px-4 py-2.5 text-sm transition select-none";
const ddItemInactive = "text-foreground hover:bg-accent";
const ddItemActive = "bg-primary text-primary-foreground";

const ddColShell =
  "w-[260px] max-h-[420px] overflow-y-auto overflow-x-hidden bg-popover";

const ddWrapperShell =
  "bg-popover text-foreground border border-border shadow-2xl rounded-md overflow-hidden";

/* =========================
   Row-2 All Category Dropdown (Desktop)
========================= */
function TechlandCategoryDropdown({
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

  const activeParent = useMemo(() => {
    if (!activeParentId) return null;
    return categories.find((c) => c.id === activeParentId) ?? null;
  }, [categories, activeParentId]);

  const subList = activeParent?.children ?? [];

  const activeSub = useMemo(() => {
    if (!activeSubId) return null;
    return subList.find((s) => s.id === activeSubId) ?? null;
  }, [subList, activeSubId]);

  const childList = activeSub?.children ?? [];

  useEffect(() => {
    setActiveParentId(null);
    setActiveSubId(null);
  }, [categories.length]);

  const go = (slug: string) => {
    router.push(`/ecommerce/categories/${slug}`);
    onClose();
  };

  if (loading) {
    return (
      <div className="bg-popover text-foreground border border-border shadow-2xl rounded-md px-5 py-4 text-sm">
        Loading...
      </div>
    );
  }

  if (!categories.length) {
    return (
      <div className="bg-popover text-foreground border border-border shadow-2xl rounded-md px-5 py-4 text-sm">
        No categories found.
      </div>
    );
  }

  return (
    <div className={ddWrapperShell}>
      <div className="flex">
        {/* Parent */}
        <div className={`${ddColShell} border-r border-border`}>
          {categories.map((p) => {
            const isActive = p.id === activeParentId;
            const hasSub = (p.children?.length ?? 0) > 0;

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
                {hasSub ? (
                  <ChevronRight className="h-4 w-4 opacity-80" />
                ) : (
                  <span className="w-4" />
                )}
              </button>
            );
          })}
        </div>

        {/* Sub */}
        <div
          className={`${ddColShell} border-r border-border ${
            activeParentId ? "block" : "hidden"
          }`}
        >
          {subList.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No subcategories.
            </div>
          ) : (
            subList.map((s) => {
              const isActive = s.id === activeSubId;
              const hasChild = (s.children?.length ?? 0) > 0;

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
                  {hasChild ? (
                    <ChevronRight className="h-4 w-4 opacity-80" />
                  ) : (
                    <span className="w-4" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Child */}
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
                <span className="w-4" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================
   ✅ Mobile Categories Drawer List
========================= */
function MobileCategoryTree({
  categories,
  loading,
  onGo,
}: {
  categories: CategoryNode[];
  loading: boolean;
  onGo: (slug: string) => void;
}) {
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

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
          <div key={i} className="h-10 w-full rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!categories.length) {
    return (
      <div className="text-sm text-muted-foreground">No categories found.</div>
    );
  }

  const Node = ({ node, level }: { node: CategoryNode; level: number }) => {
    const hasChildren = (node.children?.length ?? 0) > 0;
    const isOpen = openIds.has(node.id);

    return (
      <div>
        <div
          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2"
          style={{ marginLeft: level * 10 }}
        >
          <button
            type="button"
            onClick={() => onGo(node.slug)}
            className="flex-1 text-left text-sm font-medium text-foreground truncate"
            title={node.name}
          >
            {node.name}
          </button>

          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggle(node.id)}
              className="h-8 w-8 rounded-md border border-border bg-muted hover:bg-accent flex items-center justify-center"
              aria-label="Toggle subcategories"
              title="Toggle"
            >
              <ChevronRight
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "rotate-90" : "rotate-0"
                }`}
              />
            </button>
          ) : (
            <span className="w-8" />
          )}
        </div>

        {hasChildren && isOpen && (
          <div className="mt-2 space-y-2">
            {node.children.map((ch) => (
              <Node key={ch.id} node={ch} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {categories.map((c) => (
        <Node key={c.id} node={c} level={0} />
      ))}
    </div>
  );
}

/* =========================
   Header
========================= */
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

  // Site settings
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(
    siteSettingsData ?? {}
  );

  // Mobile drawer
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // cart count
  const [cartCount, setCartCount] = useState(0);

  // search
  const [searchTerm, setSearchTerm] = useState("");
  const [allProducts, setAllProducts] = useState<ProductSummary[]>([]);
  const [searchResults, setSearchResults] = useState<ProductSummary[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [hasLoadedProducts, setHasLoadedProducts] = useState(false);

  // categories
  const [categoryTree, setCategoryTree] = useState<CategoryNode[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);

  // dropdowns
  const [catOpen, setCatOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const catWrapRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setHasMounted(true), []);

  // Load site settings
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

  // load products for search
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

  // load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        if (categoriesData) {
          setCategoryTree(buildCategoryTree(categoriesData));
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
              parentId: c.parentId ? Number(c.parentId) : null,
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

  // search filtering
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

  // outside click close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;

      if (catWrapRef.current && !catWrapRef.current.contains(target))
        setCatOpen(false);
      if (profileRef.current && !profileRef.current.contains(target))
        setProfileOpen(false);

      const el = e.target as HTMLElement;
      if (!el.closest?.(".header-search-wrapper")) setShowSearchDropdown(false);
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // body scroll lock when drawer open
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

  const sessionUser = (session?.user ?? null) as
    | {
        name?: string | null;
        role?: string;
        roleNames?: string[];
        permissions?: string[];
      }
    | null;
  const userName = sessionUser?.name || "User";
  const userRole = sessionUser?.role || "user";
  const displayRole =
    Array.isArray(sessionUser?.roleNames) && sessionUser.roleNames.length > 0
      ? sessionUser.roleNames.join(", ")
      : userRole;
  const permissionKeys = Array.isArray(sessionUser?.permissions)
    ? sessionUser.permissions
    : [];
  const canAccessAdminPanel =
    permissionKeys.includes("admin.panel.access") ||
    userRole.toLowerCase() === "admin";

  const topBtnClass =
    "h-10 px-5 rounded-lg bg-muted text-foreground border border-border flex items-center gap-2 text-sm font-semibold transition-colors hover:bg-accent";

  const goCategoryFromMobile = (slug: string) => {
    setMobileMenuOpen(false);
    router.push(`/ecommerce/categories/${slug}`);
  };

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-background text-foreground border-b border-border">
        <div className="container mx-auto px-4 py-4">
          {/* ✅ Desktop: single line header */}
          <div className="hidden md:flex items-center gap-4">
            {/* Left */}
            <Link href="/" className="flex items-center gap-3 min-w-0 shrink-0">
              <div className="relative h-12 w-12 rounded-2xl overflow-hidden border border-border bg-background/10 shrink-0">
                <Image
                  src={siteSettings.logo || "/assets/examplelogo.jpg"}
                  alt="Logo"
                  fill
                  className="object-contain 2xl"
                />
              </div>
              <div className="text-lg sm:text-2xl tracking-wider truncate max-w-[260px]">
                {siteSettings.siteTitle}
              </div>
            </Link>

            {/* Middle */}
            <div className="flex-1 flex items-center min-w-0">
              {/* All Category */}
              <div ref={catWrapRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setCatOpen((p) => !p)}
                  className="
                    h-11 w-[190px]
                    rounded-l-md rounded-r-none
                    bg-background text-foreground
                    border border-border
                    flex items-center justify-between
                    px-4 transition focus:outline-none focus:ring-2 focus:ring-primary/40
                  "
                >
                  <span className="text-sm font-semibold">All Category</span>
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </button>

                {catOpen && (
                  <div className="absolute left-0 mt-2 z-[9999]">
                    <TechlandCategoryDropdown
                      categories={categoryTree}
                      loading={categoryLoading}
                      onClose={() => setCatOpen(false)}
                    />
                  </div>
                )}
              </div>

              {/* Search */}
              <div className="flex-1 header-search-wrapper relative min-w-0">
                <div className="relative">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    onFocus={() =>
                      searchResults.length > 0 && setShowSearchDropdown(true)
                    }
                    placeholder="Search for products..."
                    className="
                      w-full h-11
                      rounded-r-md rounded-l-none
                      bg-background text-foreground
                      border border-border border-l-0
                      pl-4 pr-[54px]
                      placeholder:text-muted-foreground
                      focus:outline-none focus:ring-2 focus:ring-primary/40
                    "
                  />

                  <button
                    type="button"
                    className="
                      absolute right-1 top-1
                      h-9 w-11 rounded-md
                      bg-primary text-primary-foreground
                      border border-border
                      flex items-center justify-center
                      hover:bg-primary/90 transition
                    "
                    onClick={() => {
                      if (searchResults.length > 0)
                        handleSelectProduct(searchResults[0]);
                    }}
                    aria-label="Search"
                  >
                    <Search className="h-4 w-4" />
                  </button>

                  {showSearchDropdown && (
                    <div className="absolute mt-2 w-full bg-popover text-foreground rounded-xl shadow-2xl border border-border max-h-80 overflow-auto z-[9999]">
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
                            className="w-full flex items-start px-4 py-2 text-left hover:bg-accent transition text-sm"
                          >
                            <span className="font-medium">{p.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3 shrink-0">
              {hasMounted && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="rounded-lg bg-muted hover:bg-accent text-foreground h-11 w-11 flex items-center justify-center border border-border"
                      title="Select theme"
                    >
                      {darkLikeActiveTheme ? (
                        <Sun className="h-5 w-5" />
                      ) : (
                        <Moon className="h-5 w-5" />
                      )}
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

              <Link href="/ecommerce/blogs" className={topBtnClass}>
                <Newspaper className="h-4 w-4" />
                Blog
              </Link>

              <Link href="/ecommerce/products" className={topBtnClass}>
                <Boxes className="h-4 w-4" />
                All Products
              </Link>

              <Link
                href="/ecommerce/cart"
                className="relative h-11 w-11 rounded-lg bg-muted text-foreground border border-border flex items-center justify-center transition-colors hover:bg-accent"
              >
                <ShoppingCart className="h-5 w-5" />
                {hasMounted && cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>

              <Link
                href="/ecommerce/wishlist"
                className="relative h-11 w-11 rounded-lg bg-muted text-foreground border border-border flex items-center justify-center transition-colors hover:bg-accent"
              >
                <Heart className="h-5 w-5" />
                {hasMounted && wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((p) => !p)}
                  className="relative h-11 w-11 rounded-lg bg-muted text-foreground border border-border flex items-center justify-center transition-colors hover:bg-accent"
                  aria-label="Profile"
                >
                  <UserIcon className="h-5 w-5" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-background text-foreground border border-border rounded-xl shadow-2xl overflow-hidden z-50">
                    {hasMounted && session ? (
                      <>
                        <div className="px-4 py-3 border-b border-border">
                          <div className="text-sm font-semibold">{userName}</div>
                          <div className="text-xs text-muted-foreground">
                            {displayRole}
                          </div>
                        </div>

                        <Link
                          href={canAccessAdminPanel ? "/admin" : "/ecommerce/user/"}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted transition"
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
                          className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted transition"
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => router.push("/signin")}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted transition"
                      >
                        <LogIn className="h-4 w-4" />
                        Login
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ✅ Mobile header (same as before) */}
          <div className="flex md:hidden items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3 min-w-0">
              <div className="relative h-12 w-12 rounded-2xl overflow-hidden border border-border bg-background/10 shrink-0">
                <Image
                  src={siteSettings.logo || "/assets/examplelogo.jpg"}
                  alt="Logo"
                  fill
                  className="object-contain 2xl"
                />
              </div>
              <div className="text-md sm:text-3xl tracking-wider truncate">
                {siteSettings.siteTitle || "BOED ECOMMERCE"}
              </div>
            </Link>

            <div className="flex md:hidden items-center gap-2">
              {hasMounted && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="rounded-lg bg-muted hover:bg-accent text-foreground h-10 w-10 flex items-center justify-center border border-border"
                      title="Select theme"
                    >
                      {darkLikeActiveTheme ? (
                        <Sun className="h-5 w-5" />
                      ) : (
                        <Moon className="h-5 w-5" />
                      )}
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

              <Link
                href="/ecommerce/cart"
                className="relative h-10 w-10 rounded-lg bg-muted text-foreground border border-border flex items-center justify-center transition-colors hover:bg-accent"
              >
                <ShoppingCart className="h-5 w-5" />
                {hasMounted && cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>

              <Link
                href="/ecommerce/wishlist"
                className="relative h-10 w-10 rounded-lg bg-muted text-foreground border border-border flex items-center justify-center transition-colors hover:bg-accent"
              >
                <Heart className="h-5 w-5" />
                {hasMounted && wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="h-10 w-10 rounded-lg bg-muted text-foreground border border-border flex items-center justify-center transition-colors hover:bg-accent"
                aria-label="Open menu"
              >
                <span className="text-xl leading-none">☰</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Mobile Drawer: All Categories */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[9999]">
          {/* overlay */}
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu overlay"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* panel */}
          <div className="absolute right-0 top-0 h-full w-[86%] max-w-[380px] bg-background text-foreground border-l border-border shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div className="font-semibold">Menu</div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="h-10 w-10 rounded-lg border border-border bg-muted hover:bg-accent flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-64px)]">
              {/* quick links */}
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/ecommerce/products"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg border border-border bg-muted hover:bg-accent px-3 py-2 text-sm font-semibold flex items-center gap-2"
                >
                  <Boxes className="h-4 w-4" />
                  All Products
                </Link>
                <Link
                  href="/ecommerce/blogs"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg border border-border bg-muted hover:bg-accent px-3 py-2 text-sm font-semibold flex items-center gap-2"
                >
                  <Newspaper className="h-4 w-4" />
                  Blog
                </Link>
              </div>

              {/* account */}
              <div className="rounded-xl border border-border overflow-hidden">
                {hasMounted && session ? (
                  <>
                    <div className="px-4 py-3 border-b border-border">
                      <div className="text-sm font-semibold">{userName}</div>
                      <div className="text-xs text-muted-foreground">{displayRole}</div>
                    </div>

                    <Link
                      href={canAccessAdminPanel ? "/admin" : "/ecommerce/user/"}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted transition"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={async () => {
                        setMobileMenuOpen(false);
                        await handleSignOut();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted transition"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      router.push("/signin");
                    }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted transition"
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </button>
                )}
              </div>

              {/* categories */}
              <div>
                <div className="mb-2 text-sm font-semibold">All Categories</div>
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
