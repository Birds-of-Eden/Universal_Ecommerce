export type ThemeMode = "light" | "dark" | "steel-blue" | "green" | "plum";

export function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;

  root.classList.remove("light", "dark", "green", "steel-blue", "plum", "theme-green", "theme-plum", "theme-steel");

  if (theme === "light") {
    root.classList.add("light");
  } else if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "steel-blue") {
    root.classList.add("steel", "theme-steel");
  } else if (theme === "green") {
    root.classList.add("green", "theme-green");
  } else if (theme === "plum") {
    root.classList.add("plum", "theme-plum");
  }
}

export function isDarkLikeTheme(theme?: string | null) {
  return theme === "dark" || theme === "green" || theme === "plum";
}

export function nextHeaderTheme(theme?: string | null, resolvedTheme?: string | null): "light" | "dark" {
  const activeTheme = resolvedTheme ?? theme;
  return isDarkLikeTheme(activeTheme) ? "light" : "dark";
}
