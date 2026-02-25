import { Metadata } from "next";
import AllBlogs from "@/components/admin/blog/AllBlogs";

export const metadata: Metadata = {
  title: "সাম্প্রতিক ব্লগ পোস্ট - কিতাবঘর | হিলফুল ফুজুল",
  description:
    "কিতাবঘরের সর্বশেষ ব্লগ পোস্টসমূহ পড়ুন। ইসলামিক বই, আধ্যাত্মিক জ্ঞান, জীবনঘনিষ্ঠ আলোচনা ও সমসাময়িক ইসলামিক বিষয় নিয়ে নিয়মিত আপডেট।",
  keywords: [
    "ব্লগ",
    "কিতাবঘর",
    "ইসলামিক বই",
    "হিলফুল ফুজুল",
    "ইসলামী জ্ঞান",
    "আধ্যাত্মিক আলোচনা",
    "ইসলামিক ব্লগ",
    "ধর্মীয় লেখা",
  ],

  metadataBase: new URL("https://hilfulfujulbd.com"),
  alternates: {
    canonical: "/kitabghor/blogs",
    languages: {
      "bn-BD": "/kitabghor/blogs",
    },
  },

  authors: [{ name: "কিতাবঘর - হিলফুল ফুজুল" }],
  creator: "কিতাবঘর - হিলফুল ফুজুল",
  publisher: "কিতাবঘর - হিলফুল ফুজুল",

  openGraph: {
    title: "সাম্প্রতিক ব্লগ পোস্ট - কিতাবঘর",
    description:
      "ইসলামিক বই, আধ্যাত্মিক জ্ঞান এবং জীবনমুখী আলোচনা নিয়ে কিতাবঘরের সাম্প্রতিক ব্লগ পোস্টসমূহ।",
    url: "https://hilfulfujulbd.com/kitabghor/blogs",
    siteName: "কিতাবঘর - হিলফুল ফুজুল",
    type: "website",
    locale: "bn_BD",
    images: [
      {
        url: "https://hilfulfujulbd.com/images/books-collection.jpg",
        width: 1200,
        height: 630,
        alt: "কিতাবঘর ব্লগ - ইসলামিক বই ও জ্ঞানের সমাহার",
      },
    ],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  verification: {
    google: "your-google-verification-code",
  },

  category: "Islamic Blog",
};

export default function BlogsPage() {
  return (
    <>
      {/* Blog Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            "@id": "https://hilfulfujulbd.com/kitabghor/blogs",
            name: "কিতাবঘর ব্লগ",
            description:
              "ইসলামিক বই, আধ্যাত্মিক জ্ঞান ও জীবনমুখী আলোচনাসহ কিতাবঘরের সাম্প্রতিক ব্লগ পোস্টসমূহ।",
            url: "https://hilfulfujulbd.com/kitabghor/blogs",
            inLanguage: "bn-BD",
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
            author: {
              "@type": "Organization",
              name: "কিতাবঘর - হিলফুল ফুজুল",
            },
          }),
        }}
      />

      {/* Website Schema */}
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
                "https://hilfulfujulbd.com/search?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />

      {/* Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
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
                name: "ব্লগসমূহ",
                item: "https://hilfulfujulbd.com/kitabghor/blogs",
              },
            ],
          }),
        }}
      />

      <div className="space-y-6">
        <AllBlogs />
      </div>
    </>
  );
}
