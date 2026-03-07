"use client";

import Image from "next/image";

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
  type: string;
}

interface PromotionBannerProps {
  banners: Banner[];
}

export default function PromotionBanner({ banners }: PromotionBannerProps) {
  const promotionBanner = banners
    .filter((b) => b.type === "PROMOTION")
    .sort((a, b) => a.position - b.position);

  if (!promotionBanner.length) return null;

  return (
    <div className="container pl-6 pr-6">
      {promotionBanner.map((banner) => (
        <div
          key={banner.id}
          className="relative overflow-hidden rounded-xl border border-border card-theme shadow-sm hover:shadow-md transition"
        >
          <div className="relative w-full h-[260px]">
            <Image
              src={banner.image}
              alt={banner.title}
              fill
              className="object-cover"
            />
          </div>

          {(banner.title || banner.buttonText) && (
            <div className="absolute inset-0 flex flex-col justify-end bg-forground p-6">
              {banner.buttonText && banner.buttonLink && (
                <a
                  href={banner.buttonLink}
                  className="mt-3 inline-block btn-primary px-5 py-2 rounded-md text-sm"
                >
                  {banner.buttonText}
                </a>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
