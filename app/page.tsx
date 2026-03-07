"use client";

import { useEffect, useMemo, useState, memo } from "react";
import CategoryBooks from "@/components/ecommarce/category-books";
import Hero from "@/components/ecommarce/hero";
import Header from "@/components/ecommarce/header";
import Footer from "@/components/ecommarce/footer";
import FeaturedCategories from "@/components/ecommarce/FeaturedCategories";
import FeaturedProducts from "@/components/ecommarce/FeaturedProducts";
import PopupBanner from "@/components/ecommarce/PopupBanner";
import FeatureStrip from "@/components/ecommarce/FeatureCard";
import NewArrivals from "@/components/ecommarce/NewArrivals";
import BestSelling from "@/components/ecommarce/BestSelling";
import { useSession } from "@/lib/auth-client";
import { cachedFetchJson } from "@/lib/client-cache-fetch";

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
  writer: { id: number; name: string } | null;
  publisher: { id: number; name: string } | null;
  image: string;
  stock?: number;
  available?: boolean;
  deleted?: boolean;
  ratingAvg?: number;
  ratingCount?: number;
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

interface SiteSettings {
  logo?: string | null;
  siteTitle?: string | null;
  footerDescription?: string | null;
  contactNumber?: string | null;
  contactEmail?: string | null;
  address?: string | null;
  facebookLink?: string | null;
  instagramLink?: string | null;
  twitterLink?: string | null;
  tiktokLink?: string | null;
  youtubeLink?: string | null;
}

const toNumber = (value: unknown) => {
  const num =
    typeof value === "string" ? Number(value.replace(/,/g, "")) : Number(value);
  return Number.isFinite(num) ? num : 0;
};

const computeStock = (variants: any[] | null | undefined) => {
  const list = Array.isArray(variants) ? variants : [];
  if (!list.length) return 0;
  return list.reduce((sum, variant) => sum + toNumber(variant?.stock), 0);
};

const DataProvider = memo(function DataProvider({
  children,
}: {
  children: (data: {
    categories: Category[];
    allProducts: Product[];
    ratings: Record<string, RatingInfo>;
    banners: Banner[];
    rawCategories: any[];
    rawProducts: any[];
    rawReviews: any[];
    topSellingProducts: any[];
    siteSettings: SiteSettings;
    loading: boolean;
    error: string | null;
  }) => React.ReactNode;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [ratings, setRatings] = useState<Record<string, RatingInfo>>({});
  const [banners, setBanners] = useState<Banner[]>([]);
  const [rawCategories, setRawCategories] = useState<any[]>([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);
  const [rawReviews, setRawReviews] = useState<any[]>([]);
  const [topSellingProducts, setTopSellingProducts] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          categoriesData,
          productsData,
          bannersData,
          reviewsData,
          topSellingData,
          siteData,
        ] = await Promise.all([
          cachedFetchJson<any[]>("/api/categories", { ttlMs: 5 * 60 * 1000 }),
          cachedFetchJson<any[]>("/api/products", { ttlMs: 2 * 60 * 1000 }),
          cachedFetchJson<any[]>("/api/banners", { ttlMs: 2 * 60 * 1000 }),
          cachedFetchJson<any>("/api/reviews", { ttlMs: 60 * 1000 }),
          cachedFetchJson<any[]>("/api/products/top-selling", {
            ttlMs: 2 * 60 * 1000,
          }),
          cachedFetchJson<SiteSettings>("/api/site", { ttlMs: 5 * 60 * 1000 }),
        ]);

        const mappedProducts: Product[] = (
          Array.isArray(productsData) ? productsData : []
        ).map((product: any) => {
          const price = toNumber(product?.basePrice ?? product?.price);
          const original = toNumber(
            product?.originalPrice ?? product?.original_price ?? price,
          );
          const discount =
            original > 0 && price < original
              ? Math.round(((original - price) / original) * 100)
              : 0;

          return {
            id: toNumber(product?.id),
            name: String(product?.name ?? "Untitled Product"),
            category: {
              id: toNumber(product?.category?.id ?? product?.categoryId),
              name: String(product?.category?.name ?? "Uncategorized"),
            },
            price,
            original_price: original,
            discount,
            writer: product?.writer
              ? {
                  id: toNumber(product.writer.id),
                  name: String(product.writer.name ?? "Unknown Writer"),
                }
              : null,
            publisher: product?.publisher
              ? {
                  id: toNumber(product.publisher.id),
                  name: String(product.publisher.name ?? "Unknown Publisher"),
                }
              : null,
            image: String(product?.image ?? "/placeholder.svg"),
            stock: computeStock(product?.variants),
            available: Boolean(product?.available ?? true),
            deleted: Boolean(product?.deleted ?? false),
            ratingAvg: toNumber(product?.ratingAvg),
            ratingCount: toNumber(product?.ratingCount),
          };
        });

        const ratingsMap: Record<string, RatingInfo> = {};
        mappedProducts.forEach((product) => {
          ratingsMap[String(product.id)] = {
            averageRating: toNumber(product.ratingAvg),
            totalReviews: toNumber(product.ratingCount),
          };
        });

        const productCategoryIds = new Set(
          mappedProducts
            .map((product) => Number(product.category?.id))
            .filter((id) => Number.isFinite(id) && id > 0),
        );

        const mappedCategories: Category[] = (
          Array.isArray(categoriesData) ? categoriesData : []
        )
          .map((category: any) => ({
            id: toNumber(category?.id),
            name: String(category?.name ?? ""),
            productCount: toNumber(category?.productCount),
          }))
          .filter(
            (category) =>
              category.id > 0 && productCategoryIds.has(category.id),
          );

        setCategories(mappedCategories);
        setAllProducts(mappedProducts);
        setRatings(ratingsMap);
        setBanners(
          (Array.isArray(bannersData) ? bannersData : []).filter(
            (banner) => banner.isActive,
          ),
        );
        setRawCategories(Array.isArray(categoriesData) ? categoriesData : []);
        setRawProducts(Array.isArray(productsData) ? productsData : []);
        setRawReviews(
          Array.isArray(reviewsData?.reviews) ? reviewsData.reviews : [],
        );
        setTopSellingProducts(
          Array.isArray(topSellingData)
            ? topSellingData
            : Array.isArray((topSellingData as any)?.data)
              ? (topSellingData as any).data
              : [],
        );
        setSiteSettings(siteData ?? {});
      } catch (fetchError) {
        console.error(fetchError);
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
      rawCategories,
      rawProducts,
      rawReviews,
      topSellingProducts,
      siteSettings,
      loading,
      error,
    }),
    [
      categories,
      allProducts,
      ratings,
      banners,
      rawCategories,
      rawProducts,
      rawReviews,
      topSellingProducts,
      siteSettings,
      loading,
      error,
    ],
  );

  return <>{children(value)}</>;
});

