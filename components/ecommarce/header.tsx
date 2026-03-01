"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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

/* =========================
   CONFIG
========================= */
const CATEGORIES_API = "/api/categories";

/* =========================
   Types
========================= */
interface ProductSummary {
  id: number | string;
  name: string;
  writer?: { name: string } | null;
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

/* =========================
   Flyout (Desktop)
========================= */
function CategoryFlyout({
  roots,
  onNavigate,
}: {
  roots: CategoryNode[];
  onNavigate: () => void;
}) {
  const [activeRootId, setActiveRootId] = useState<number | null>(null);
  const [activeSubId, setActiveSubId] = useState<number | null>(null);

  const activeRoot = useMemo(() => {
    if (!activeRootId) return null;
    return roots.find((r) => r.id === activeRootId) ?? null;
  }, [roots, activeRootId]);

  const activeSub = useMemo(() => {
    if (!activeRoot || !activeSubId) return null;
    return activeRoot.children.find((c) => c.id === activeSubId) ?? null;
  }, [activeRoot, activeSubId]);

  useEffect(() => setActiveSubId(null), [activeRootId]);

  const colItemBase =
    "w-full flex items-center justify-between px-4 py-2 text-left text-sm transition";
  const colItemInactive = "text-foreground hover:bg-muted";
  const colItemActive = "bg-primary text-primary-foreground";

  return (
    <div
      className="inline-flex w-fit bg-background text-foreground border border-border rounded-xl shadow-2xl overflow-hidden"
      onMouseLeave={() => {
        setActiveRootId(null);
        setActiveSubId(null);
      }}
    >
      {/* Parent */}
      <div className="w-[280px] max-h-[380px] overflow-auto">
        {roots.map((parent) => {
          const isActive = parent.id === activeRootId;
          return (
            <button
              key={parent.id}
              type="button"
              onMouseEnter={() => setActiveRootId(parent.id)}
              className={`${colItemBase} ${
                isActive ? colItemActive : colItemInactive
              }`}
            >
              <span className="font-semibold truncate">{parent.name}</span>
              <ChevronRight className="h-4 w-4 opacity-70" />
            </button>
          );
        })}
      </div>

      {/* Sub */}
      {activeRoot && (
        <div className="w-[280px] max-h-[380px] overflow-auto border-l border-border bg-background">
          <Link
            href={`/kitabghor/categories/${activeRoot.slug}`}
            onClick={onNavigate}
            className="block px-4 py-2 text-xs font-semibold text-primary border-b border-border hover:underline"
          >
            {activeRoot.name} — সব দেখুন
          </Link>

          {activeRoot.children.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              সাব ক্যাটাগরি নেই
            </div>
          ) : (
            activeRoot.children.map((sub) => {
              const isActive = sub.id === activeSubId;
              const hasChild = (sub.children?.length ?? 0) > 0;

              return (
                <button
                  key={sub.id}
                  type="button"
                  onMouseEnter={() => setActiveSubId(sub.id)}
                  className={`${colItemBase} ${
                    isActive ? colItemActive : colItemInactive
                  }`}
                >
                  <span className="truncate">{sub.name}</span>
                  {hasChild ? (
                    <ChevronRight className="h-4 w-4 opacity-70" />
                  ) : (
                    <span className="w-4" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Child */}
      {activeSub && (
        <div className="w-[280px] max-h-[380px] overflow-auto border-l border-border bg-background">
          <Link
            href={`/kitabghor/categories/${activeSub.slug}`}
            onClick={onNavigate}
            className="block px-4 py-2 text-xs font-semibold text-primary border-b border-border hover:underline"
          >
            {activeSub.name} — সব দেখুন
          </Link>

          {activeSub.children.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              চাইল্ড ক্যাটাগরি নেই
            </div>
          ) : (
            <div className="p-2">
              {activeSub.children.map((child) => (
                <Link
                  key={child.id}
                  href={`/kitabghor/categories/${child.slug}`}
                  onClick={onNavigate}
                  className="block px-3 py-2 rounded-lg text-sm hover:bg-muted transition"
                >
                  {child.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const { cartItems } = useCart();
  const { wishlistCount } = useWishlist();

  const [hasMounted, setHasMounted] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [theme, setTheme] = useState("light");

  // ✅ Mobile drawer
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

  // ✅ row3 refs + dropdown position
  const row3Ref = useRef<HTMLDivElement | null>(null);
  const catItemRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const [dropdownLeft, setDropdownLeft] = useState(0);

  const userName = (session?.user as any)?.name || "ব্যবহারকারী";
  const userRole = (session?.user as any)?.role || "user";

  useEffect(() => setHasMounted(true), []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  useEffect(() => {
    const total =
      cartItems?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
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
              writer: p.writer ?? null,
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

  // ✅ body scroll lock when drawer open
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
    router.push(`/kitabghor/books/${p.id}`);
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
    "h-10 px-5 rounded-lg btn-primary border border-border flex items-center gap-2 text-sm font-semibold";
  const iconBtnClass =
    "relative h-11 w-11 rounded-lg btn-primary border border-border flex items-center justify-center";

  // Theme toggle button component
  const Button = ({ children, onClick, className, title }: any) => (
    <button onClick={onClick} className={className} title={title}>
      {children}
    </button>
  );

  const underlinePill =
    "relative flex items-center px-4 py-2 rounded-full btn-primary transition-all duration-200 " +
    "after:absolute after:left-4 after:right-4 after:-bottom-1 after:h-[2px] " +
    "after:bg-primary-foreground after:scale-x-0 after:origin-left " +
    "after:transition-transform after:duration-300 hover:after:scale-x-100";

  return (
    <header className="sticky top-0 z-50">
      {/* Main Header (Row1 + Row2) */}
      <div className="bg-primary text-primary-foreground border-b border-border">
        <div className="container mx-auto px-4 py-4 space-y-4">
          {/* Row 1 */}
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-3 min-w-0">
              <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-border bg-background/10 shrink-0">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  fill
                  className="object-contain p-1"
                />
              </div>
              <div className="text-xl sm:text-3xl font-extrabold tracking-wider truncate">
                হিলফুল<span className="opacity-80">-ফুযুল</span>
              </div>
            </Link>

            {/* Desktop actions */}
            <div className="hidden md:flex items-center gap-3">
              {hasMounted && (
                <Button
                  onClick={toggleTheme}
                  className="rounded-full bg-muted hover:bg-accent text-foreground h-11 w-11 flex items-center justify-center border border-border"
                  title={
                    theme === "dark"
                      ? "Switch to Light Mode"
                      : "Switch to Dark Mode"
                  }
                >
                  {theme === "dark" ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
              )}

              <Link href="/kitabghor/blogs" className={topBtnClass}>
                <Newspaper className="h-4 w-4" />
                ব্লগ
              </Link>
              <Link href="/kitabghor/books" className={topBtnClass}>
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
                  {theme === "dark" ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
              )}

              <Link
                href="/kitabghor/cart"
                className="relative h-10 w-10 rounded-lg btn-primary border border-border flex items-center justify-center"
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
                className="relative h-10 w-10 rounded-lg btn-primary border border-border flex items-center justify-center"
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
                className="h-10 w-10 rounded-lg btn-primary border border-border flex items-center justify-center"
                aria-label="Open menu"
              >
                <span className="text-xl leading-none">☰</span>
              </button>
            </div>
          </div>

          {/* ✅ Mobile Search */}
          <div className="md:hidden header-search-wrapper relative">
            <div className="relative">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() =>
                  searchResults.length > 0 && setShowSearchDropdown(true)
                }
                placeholder="Search for products..."
                className="w-full h-11 rounded-lg pl-4 pr-[54px] input-theme focus:outline-none focus:ring-2 focus:ring-primary"
              />

              <button
                type="button"
                className="absolute right-1 top-1 h-9 w-11 rounded-md btn-primary border border-border flex items-center justify-center"
                onClick={() => {
                  if (searchResults.length > 0)
                    handleSelectProduct(searchResults[0]);
                }}
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </button>

              {showSearchDropdown && (
                <div className="absolute mt-2 w-full bg-background text-foreground rounded-xl shadow-2xl border border-border max-h-80 overflow-auto z-50">
                  {searchLoading && !hasLoadedProducts ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      লোড হচ্ছে...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-muted-foreground">
                      কোন বই পাওয়া যায়নি
                    </div>
                  ) : (
                    searchResults.map((book) => (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => handleSelectProduct(book)}
                        className="w-full flex items-start px-4 py-2 text-left hover:bg-muted transition text-sm"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{book.name}</span>
                          {book.writer?.name && (
                            <span className="text-xs text-muted-foreground">
                              লেখক: {book.writer.name}
                            </span>
                          )}
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
            {/* All Category */}
            <div ref={catWrapRef} className="relative">
              <button
                type="button"
                onClick={() => setCatOpen((p) => !p)}
                className="h-11 w-[190px] px-4 rounded-lg btn-primary border border-border flex items-center justify-between"
              >
                <span className="text-sm font-semibold">All Category</span>
                <ChevronDown className="h-4 w-4 opacity-80" />
              </button>

              {catOpen && (
                <div className="absolute left-0 mt-2 z-50">
                  {categoryLoading ? (
                    <div className="bg-background text-foreground px-5 py-4 rounded-xl border border-border shadow-2xl text-sm">
                      লোড হচ্ছে...
                    </div>
                  ) : categoryTree.length === 0 ? (
                    <div className="bg-background text-foreground px-5 py-4 rounded-xl border border-border shadow-2xl text-sm">
                      কোন ক্যাটাগরি নেই
                    </div>
                  ) : (
                    <CategoryFlyout
                      roots={categoryTree}
                      onNavigate={() => setCatOpen(false)}
                    />
                  )}
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
                  onFocus={() =>
                    searchResults.length > 0 && setShowSearchDropdown(true)
                  }
                  placeholder="Search for products..."
                  className="w-full h-11 rounded-lg pl-4 pr-[54px] input-theme focus:outline-none focus:ring-2 focus:ring-primary"
                />

                <button
                  type="button"
                  className="absolute right-1 top-1 h-9 w-11 rounded-md btn-primary border border-border flex items-center justify-center"
                  onClick={() => {
                    if (searchResults.length > 0)
                      handleSelectProduct(searchResults[0]);
                  }}
                  aria-label="Search"
                >
                  <Search className="h-4 w-4" />
                </button>

                {showSearchDropdown && (
                  <div className="absolute mt-2 w-full bg-background text-foreground rounded-xl shadow-2xl border border-border max-h-80 overflow-auto z-50">
                    {searchLoading && !hasLoadedProducts ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">
                        লোড হচ্ছে...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted-foreground">
                        কোন বই পাওয়া যায়নি
                      </div>
                    ) : (
                      searchResults.map((book) => (
                        <button
                          key={book.id}
                          type="button"
                          onClick={() => handleSelectProduct(book)}
                          className="w-full flex items-start px-4 py-2 text-left hover:bg-muted transition text-sm"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{book.name}</span>
                            {book.writer?.name && (
                              <span className="text-xs text-muted-foreground">
                                লেখক: {book.writer.name}
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
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
                          <div className="text-xs text-muted-foreground">
                            {userRole}
                          </div>
                        </div>

                        <Link
                          href={
                            userRole === "admin"
                              ? "/admin"
                              : "/kitabghor/user/"
                          }
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted transition"
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          ড্যাশবোর্ড
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
                          লগআউট
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => router.push("/signin")}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted transition"
                      >
                        <LogIn className="h-4 w-4" />
                        লগইন
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
      <div className="bg-primary text-foreground border-b border-border hidden md:block">
        <div className="container mx-auto px-4">
          <div
            ref={row3Ref}
            className="h-12 flex items-center gap-2 relative"
            onMouseLeave={() => setHoverTopCatId(null)}
          >
            {/* Home */}
            <Link href="/" className={underlinePill}>
              <House className="h-4 w-4 mr-2" />
              হোম
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
                  setHoverTopCatId(cat.id);

                  requestAnimationFrame(() => {
                    const wrap = row3Ref.current;
                    const el = catItemRefs.current.get(cat.id);
                    if (!wrap || !el) return;

                    const wrapRect = wrap.getBoundingClientRect();
                    const elRect = el.getBoundingClientRect();
                    setDropdownLeft(elRect.left - wrapRect.left);
                  });
                }}
              >
                <Link
                  href={`/kitabghor/categories/${cat.slug}`}
                  className={underlinePill}
                >
                  {cat.name}
                </Link>
              </div>
            ))}

            {/* hover dropdown */}
            {hoveredTop && hoveredTop.children.length > 0 && (
              <div
                className="absolute top-[52px] z-50"
                style={{ left: dropdownLeft }}
              >
                <CategoryFlyout
                  roots={[hoveredTop]}
                  onNavigate={() => setHoverTopCatId(null)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* overlay */}
          <button
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close overlay"
            type="button"
          />

          {/* panel */}
          <div className="absolute right-0 top-0 h-full w-[86%] max-w-[360px] bg-background text-foreground border-l border-border shadow-2xl flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="font-bold">মেনু</div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="h-10 w-10 rounded-lg btn-primary border border-border flex items-center justify-center"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-auto">
              {/* Quick links */}
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition"
              >
                <House className="h-4 w-4" />
                হোম
              </Link>

              <Link
                href="/kitabghor/blogs"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition"
              >
                <Newspaper className="h-4 w-4" />
                ব্লগ
              </Link>

              <Link
                href="/kitabghor/books"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition"
              >
                <Boxes className="h-4 w-4" />
                All Products
              </Link>

              {/* Profile */}
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
                    ড্যাশবোর্ড
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
                    লগআউট
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
                  লগইন
                </button>
              )}

              {/* Categories */}
              <div className="pt-2 border-t border-border" />
              <div className="font-semibold px-1">ক্যাটাগরি</div>

              {categoryLoading ? (
                <div className="text-sm text-muted-foreground px-1">লোড হচ্ছে...</div>
              ) : topCategories.length === 0 ? (
                <div className="text-sm text-muted-foreground px-1">কোন ক্যাটাগরি নেই</div>
              ) : (
                <div className="space-y-2">
                  {topCategories.map((parent) => (
                    <details
                      key={parent.id}
                      className="rounded-lg border border-border overflow-hidden"
                    >
                      <summary className="cursor-pointer select-none px-3 py-2 hover:bg-muted transition flex items-center justify-between">
                        <span className="font-medium">{parent.name}</span>
                        <ChevronDown className="h-4 w-4 opacity-70" />
                      </summary>

                      <div className="p-2 space-y-1 bg-background">
                        <Link
                          href={`/kitabghor/categories/${parent.slug}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block px-3 py-2 rounded-lg text-sm hover:bg-muted transition text-primary"
                        >
                          সব দেখুন
                        </Link>

                        {(parent.children?.length ?? 0) === 0 ? (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            সাব ক্যাটাগরি নেই
                          </div>
                        ) : (
                          parent.children.map((sub) => (
                            <details
                              key={sub.id}
                              className="rounded-lg border border-border"
                            >
                              <summary className="cursor-pointer select-none px-3 py-2 hover:bg-muted transition flex items-center justify-between text-sm">
                                <span>{sub.name}</span>
                                <ChevronDown className="h-4 w-4 opacity-70" />
                              </summary>

                              <div className="p-2 space-y-1">
                                <Link
                                  href={`/kitabghor/categories/${sub.slug}`}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className="block px-3 py-2 rounded-lg text-sm hover:bg-muted transition text-primary"
                                >
                                  সব দেখুন
                                </Link>

                                {(sub.children?.length ?? 0) === 0 ? (
                                  <div className="px-3 py-2 text-sm text-muted-foreground">
                                    চাইল্ড ক্যাটাগরি নেই
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
            </div>
          </div>
        </div>
      )}
    </header>
  );
}