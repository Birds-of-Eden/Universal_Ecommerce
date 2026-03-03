export type ThemeMode = "light" | "dark" | "navy" | "plum"

export function applyTheme(theme: ThemeMode) {
  const root = document.documentElement

  root.classList.remove("light", "dark", "theme-navy", "theme-plum")

  if (theme === "dark") {
    root.classList.add("dark")
  } else if (theme === "navy") {
    root.classList.add("theme-navy")
  } else if (theme === "plum") {
    root.classList.add("theme-plum")
  }
}