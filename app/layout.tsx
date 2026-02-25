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
    default: "হিলফুল-ফুযুল প্রকাশনী | ইসলামিক বইয়ের অনলাইন বিক্রেতা",
    template: "%s | হিলফুল-ফুযুল প্রকাশনী"
  },
  description: "হিলফুল-ফুযুল প্রকাশনী - বাংলাদেশের অন্যতম বৃহত্তম ইসলামিক বইয়ের অনলাইন স্টোর। আমরা হাদিস, কুরআন, ফিকহসহ নানা ধরনের ইসলামিক বই সংগ্রহ করে থাকি।",
  keywords: [
    "ইসলামিক বই",
    "হিলফুল-ফুযুল প্রকাশনী",
    "অনলাইন বই স্টোর",
    "বাংলাদেশ",
    "হাদিস বই",
    "কুরআন বই",
    "ফিকহ বই",
    "ইসলামিক সাহিত্য"
  ],
  authors: [{ name: "হিলফুল-ফুযুল প্রকাশনী" }],
  creator: "হিলফুল-ফুযুল প্রকাশনী",
  publisher: "হিলফুল-ফুযুল প্রকাশনী",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://hilfulfuzul.com'),
  alternates: {
    canonical: '/',
    languages: {
      'bn-BD': '/bn',
      'en': '/en'
    }
  },
  openGraph: {
    title: "হিলফুল-ফুযুল প্রকাশনী | ইসলামিক বইয়ের অনলাইন বিক্রেতা",
    description: "হিলফুল-ফুযুল প্রকাশনী - বাংলাদেশের অন্যতম বৃহত্তম ইসলামিক বইয়ের অনলাইন স্টোর।",
    url: '/',
    siteName: 'হিলফুল-ফুযুল প্রকাশনী',
    images: [
      {
        url: '/images/books-collection.jpg',
        width: 1200,
        height: 630,
        alt: 'হিলফুল-ফুযুল প্রকাশনী - ইসলামিক বই সংগ্রহ',
      },
    ],
    locale: 'bn_BD',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "হিলফুল-ফুযুল প্রকাশনী | ইসলামিক বইয়ের অনলাইন বিক্রেতা",
    description: "হিলফুল-ফুযুল প্রকাশনী - বাংলাদেশের অন্যতম বৃহত্তম ইসলামিক বইয়ের অনলাইন স্টোর।",
    images: ['/images/books-collection.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    yandex: process.env.YANDEX_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" suppressHydrationWarning={true}>
      <head>
        {/* Google Tag Manager - Head */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-YOUR_CONTAINER_ID');
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "হিলফুল-ফুযুল প্রকাশনী",
              "url": process.env.NEXT_PUBLIC_BASE_URL || 'https://hilfulfuzul.com',
              "logo": process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/logo.png` : 'https://hilfulfuzul.com/logo.png',
              "description": "বাংলাদেশের অন্যতম বৃহত্তম ইসলামিক বইয়ের অনলাইন স্টোর",
              "address": {
                "@type": "PostalAddress",
                "addressCountry": "BD",
                "addressLocality": "ঢাকা"
              },
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "customer service",
                "availableLanguage": "Bengali"
              },
              "sameAs": [
                "https://www.facebook.com/hilfulfuzul",
                "https://www.instagram.com/hilfulfuzul"
              ]
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "হিলফুল-ফুযুল প্রকাশনী",
              "url": process.env.NEXT_PUBLIC_BASE_URL || 'https://hilfulfuzul.com',
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": `${process.env.NEXT_PUBLIC_BASE_URL || 'https://hilfulfuzul.com'}/search?q={search_term_string}`
                },
                "query-input": "required name=search_term_string"
              }
            }),
          }}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <meta name="google-site-verification" content="NRDv5IIanbFYiXrx_T0quveONB-zMLkP7U8E_H8X1p4" />
        
        {/* Google Analytics gtag.js */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-YOUR_MEASUREMENT_ID"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-YOUR_MEASUREMENT_ID');
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Google Tag Manager - Body (noscript) */}
        <noscript
          dangerouslySetInnerHTML={{
            __html: `
              <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-YOUR_CONTAINER_ID"
              height="0" width="0" style="display:none;visibility:hidden"></iframe>
            `,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
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
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
