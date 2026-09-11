"use client";

import { useEffect, useRef, useState } from "react";

const SLIDE_INTERVAL_MS = 4000;

/** Cycles through a list of ad banner images with a soft crossfade — used
 * both for a single sponsor's own multiple banner images, and for rotating
 * through several different sponsors sharing one slot (e.g. the generic
 * "card"-placement pool shown inside a mandapam's detail card), so no ad
 * placement is permanently fixed to one advertiser. */
export default function AdBannerSlideshow({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const id = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % images.length;
      setIndex(indexRef.current);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [images.length]);

  return (
    <div className="relative h-full w-full">
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={alt}
          // object-contain, not object-cover — the slot mixes 16:9 (a
          // mandapam's own banner) and 1:1 (generic sponsor ads) uploads,
          // and cover would crop into whichever one doesn't match this
          // box's shape instead of showing the complete image.
          className="absolute inset-0 h-full w-full object-contain transition-opacity duration-700"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
