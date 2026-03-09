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
import SupportChatWidget from "@/components/chat/SupportChatWidget";
import AnalyticsTracker from "@/components/AnalyticsTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/site`, {
      cache: 'no-cache',
      next: { revalidate: 0 }
    });
    
    if (response.ok) {
      const siteSettings = await response.json();
      
      return {
        title: {
          default: siteSettings.siteTitle || "BOED Ecommerce",
          template: `%s | ${siteSettings.siteTitle || "BOED Admin"}`
        },
        description: "Admin dashboard for BOED Ecommerce",
        icons: {
          icon: siteSettings.logo || "/assets/favicon.png",
        },
        metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://boed.com'),
      };
    }
  } catch (error) {
    console.error('Failed to fetch site settings for metadata:', error);
  }

  // Fallback metadata
  return {
    title: {
      default: "BOED Ecommerce",
      template: "%s | BOED Admin"
    },
    description: "Admin dashboard for BOED Ecommerce",
    icons: {
      icon: "/assets/favicon.png",
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://boed.com'),
  };
}

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
          themes={["light", "dark", "navy", "plum", "olive", "rose"]}
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Providers>
             <AnalyticsTracker />
            <TreeProvider>
              <CartProvider>
                <WishlistProvider>
                  <main className="flex-1">{children}</main>
                  <SupportChatWidget />
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
