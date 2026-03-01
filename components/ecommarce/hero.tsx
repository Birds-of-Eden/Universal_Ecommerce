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

export default function Hero({ interval = 5000 }) {
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

  const banner1 = useMemo(
    () => banners.find((b) => b.type === "BANNER1"),
    [banners]
  );

  const banner2 = useMemo(
    () => banners.find((b) => b.type === "BANNER2"),
    [banners]
  );

  /* ================= AUTO SLIDE ================= */
  useEffect(() => {
    if (heroSlides.length <= 1) return;

    timerRef.current = setInterval(() => {
      setCurrent((prev) => (prev + 1) % heroSlides.length);
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [heroSlides, interval]);

  if (heroSlides.length === 0) return null;

  return (
    <section className="w-full bg-muted/30 dark:bg-background">
      <div className="w-full p-6">
        <div className="grid lg:grid-cols-3 gap-8 items-stretch">
          
          {/* ================= LEFT HERO ================= */}
          <div className="lg:col-span-2 relative h-[350px] lg:h-[520px] rounded-xl overflow-hidden">
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
          <div className="flex flex-col gap-8">
            
            {banner1 && (
              <Link
                href="#"
                className="relative h-[245px] rounded-xl overflow-hidden shadow-xl"
              >
                <Image
                  src={banner1.image}
                  alt={banner1.title}
                  fill
                  className="object-cover"
                />
              </Link>
            )}

            {banner2 && (
              <Link
                href="#"
                className="relative h-[245px] rounded-xl overflow-hidden shadow-xl"
              >
                <Image
                  src={banner2.image}
                  alt={banner2.title}
                  fill
                  className="object-cover"
                />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}