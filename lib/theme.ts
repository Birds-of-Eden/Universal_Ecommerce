export type ThemeMode = "light" | "dark" | "green" | "plum";

export function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;

  root.classList.remove("light", "dark", "green", "plum", "theme-green", "theme-plum");

  if (theme === "light") {
    root.classList.add("light");
  } else if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "green") {
    root.classList.add("green");
  } else if (theme === "plum") {
    root.classList.add("plum");
  }
}

export function isDarkLikeTheme(theme?: string | null) {
  return theme === "dark" || theme === "green" || theme === "plum";
}

export function nextHeaderTheme(theme?: string | null, resolvedTheme?: string | null): "light" | "dark" {
  const activeTheme = resolvedTheme ?? theme;
  return isDarkLikeTheme(activeTheme) ? "light" : "dark";
}
