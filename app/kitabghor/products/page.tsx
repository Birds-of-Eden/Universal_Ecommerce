// app/kitabghor/books/page.tsx
import { Metadata } from "next";
import ProductsPage from "./AllProducts";

export const metadata: Metadata = {
  title: "All Products - BOED E-COMMERCE",
  description:
    "Explore all products on BOED E-COMMERCE. Browse categories, compare prices, and shop your favorite items.",
  keywords: [
    "all products",
    "products",
    "BOED E-COMMERCE",
    "ecommerce",
    "online shop",
    "bangladesh ecommerce",
    "bdt products",
  ],

  metadataBase: new URL("http://localhost:3000/"),

  alternates: {
    canonical: "/kitabghor/products",
    languages: {
      "en-US": "/kitabghor/products",
    },
  },

  openGraph: {
    title: "All Products - BOED E-COMMERCE",
    description:
      "Discover BOED E-COMMERCE’s full product collection—shop by category, compare prices, and find the best deals.",
    url: "http://localhost:3000/kitabghor/products",
    siteName: "BOED E-COMMERCE",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "http://localhost:3000/images/logo.png",
        width: 1200,
        height: 630,
        alt: "BOED E-COMMERCE - All Products",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "All Products - BOED E-COMMERCE",
    description:
      "Browse BOED E-COMMERCE’s complete product collection—categories, pricing, and featured items.",
    images: ["http://localhost:3000/images/logo.png"],
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
      {/* Schema.org: Products Collection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: "All Products - BOED E-COMMERCE",
            url: "http://localhost:3000/kitabghor/books",
            description:
              "BOED E-COMMERCE all products collection—browse categories, compare prices, and shop confidently.",
            inLanguage: "en-US",
            breadcrumb: {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: "http://localhost:3000/",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "BOED E-COMMERCE",
                  item: "http://localhost:3000/",
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: "All Products",
                  item: "http://localhost:3000/kitabghor/books",
                },
              ],
            },
            publisher: {
              "@type": "Organization",
              name: "BOED E-COMMERCE",
              url: "http://localhost:3000/",
              logo: {
                "@type": "ImageObject",
                url: "http://localhost:3000/logo.png",
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
            name: "BOED E-COMMERCE",
            url: "http://localhost:3000/",
            potentialAction: {
              "@type": "SearchAction",
              target: "http://localhost:3000/search?q={search_term}",
              "query-input": "required name=search_term",
            },
          }),
        }}
      />

      <ProductsPage />
    </>
  );
}