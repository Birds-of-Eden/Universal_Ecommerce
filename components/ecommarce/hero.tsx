"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Banner {
  id: number;
  title: string;
  image: string;
  type: string;
  position: number;
  isActive: boolean;
}

export default function Hero({ 
  heroInterval = 5000,
  banner1Interval = 3000,
  banner2Interval = 4000 
}) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }
  }, []);

  /* ================= FETCH ================= */
  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/banners", { cache: "no-store" });
      const data = await res.json();
      setBanners(data.filter((b: Banner) => b.isActive));
    };
    load();
  }, []);

  /* ================= SPLIT ================= */
  const heroSlides = useMemo(
    () =>
      banners
        .filter((b) => b.type === "HERO")
        .sort((a, b) => a.position - b.position),
    [banners]
  );

  const banner1Slides = useMemo(
    () =>
      banners
        .filter((b) => b.type === "BANNER1")
        .sort((a, b) => a.position - b.position),
    [banners]
  );

  const banner2Slides = useMemo(
    () =>
      banners
        .filter((b) => b.type === "BANNER2")
        .sort((a, b) => a.position - b.position),
    [banners]
  );

  const [currentBanner1, setCurrentBanner1] = useState(0);
  const [currentBanner2, setCurrentBanner2] = useState(0);
  const banner1TimerRef = useRef<NodeJS.Timeout | null>(null);
  const banner2TimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-slide for BANNER1
  useEffect(() => {
    if (banner1Slides.length <= 1) return;

    banner1TimerRef.current = setInterval(() => {
      setCurrentBanner1((prev) => (prev + 1) % banner1Slides.length);
    }, banner1Interval);

    return () => {
      if (banner1TimerRef.current) clearInterval(banner1TimerRef.current);
    };
  }, [banner1Slides, banner1Interval]);

  // Auto-slide for BANNER2
  useEffect(() => {
    if (banner2Slides.length <= 1) return;

    banner2TimerRef.current = setInterval(() => {
      setCurrentBanner2((prev) => (prev + 1) % banner2Slides.length);
    }, banner2Interval);

    return () => {
      if (banner2TimerRef.current) clearInterval(banner2TimerRef.current);
    };
  }, [banner2Slides, banner2Interval]);

  const hasSideBanners = banner1Slides.length > 0 || banner2Slides.length > 0;

  /* ================= AUTO SLIDE ================= */
  useEffect(() => {
    if (heroSlides.length <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % heroSlides.length);
    }, heroInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [heroSlides, heroInterval]);

  if (heroSlides.length === 0) return null;

  return (
    <section className="w-full bg-muted/30 dark:bg-background">
      <div className="w-full p-6">
        <div className={`grid ${hasSideBanners ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-8 items-stretch`}>
          
          {/* ================= LEFT HERO ================= */}
          <div className={`relative ${hasSideBanners ? 'lg:col-span-2' : 'h-screen'} rounded-xl overflow-hidden`}>
            {heroSlides.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  index === current ? "opacity-100" : "opacity-0"
                }`}
              >
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  priority={index === 0}
                  className="object-cover"
                />
              </div>
            ))}

            {/* Slider Dots */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
              {heroSlides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === current
                      ? "w-8 bg-primary"
                      : "w-3 bg-white/60 dark:bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* ================= RIGHT SIDE ================= */}
          {hasSideBanners && (
            <div className="flex flex-col gap-8">
              
              {banner1Slides.length > 0 && (
                <div className="relative h-[245px] rounded-xl overflow-hidden shadow-xl">
                  {banner1Slides.map((banner, index) => (
                    <div
                      key={banner.id}
                      className={`absolute inset-0 transition-opacity duration-1000 ${
                        index === currentBanner1 ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <Link href="#">
                        <Image
                          src={banner.image}
                          alt={banner.title}
                          fill
                          className="object-cover"
                        />
                      </Link>
                    </div>
                  ))}

                  {/* BANNER1 Slider Dots */}
                  {banner1Slides.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                      {banner1Slides.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentBanner1(i)}
                          className={`h-1.5 rounded-full transition-all ${
                            i === currentBanner1
                              ? "w-6 bg-primary"
                              : "w-2 bg-white/60 dark:bg-white/40"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {banner2Slides.length > 0 && (
                <div className="relative h-[245px] rounded-xl overflow-hidden shadow-xl">
                  {banner2Slides.map((banner, index) => (
                    <div
                      key={banner.id}
                      className={`absolute inset-0 transition-opacity duration-1000 ${
                        index === currentBanner2 ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <Link href="#">
                        <Image
                          src={banner.image}
                          alt={banner.title}
                          fill
                          className="object-cover"
                        />
                      </Link>
                    </div>
                  ))}

                  {/* BANNER2 Slider Dots */}
                  {banner2Slides.length > 1 && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
                      {banner2Slides.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentBanner2(i)}
                          className={`h-1.5 rounded-full transition-all ${
                            i === currentBanner2
                              ? "w-6 bg-primary"
                              : "w-2 bg-white/60 dark:bg-white/40"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}