"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

type ThemeMode = "light" | "dark" | "navy" | "plum";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const changeTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);
  };

  return (
    <div className="flex gap-2 p-2 bg-card rounded-xl border">
      <button
        onClick={() => changeTheme("light")}
        className="px-3 py-1 rounded-md bg-primary text-primary-foreground"
      >
        Light
      </button>

      <button
        onClick={() => changeTheme("dark")}
        className="px-3 py-1 rounded-md bg-primary text-primary-foreground"
      >
        Dark
      </button>

      <button
        onClick={() => changeTheme("navy")}
        className="px-3 py-1 rounded-md bg-primary text-primary-foreground"
      >
        Navy
      </button>

      <button
        onClick={() => changeTheme("plum")}
        className="px-3 py-1 rounded-md bg-primary text-primary-foreground"
      >
        Plum
      </button>
    </div>
  );
}
