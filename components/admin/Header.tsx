"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Menu, Home, LogOut, LayoutDashboard, Moon, Sun } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [isPending, setIsPending] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
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

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

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
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
          <LayoutDashboard className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-foreground hidden sm:block">
            BOED Admin
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block">
            E-Commarce Management System
          </p>
          <h1 className="text-lg font-bold text-foreground sm:hidden">Admin</h1>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Theme Toggle */}
        {mounted && (
          <Button
            onClick={toggleTheme}
            variant="ghost"
            size="icon"
            className="rounded-full bg-muted hover:bg-accent text-foreground"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
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