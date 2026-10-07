"use client";

import { useEffect, useRef, useState } from "react";

const SLIDE_INTERVAL_MS = 4000;

/** Cycles through a list of ad banner images with a soft crossfade — used
 * both for a single sponsor's own multiple banner images, and for rotating
 * through several different sponsors sharing one slot (e.g. the generic
 * "card"-placement pool shown inside a listing's detail card), so no ad
 * placement is permanently fixed to one advertiser. */
export default function AdBannerSlideshow({
  images,
  alt,
  fit = "cover",
}: {
  images: string[];
  alt: string;
  /** "contain" only where the box is guaranteed to match the upload's own
   * aspect ratio (the listing-card banner slot, cropped to that exact
   * shape at upload) — showing the complete image there is free, since it
   * already fills the box either way. Everywhere else (the map ad slots)
   * the box's actual shape isn't guaranteed to match a square upload, so
   * "cover" (the default) fills it completely instead of leaving gaps. */
  fit?: "cover" | "contain";
}) {
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
          className={`absolute inset-0 h-full w-full transition-opacity duration-700 ${fit === "contain" ? "object-contain" : "object-cover"}`}
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
    </div>
  );
}
