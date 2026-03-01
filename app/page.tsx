"use client";

import { useEffect, useState, useMemo, memo } from "react";
import CategoryBooks from "@/components/ecommarce/category-books";
import Hero from "@/components/ecommarce/hero";
import Header from "@/components/ecommarce/header";
import Footer from "@/components/ecommarce/footer";
import Head from "next/head";
import Image from "next/image";
import FeaturedCategories from "@/components/ecommarce/FeaturedCategories";

type Category = {
  id: number;
  name: string;
  productCount: number;
};

type Product = {
  id: number;
  name: string;
  category: { id: number; name: string };
  price: number;
  original_price: number;
  discount: number;
  writer: { id: number; name: string };
  publisher: { id: number; name: string };
  image: string;
  stock?: number;
  available?: boolean;
  deleted?: boolean;
};

interface RatingInfo {
  averageRating: number;
  totalReviews: number;
}

interface Banner {
  id: number;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  image: string;
  mobileImage?: string | null;
  buttonText?: string | null;
  buttonLink?: string | null;
  position: number;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  type: "HERO" | "BANNER1" | "BANNER2" | "POPUP";
}

const DataProvider = memo(function DataProvider({
  children,
}: {
  children: (data: {
    categories: Category[];
    allProducts: Product[];
    ratings: Record<string, RatingInfo>;
    banners: Banner[];
    loading: boolean;
    error: string | null;
  }) => React.ReactNode;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [ratings, setRatings] = useState<Record<string, RatingInfo>>({});
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [categoriesRes, productsRes, bannersRes] = await Promise.all([
          fetch("/api/categories", { cache: "force-cache" }),
          fetch("/api/products", { cache: "force-cache" }),
          fetch("/api/banners", { cache: "no-store" }),
        ]);

        if (!categoriesRes.ok) throw new Error("Failed to fetch categories");
        if (!productsRes.ok) throw new Error("Failed to fetch products");
        if (!bannersRes.ok) throw new Error("Failed to fetch banners");

        const categoriesData: Category[] = await categoriesRes.json();
        const productsData: Product[] = await productsRes.json();
        const bannersData: Banner[] = await bannersRes.json();

        const productIds = productsData.slice(0, 20).map((p) => p.id);

        const ratingResults = await Promise.all(
          productIds.map(async (id) => {
            try {
              const ratingRes = await fetch(
                `/api/reviews?productId=${id}&page=1&limit=1`
              );
              if (!ratingRes.ok) return { id, avg: 0, total: 0 };
              const ratingData = await ratingRes.json();
              return {
                id,
                avg: Number(ratingData.averageRating ?? 0),
                total: Number(ratingData.pagination?.total ?? 0),
              };
            } catch {
              return { id, avg: 0, total: 0 };
            }
          })
        );

        const ratingsMap: Record<string, RatingInfo> = {};
        ratingResults.forEach(({ id, avg, total }) => {
          ratingsMap[String(id)] = {
            averageRating: avg,
            totalReviews: total,
          };
        });

        setCategories(categoriesData);
        setAllProducts(productsData);
        setRatings(ratingsMap);
        setBanners(bannersData.filter((b) => b.isActive));
      } catch (err) {
        console.error(err);
        setError("Data load korte problem hocche");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const value = useMemo(
    () => ({
      categories,
      allProducts,
      ratings,
      banners,
      loading,
      error,
    }),
    [categories, allProducts, ratings, banners, loading, error]
  );

  return <>{children(value)}</>;
});

DataProvider.displayName = "DataProvider";

export default function Home() {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <>
      <Head>
        <title>
          হিলফুল-ফুযুল প্রকাশনী | ইসলামিক বইয়ের অনলাইন বিক্রেতা - বাংলাদেশ
        </title>
      </Head>

      <div className="w-full">
        <div className="min-h-screen flex flex-col">
          <Header />
          <Hero />
         <div className="mt-10 mb-10 p-5">
           <FeaturedCategories />
         </div>
          <DataProvider>
            {(data) => {
              const popupBanner = data.banners.find(
                (b) => b.type === "POPUP"
              );

              useEffect(() => {
                if (popupBanner) {
                  const timer = setTimeout(() => {
                    setShowPopup(true);
                  }, 1500);
                  return () => clearTimeout(timer);
                }
              }, [popupBanner]);

              return (
                <>
                  {/* POPUP MODAL */}
                  {showPopup && popupBanner && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-4">
                        <button
                          onClick={() => setShowPopup(false)}
                          className="absolute top-2 right-2 text-gray-600 hover:text-black text-xl"
                        >
                          ✕
                        </button>

                        <div className="relative w-full h-80">
                          <Image
                            src={popupBanner.image}
                            alt={popupBanner.title}
                            fill
                            className="object-contain rounded"
                          />
                        </div>

                        {popupBanner.buttonText &&
                          popupBanner.buttonLink && (
                            <div className="mt-4 text-center">
                              <a
                                href={popupBanner.buttonLink}
                                className="inline-block bg-primary text-white px-6 py-2 rounded-md"
                              >
                                {popupBanner.buttonText}
                              </a>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                  <div className="container mx-auto">
                    {data.loading && <p>Loading categories...</p>}
                    {data.error && (
                      <p className="text-red-500">{data.error}</p>
                    )}
                    {!data.loading &&
                      !data.error &&
                      data.categories.map((category) => (
                        <CategoryBooks
                          key={category.id}
                          category={category}
                          allProducts={data.allProducts}
                          ratings={data.ratings}
                        />
                      ))}
                  </div>
                </>
              );
            }}
          </DataProvider>

          <Footer />
        </div>
      </div>
    </>
  );
}