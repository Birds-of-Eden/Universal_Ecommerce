import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import TreeProvider from "@/providers/treeProvider";
import { CartProvider } from "@/components/ecommarce/CartContext";
import { WishlistProvider } from "@/components/ecommarce/WishlistContext";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "BOED Ecommerce",
    template: "%s | BOED Admin"
  },
  description: "Admin dashboard for BOED Ecommerce",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://boed.com'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
            <TreeProvider>
              <CartProvider>
                <WishlistProvider>
                  <main className="flex-1">{children}</main>
                </WishlistProvider>
              </CartProvider>
            </TreeProvider>
          </Providers>
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}