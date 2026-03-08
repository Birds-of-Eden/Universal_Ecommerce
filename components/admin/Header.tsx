"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Menu,
  Home,
  LogOut,
  LayoutDashboard,
  Moon,
  Sun,
  Check,
  Image as ImageIcon,
} from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isDarkLikeTheme } from "@/lib/theme";
import Image from "next/image";

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "navy", label: "Navy" },
  { value: "plum", label: "Plum" },
  { value: "olive", label: "Olive" },
  { value: "rose", label: "Rose" },
] as const;

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { data: session } = useSession();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isPending, setIsPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [loadingSite, setLoadingSite] = useState(true);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch site settings
  useEffect(() => {
    const fetchSiteSettings = async () => {
      try {
        const response = await fetch('/api/site');
        const data = await response.json();
        setSiteSettings(data);
      } catch (error) {
        console.error('Failed to fetch site settings:', error);
      } finally {
        setLoadingSite(false);
      }
    };

    fetchSiteSettings();
  }, []);

  const handleLogout = async () => {
    setIsPending(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsPending(false);
    }
  };

  const activeTheme = (theme === "system" ? resolvedTheme : theme) ?? "light";
  const darkLikeActiveTheme = isDarkLikeTheme(activeTheme);

  const userName = (session?.user as any)?.name || "User";
  const userRole = (session?.user as any)?.role || "admin";

  return (
    <header className="w-full h-20 bg-background border-border border-b flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20 shadow-sm">
      {/* Mobile menu toggle */}
      <button
        className="lg:hidden p-2 rounded-full bg-muted hover:bg-accent transition-all duration-300 hover:scale-105"
        onClick={onMenuClick}
        aria-label="Toggle Menu"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {/* Logo and Title */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
          {loadingSite ? (
            <div className="animate-pulse w-full h-full bg-gray-200"></div>
          ) : siteSettings?.logo ? (
            <Image
              src={siteSettings.logo}
              alt="Site Logo"
              width={40}
              height={40}
              className="object-cover"
              onError={(e) => {
                // Fallback to default icon if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<svg class="h-5 w-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9h6v6H9z"></path></svg>';
              }}
            />
          ) : (
            <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
          )}
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-foreground hidden sm:block">
            {loadingSite ? (
              <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              siteSettings?.siteTitle ? siteSettings.siteTitle + " Admin" : "BOED Admin"
            )}
          </h1>
          <h1 className="text-lg font-bold text-foreground sm:hidden">
            {loadingSite ? (
              <div className="h-5 w-16 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              siteSettings?.siteTitle?.split(' ')[0] || "Admin"
            )}
          </h1>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Theme Toggle */}
        {mounted && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-muted hover:bg-accent text-foreground"
                title="Select theme"
              >
                {darkLikeActiveTheme ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
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

        {/* View Site Link */}
        <Link
          href="/"
          className="text-sm font-medium transition-all duration-300 hover:scale-105"
          title="View Live Site"
        >
          <Button
            variant="ghost"
            size="sm"
            className="hidden sm:flex bg-muted hover:bg-accent text-foreground border-border hover:border-border rounded-full px-4"
          >
            <Home className="w-4 h-4 mr-2" />
            View Site
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="sm:hidden bg-muted hover:bg-accent text-foreground rounded-full"
          >
            <Home className="w-4 h-4" />
          </Button>
        </Link>

        {/* User Info & Avatar */}
        <div className="hidden md:flex flex-col text-right">
          <p className="text-foreground text-sm font-semibold leading-none">
            {userName}
          </p>
          <p className="text-muted-foreground text-xs leading-none mt-1">
            {userRole}
          </p>
        </div>

        <Link href="/admin/profile" title="View Profile">
          <Avatar className="h-9 w-9 border-2 border-border cursor-pointer hover:opacity-80 transition-all duration-300 hover:scale-105 hover:border-primary">
            <AvatarImage
              src={(session?.user as any)?.image ?? undefined}
              alt={session?.user?.name ?? "Profile"}
            />
            <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
              {(session?.user?.name || "Me")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>

        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          disabled={isPending}
          className="hidden sm:flex bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold px-6 rounded-full transition-all duration-300 hover:shadow-lg hover:scale-105 border border-destructive"
        >
          {isPending ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          ) : (
            <>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </>
          )}
        </Button>
        <Button
          onClick={handleLogout}
          disabled={isPending}
          variant="ghost"
          size="icon"
          className="sm:hidden bg-muted hover:bg-accent text-foreground rounded-full"
          title="Logout"
        >
          {isPending ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          ) : (
            <LogOut className="w-4 h-4" />
          )}
        </Button>
      </div>
    </header>
  );
}
