"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  React.useEffect(() => {
    const storageKey = props.storageKey ?? "theme";

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === "steel blue") {
        window.localStorage.setItem(storageKey, "steel-blue");
      }
    } catch {
      // ignore
    }
  }, [props.storageKey]);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