DataProvider.displayName = "DataProvider";

export default function Home() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <div className="w-full">
      <div className="min-h-screen flex flex-col">
        <DataProvider>
          {(data) => (
            <>
              <Header
                siteSettingsData={data.siteSettings}
                productsData={data.rawProducts.map((p) => ({
                  id: p.id,
                  name: p.name,
                  image: p.image ?? null,
                }))}
                categoriesData={data.rawCategories.map((c) => ({
                  id: Number(c.id),
                  name: String(c.name ?? ""),
                  slug: String(c.slug ?? c.id),
                  image: c.image ?? null,
                  parentId:
                    c.parentId === null || c.parentId === undefined
                      ? null
                      : Number(c.parentId),
                }))}
              />
  
              <div className="container mx-auto">
                <Hero bannersData={data.banners} />
                <FeatureStrip />
                <FeaturedCategories categoriesData={data.rawCategories} />
                <NewArrivals
                  productsData={data.rawProducts}
                  categoriesData={data.rawCategories}
                  reviewsData={data.rawReviews}
                  isAuthenticated={isAuthenticated}
                />
                <FeaturedProducts
                  productsData={data.rawProducts}
                  categoriesData={data.rawCategories}
                  reviewsData={data.rawReviews}
                  isAuthenticated={isAuthenticated}
                />
                <BestSelling
                  limit={20}
                  topSellingData={data.topSellingProducts}
                  reviewsData={data.rawReviews}
                  isAuthenticated={isAuthenticated}
                />

                <PopupBanner banners={data.banners} />

                <div className="container mx-auto">
                  {data.error && (
                    <p className="text-destructive">{data.error}</p>
                  )}

                  {!data.loading &&
                    !data.error &&
                    data.categories.map((category) => (
                      <CategoryBooks
                        key={category.id}
                        category={category}
                        allProducts={data.allProducts}
                        ratings={data.ratings}
                        isAuthenticated={isAuthenticated}
                      />
                    ))}
                </div>
              </div>
              <Footer
                siteSettingsData={data.siteSettings}
                categoriesData={data.rawCategories}
              />
            </>
          )}
        </DataProvider>
      </div>
    </div>
  );
}
