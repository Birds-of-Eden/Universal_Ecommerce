// app/kitabghor/books/page.tsx
import { Metadata } from "next";
import BooksPageClient from "./BooksClient";

export const metadata: Metadata = {
  title: "সকল বই - কিতাবঘর | হিলফুল ফুজুল",
  description:
    "কিতাবঘরের সকল ইসলামিক বইয়ের সংগ্রহ। আকিদা, ফিকহ, সীরাত, আধ্যাত্মিকতা ও সমসাময়িক ইসলামিক বই খুঁজে নিন।",
  keywords: [
    "সকল বই",
    "ইসলামিক বই",
    "কিতাবঘর",
    "হিলফুল ফুজুল",
    "ইসলামিক লাইব্রেরি",
    "বাংলা ইসলামিক বই",
    "ইসলামিক শপ",
  ],

  metadataBase: new URL("https://hilfulfujulbd.com"),

  alternates: {
    canonical: "/kitabghor/books",
    languages: {
      "bn-BD": "/kitabghor/books",
    },
  },

  openGraph: {
    title: "সকল বই - কিতাবঘর",
    description:
      "কিতাবঘরের সম্পূর্ণ ইসলামিক বইয়ের সংগ্রহ—সীরাত, ফিকহ, আকিদা, তাসাওউফসহ সব ক্যাটেগরি একসাথে।",
    url: "https://hilfulfujulbd.com/kitabghor/books",
    siteName: "কিতাবঘর - হিলফুল ফুজুল",
    locale: "bn_BD",
    type: "website",
    images: [
      {
        url: "https://hilfulfujulbd.com/images/logo.png",
        width: 1200,
        height: 630,
        alt: "কিতাবঘর ইসলামিক বই সংগ্রহ",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "সকল বই - কিতাবঘর",
    description:
      "ইসলামিক বইয়ের সমৃদ্ধ সংগ্রহ—আধ্যাত্মিকতা, আকিদা, ফিকহ ও সীরাতসহ বিভিন্ন বিষয়ের বই।",
    images: ["https://hilfulfujulbd.com/images/logo.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

export default function BooksPage() {
  return (
    <>
      {/* Schema.org: Books Collection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "সকল বই - কিতাবঘর",
            url: "https://hilfulfujulbd.com/kitabghor/books",
            description:
              "কিতাবঘরের সকল ইসলামিক বই—সীরাত, আকিদা, তাসাওউফ, ফিকহ, সমসাময়িক বইসহ সম্পূর্ণ সংগ্রহ।",
            inLanguage: "bn-BD",
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "হোম",
                  item: "https://hilfulfujulbd.com",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "কিতাবঘর",
                  item: "https://hilfulfujulbd.com/",
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: "সকল বই",
                  item: "https://hilfulfujulbd.com/kitabghor/books",
                },
              ],
            },
            publisher: {
              "@type": "Organization",
              name: "কিতাবঘর - হিলফুল ফুজুল",
              url: "https://hilfulfujulbd.com",
              logo: {
                "@type": "ImageObject",
                url: "https://hilfulfujulbd.com/logo.png",
                width: 512,
                height: 512,
              },
            },
          }),
        }}
      />

      {/* Website Search Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "কিতাবঘর",
            url: "https://hilfulfujulbd.com",
            potentialAction: {
              "@type": "SearchAction",
              target:
                "https://hilfulfujulbd.com/search?q={search_term}",
              "query-input": "required name=search_term",
            },
          }),
        }}
      />

      <BooksPageClient />
    </>
  );
}
