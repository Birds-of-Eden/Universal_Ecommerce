//components/ecommarce/header.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { useCart } from "@/components/ecommarce/CartContext";
import { useWishlist } from "@/components/ecommarce/WishlistContext";
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
  House,
  Newspaper,
  Boxes,
  Sun,
  Moon,
} from "lucide-react";

const CATEGORIES_API = "/api/categories";

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
   ✅ Row-2 Dropdown
   - Parent visible first
   - Hover Parent => show Sub
   - Hover Sub => show Child
   - Professional scroll
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

  // ✅ initially hidden
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

  // reset when dropdown content changes (safe)
  useEffect(() => {
    setActiveParentId(null);
    setActiveSubId(null);
  }, [categories.length]);

  const go = (slug: string) => {
    router.push(`/kitabghor/categories/${slug}`);
    onClose();
  };

  const itemBase =
    "w-full flex items-center justify-between px-4 py-2.5 text-sm transition select-none";
  const itemInactive =
    "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/60";
  const itemActive =
    "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900";

  // professional scroll: works even without plugins (Firefox uses scrollbarWidth)
  const colShell =
    "w-[260px] max-h-[420px] overflow-y-auto overflow-x-hidden " +
    "bg-white dark:bg-slate-900 " +
    "scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent";

  const wrapperShell =
    "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-md overflow-hidden";

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-md px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
        Loading...
      </div>
    );
  }

  if (!categories.length) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl rounded-md px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
        No categories found.
      </div>
    );
  }

  return (
    <div className={wrapperShell}>
      <div className="flex">
        {/* Parent (always visible) */}
        <div
          className={`${colShell} border-r border-slate-200 dark:border-slate-700`}
          style={{ scrollbarWidth: "thin" }}
        >
          {categories.map((p) => {
            const isActive = p.id === activeParentId;
            const hasSub = (p.children?.length ?? 0) > 0;

            return (
              <button
                key={p.id}
                type="button"
                onMouseEnter={() => {
                  setActiveParentId(p.id);
                  setActiveSubId(null); // ✅ child hidden until sub hover
                }}
                onClick={() => go(p.slug)}
                className={`${itemBase} ${isActive ? itemActive : itemInactive}`}
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

        {/* Sub (hidden until Parent hover) */}
        <div
          className={`${colShell} border-r border-slate-200 dark:border-slate-700 ${
            activeParentId ? "block" : "hidden"
          }`}
          style={{ scrollbarWidth: "thin" }}
        >
          {subList.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
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
                  className={`${itemBase} ${isActive ? itemActive : itemInactive}`}
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

        {/* Child (hidden until Sub hover) */}
        <div className={`${colShell} ${activeSubId ? "block" : "hidden"}`} style={{ scrollbarWidth: "thin" }}>
          {childList.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              No child categories.
            </div>
          ) : (
            childList.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => go(c.slug)}
                className={`${itemBase} ${itemInactive}`}
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
   Header
========================= */
export default function Header() {
  const router = useRouter();
  const { data: session } = useSession();

  const { cartItems } = useCart();
  const { wishlistCount } = useWishlist();

  const [hasMounted, setHasMounted] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

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

  // row-3 hover dropdown
  const [hoverTopCatId, setHoverTopCatId] = useState<number | null>(null);

  // row3 refs + dropdown position (viewport-fixed, clamped)
  const row3Ref = useRef<HTMLDivElement | null>(null);
  const catItemRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const [dropdownPos, setDropdownPos] = useState<{ left: number; top: number } | null>(null);

  // ✅ Row-3 no-stuck close controller
  const closeTimerRef = useRef<number | null>(null);
  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };
  const scheduleCloseRow3 = () => {
    // Fast close; dropdown cancels it on enter
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setHoverTopCatId(null);
      setDropdownPos(null);
    }, 80);
  };

  const userName = (session?.user as any)?.name || "User";
  const userRole = (session?.user as any)?.role || "user";

  useEffect(() => setHasMounted(true), []);

  // theme load
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;

    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
      return;
    }

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const systemTheme: "light" | "dark" = prefersDark ? "dark" : "light";
    setTheme(systemTheme);

    if (systemTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  };

  useEffect(() => {
    const total = cartItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    setCartCount(total);
  }, [cartItems]);

  // load products for search
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setSearchLoading(true);
        const res = await fetch("/api/products", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
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
  }, []);

  // load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoryLoading(true);
        const res = await fetch(CATEGORIES_API, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as any[];
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
  }, []);

  // search filtering
  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2 || !hasLoadedProducts) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    const term = searchTerm.toLowerCase();
    const filtered = allProducts.filter((p) => p.name.toLowerCase().includes(term)).slice(0, 8);
    setSearchResults(filtered);
    setShowSearchDropdown(filtered.length > 0);
  }, [searchTerm, allProducts, hasLoadedProducts]);

  // outside click close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;

      if (catWrapRef.current && !catWrapRef.current.contains(target)) setCatOpen(false);
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false);

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

  // cleanup row3 timer
  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  const handleSelectProduct = (p: ProductSummary) => {
    setSearchTerm("");
    setShowSearchDropdown(false);
    router.push(`/kitabghor/products/${p.id}`);
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

  // root categories for row-3 menu
  const topCategories = categoryTree;

  const hoveredTop = useMemo(() => {
    if (!hoverTopCatId) return null;
    return topCategories.find((c) => c.id === hoverTopCatId) ?? null;
  }, [hoverTopCatId, topCategories]);

  // reusable button classes
  const topBtnClass =
    "h-10 px-5 rounded-lg bg-muted text-foreground border border-border flex items-center gap-2 text-sm font-semibold transition-colors hover:bg-accent";
  const iconBtnClass =
    "relative h-11 w-11 rounded-lg bg-muted text-foreground border border-border flex items-center justify-center transition-colors hover:bg-accent";

  // Theme toggle button component
  const Button = ({ children, onClick, className, title }: any) => (
    <button onClick={onClick} className={className} title={title}>
      {children}
    </button>
  );

  const underlinePill =
    "relative flex items-center px-4 py-2 transition-colors duration-200 " +
    "text-foreground " +
    "after:absolute after:left-4 after:right-4 after:-bottom-1 after:h-[2px] " +
    "after:bg-current after:scale-x-0 after:origin-left " +
    "after:transition-transform after:duration-300 hover:after:scale-x-100";

  // dropdown positioning (row3)
  const positionHoverDropdown = (catId: number) => {
    const el = catItemRefs.current.get(catId);
    if (!el) return;

    const rect = el.getBoundingClientRect();

    // width estimate of row3 dropdown used below (kept from your code)
    const W = 780;
    const margin = 8;

    const left = clamp(rect.left, margin, window.innerWidth - W - margin);
    const top = rect.bottom + 8;

    setDropdownPos({ left, top });
  };

  // keep dropdown in place on scroll/resize
  useEffect(() => {
    if (!hoverTopCatId) return;

    const onUpdate = () => positionHoverDropdown(hoverTopCatId);

    window.addEventListener("resize", onUpdate);
    window.addEventListener("scroll", onUpdate, true);

    return () => {
      window.removeEventListener("resize", onUpdate);
      window.removeEventListener("scroll", onUpdate, true);
    };
  }, [hoverTopCatId]);

  return (
    <header className="sticky top-0 z-50">
      {/* Main Header (Row1 + Row2) */}
      <div className="bg-background text-foreground border-b border-border">
        <div className="container mx-auto px-4 py-4 space-y-4">
          {/* Row 1 */}
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3 min-w-0">
              <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-border bg-background/10 shrink-0">
                <Image src="/assets/examplelogo.jpg" alt="Logo" fill className="object-contain p-1" />
              </div>
              <div className="text-md sm:text-3xl tracking-wider truncate">BOED ECOMMERCE</div>
            </Link>

            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-3">
              {hasMounted && (
                <Button
                  onClick={toggleTheme}
                  className="rounded-full bg-muted hover:bg-accent text-foreground h-11 w-11 flex items-center justify-center border border-border"
                  title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              )}

              <Link href="/kitabghor/blogs" className={topBtnClass}>
                <Newspaper className="h-4 w-4" />
                Blog
              </Link>
              <Link href="/kitabghor/products" className={topBtnClass}>
                <Boxes className="h-4 w-4" />
                All Products
              </Link>
            </div>

            {/* Mobile actions */}
            <div className="flex md:hidden items-center gap-2">
              {hasMounted && (
                <Button
                  onClick={toggleTheme}
                  className="rounded-lg bg-muted hover:bg-accent text-foreground h-10 w-10 flex items-center justify-center border border-border"
                  title={theme === "dark" ? "Light" : "Dark"}
                >
                  {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              )}

              <Link
                href="/kitabghor/cart"
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
                href="/kitabghor/wishlist"
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

          {/* Mobile Search */}
          <div className="md:hidden header-search-wrapper relative">
            <div className="relative">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                placeholder="Search for products..."
                className="w-full h-11 rounded-lg pl-4 pr-[54px] input-theme"
              />

              <button
                type="button"
                className="absolute right-1 top-1 h-9 w-11 rounded-md bg-muted text-foreground border border-border flex items-center justify-center transition-colors hover:bg-accent"
                onClick={() => {
                  if (searchResults.length > 0) handleSelectProduct(searchResults[0]);
                }}
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>

              {showSearchDropdown && (
                <div className="absolute mt-2 w-full bg-background text-foreground rounded-xl shadow-2xl border border-border max-h-80 overflow-auto z-50">
                  {searchLoading && !hasLoadedProducts ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">Loading...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">No results found.</div>
                  ) : (
                    searchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProduct(p)}
                        className="w-full flex items-start px-4 py-2 text-left hover:bg-muted transition text-sm"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Row 2 (Desktop only) */}
          <div className="hidden md:flex items-center gap-4">
            {/* All Category + Search (theme-aware) */}
            <div className="flex-1 flex items-center">
              {/* All Category */}
              <div ref={catWrapRef} className="relative">
                <button
                  type="button"
                  onClick={() => setCatOpen((p) => !p)}
                  className="
                    h-11 w-[200px]
                    rounded-l-md rounded-r-none
                    bg-muted text-foreground border border-border
                    flex items-center justify-between
                    px-4
                    hover:bg-accent transition
                    focus:outline-none focus:ring-2 focus:ring-primary/40
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
              <div className="flex-1 header-search-wrapper relative">
                <div className="relative">
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                    placeholder="Search for products..."
                    className="
                      w-full h-11
                      rounded-r-md rounded-l-none
                      bg-background text-foreground
                      border-y border-r border-border
                      pl-4 pr-[54px]
                      focus:outline-none focus:ring-2 focus:ring-primary/40
                    "
                  />

                  <button
                    type="button"
                    className="
                      absolute right-1 top-1
                      h-9 w-11 rounded-md
                      bg-muted text-foreground border border-border
                      flex items-center justify-center
                      hover:bg-accent transition
                    "
                    onClick={() => {
                      if (searchResults.length > 0) handleSelectProduct(searchResults[0]);
                    }}
                    aria-label="Search"
                  >
                    <Search className="h-4 w-4" />
                  </button>

                  {showSearchDropdown && (
                    <div className="absolute mt-2 w-full bg-background text-foreground rounded-xl shadow-2xl border border-border max-h-80 overflow-auto z-[9999]">
                      {searchLoading && !hasLoadedProducts ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">Loading...</div>
                      ) : searchResults.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-muted-foreground">No results found.</div>
                      ) : (
                        searchResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectProduct(p)}
                            className="w-full flex items-start px-4 py-2 text-left hover:bg-muted transition text-sm"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">{p.name}</span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Icons + Profile */}
            <div className="flex items-center gap-3">
              <Link href="/kitabghor/cart" className={iconBtnClass}>
                <ShoppingCart className="h-5 w-5" />
                {hasMounted && cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>

              <Link href="/kitabghor/wishlist" className={iconBtnClass}>
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
                  className={iconBtnClass}
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
                          <div className="text-xs text-muted-foreground">{userRole}</div>
                        </div>

                        <Link
                          href={userRole === "admin" ? "/admin" : "/kitabghor/user/"}
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
        </div>
      </div>

      {/* Row 3 (Desktop only) */}
      <div className="bg-background border-b border-border hidden md:block text-foreground">
        <div className="container mx-auto px-4">
          <div ref={row3Ref} className="h-12 flex items-center gap-2 relative">
            {/* Home */}
            <Link href="/" className={underlinePill}>
              <House className="h-4 w-4 mr-2" />
              Home
            </Link>

            {/* categories */}
            {topCategories.map((cat) => (
              <div
                key={cat.id}
                ref={(el) => {
                  catItemRefs.current.set(cat.id, el);
                }}
                className="relative"
                onMouseEnter={() => {
                  clearCloseTimer();
                  setHoverTopCatId(cat.id);
                  requestAnimationFrame(() => positionHoverDropdown(cat.id));
                }}
                onMouseLeave={() => {
                  // ✅ prevents stuck: mouse leave schedules close
                  scheduleCloseRow3();
                }}
              >
                <Link href={`/kitabghor/categories/${cat.slug}`} className={underlinePill}>
                  {cat.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row-3 Hover dropdown (same UI, close behaviour fixed) */}
      {hoveredTop && hoveredTop.children.length > 0 && dropdownPos && (
        <div
          className="fixed z-[9999]"
          style={{ left: dropdownPos.left, top: dropdownPos.top }}
          onMouseEnter={() => {
            // entering dropdown cancels close
            clearCloseTimer();
          }}
          onMouseLeave={() => {
            // leaving dropdown closes quickly
            scheduleCloseRow3();
          }}
        >
          <div className="bg-white border border-slate-200 shadow-2xl rounded-md overflow-hidden">
            <div className="flex">
              {/* Sub column */}
              <div className="w-[260px] max-h-[420px] overflow-auto bg-white border-r border-slate-200">
                {hoveredTop.children.map((sub) => (
                  <Link
                    key={sub.id}
                    href={`/kitabghor/categories/${sub.slug}`}
                    onClick={() => {
                      setHoverTopCatId(null);
                      setDropdownPos(null);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition"
                  >
                    <span className="truncate">{sub.name}</span>
                    {(sub.children?.length ?? 0) > 0 ? (
                      <ChevronRight className="h-4 w-4 opacity-80" />
                    ) : (
                      <span className="w-4" />
                    )}
                  </Link>
                ))}
              </div>

              {/* Child column (kept as your original behaviour: first sub children) */}
              <div className="w-[260px] max-h-[420px] overflow-auto bg-white">
                {(hoveredTop.children?.[0]?.children?.length ?? 0) === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-500">No child categories.</div>
                ) : (
                  hoveredTop.children[0].children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/kitabghor/categories/${child.slug}`}
                      onClick={() => {
                        setHoverTopCatId(null);
                        setDropdownPos(null);
                      }}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 transition"
                    >
                      <span className="truncate">{child.name}</span>
                      <span className="w-4" />
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer (unchanged UI text minimal English) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close overlay"
            type="button"
          />
          <div className="absolute right-0 top-0 h-full w-[86%] max-w-[360px] bg-background text-foreground border-l border-border shadow-2xl flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="font-bold">Menu</div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="h-10 w-10 rounded-lg bg-muted text-foreground border border-border flex items-center justify-center transition-colors hover:bg-accent"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-auto">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition"
              >
                <House className="h-4 w-4" />
                Home
              </Link>

              <Link
                href="/kitabghor/blogs"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition"
              >
                <Newspaper className="h-4 w-4" />
                Blog
              </Link>

              <Link
                href="/kitabghor/products"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition"
              >
                <Boxes className="h-4 w-4" />
                All Products
              </Link>

              <div className="pt-2 border-t border-border" />
              <div className="font-semibold px-3">Categories</div>

              {categoryLoading ? (
                <div className="text-sm text-muted-foreground px-3">Loading...</div>
              ) : topCategories.length === 0 ? (
                <div className="text-sm text-muted-foreground px-3">No categories found.</div>
              ) : (
                <div className="space-y-2">
                  {topCategories.map((parent) => (
                    <details
                      key={parent.id}
                      className="rounded-lg border border-border overflow-hidden"
                    >
                      <summary
                        className="cursor-pointer select-none px-3 py-2 hover:bg-muted transition flex items-center justify-between"
                      >
                        <span className="font-medium">{parent.name}</span>
                        <ChevronDown className="h-4 w-4 opacity-70" />
                      </summary>

                      <div className="p-2 space-y-1 bg-background">
                        <Link
                          href={`/kitabghor/categories/${parent.slug}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block px-3 py-2 rounded-lg text-sm hover:bg-muted transition text-primary"
                        >
                          View All
                        </Link>

                        {(parent.children?.length ?? 0) === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            No subcategories
                          </div>
                        ) : (
                          parent.children.map((sub) => (
                            <details
                              key={sub.id}
                              className="rounded-lg border border-border"
                            >
                              <summary
                                className="cursor-pointer select-none px-3 py-2 hover:bg-muted transition flex items-center justify-between text-sm"
                              >
                                <span>{sub.name}</span>
                                <ChevronDown className="h-4 w-4 opacity-70" />
                              </summary>

                              <div className="p-2 space-y-1">
                                <Link
                                  href={`/kitabghor/categories/${sub.slug}`}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className="block px-3 py-2 rounded-lg text-sm hover:bg-muted transition text-primary"
                                >
                                  View All
                                </Link>

                                {(sub.children?.length ?? 0) === 0 ? (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">
                                    No child categories
                                  </div>
                                ) : (
                                  sub.children.map((child) => (
                                    <Link
                                      key={child.id}
                                      href={`/kitabghor/categories/${child.slug}`}
                                      onClick={() => setMobileMenuOpen(false)}
                                      className="block px-3 py-2 rounded-lg text-sm hover:bg-muted transition"
                                    >
                                      {child.name}
                                    </Link>
                                  ))
                                )}
                              </div>
                            </details>
                          ))
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-border" />

              {hasMounted && session ? (
                <div className="space-y-2">
                  <div className="px-3">
                    <div className="text-sm font-semibold">{userName}</div>
                    <div className="text-xs text-muted-foreground">{userRole}</div>
                  </div>

                  <Link
                    href={userRole === "admin" ? "/admin" : "/kitabghor/user/"}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition"
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
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    router.push("/signin");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition text-left"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}