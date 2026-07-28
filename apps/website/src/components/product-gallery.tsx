"use client";

import { useRef, useState } from "react";
import { BrandMark } from "@/components/brand-mark";

const SWIPE_THRESHOLD_PX = 40;

export function ProductGallery({
  images,
  brandName,
  brandLogoUrl,
  productName,
}: {
  images: string[];
  brandName: string;
  brandLogoUrl?: string | null;
  productName: string;
}) {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-950 p-6 text-center text-white shadow-sm">
        <BrandMark name={brandName} logoUrl={brandLogoUrl} size="lg" />
        <p className="text-xs uppercase tracking-widest text-sky-400">{brandName}</p>
        <p className="text-lg font-semibold">{productName}</p>
      </div>
    );
  }

  function go(next: number) {
    setIndex((next + images.length) % images.length);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta > SWIPE_THRESHOLD_PX) go(index - 1);
    else if (delta < -SWIPE_THRESHOLD_PX) go(index + 1);
    touchStartX.current = null;
  }

  return (
    <div>
      <div
        className="relative aspect-square w-full touch-pan-y overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- server-hosted upload URL */}
        <img
          src={images[index]}
          alt={`${brandName} ${productName} — photo ${index + 1} of ${images.length}`}
          className="h-full w-full object-cover"
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition-colors hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm transition-colors hover:bg-white"
            >
              ›
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i === index ? "bg-sky-600" : "bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {images.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`View photo ${i + 1}`}
              className={`aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
                i === index ? "border-sky-600" : "border-transparent hover:border-slate-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- server-hosted upload URL */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
