import Link from "next/link";

interface BrandProps {
  tagline?: boolean;
  size?: "sm" | "lg";
  /** "light" for sitting on the dark night-sky sections (homepage hero),
   * "dark" (default) for every cream page. */
  tone?: "light" | "dark";
}

// The Navaratri Utsav wordmark + lotus mark, shared by every top bar across
// the site so the brand reads identically on the hero, the map, and every
// form. Always links back to the homepage, like any site logo.
export default function Brand({ tagline = false, size = "sm", tone = "dark" }: BrandProps) {
  // The small size shrinks further on phones so the wordmark stays on one
  // line next to the top bar's buttons.
  const markSize = size === "lg" ? "h-11 w-11" : "h-7 w-7 sm:h-9 sm:w-9";
  const nameSize = size === "lg" ? "text-2xl" : "text-[0.95rem] sm:text-lg";
  const nameColor = tone === "light" ? "text-[#fff6e6]" : "text-[color:var(--foreground)]";
  const taglineColor = tone === "light" ? "text-[#f3d9a8]/80" : "text-[color:var(--muted)]";

  return (
    <Link href="/" className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
      <LotusMark className={`${markSize} flex-shrink-0`} />
      <div className="leading-none">
        <p className={`whitespace-nowrap font-display ${nameSize} font-bold tracking-tight ${nameColor}`}>Navaratri Utsav</p>
        {tagline && (
          <p className={`mt-1 hidden text-[0.55rem] font-semibold uppercase tracking-[0.2em] sm:block ${taglineColor}`}>
            People · Pandals · Culture
          </p>
        )}
      </div>
    </Link>
  );
}

/** Stylised lotus — saffron-to-crimson petals around a gold centre. */
export function LotusMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="lotus-petal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6b63e" />
          <stop offset="1" stopColor="#d2262f" />
        </linearGradient>
      </defs>
      <g fill="url(#lotus-petal)" stroke="#fff3d6" strokeWidth="1" strokeLinejoin="round">
        <path d="M24 6c5 6 6 14 0 24-6-10-5-18 0-24Z" />
        <path d="M10 14c7 1 12 7 13 16-9-1-14-7-13-16Z" />
        <path d="M38 14c-7 1-12 7-13 16 9-1 14-7 13-16Z" />
        <path d="M3 26c7-2 14 1 19 6-7 3-14 1-19-6Z" />
        <path d="M45 26c-7-2-14 1-19 6 7 3 14 1 19-6Z" />
      </g>
      <path d="M8 36c5 4 27 4 32 0" fill="none" stroke="#f6b63e" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="24" cy="30" r="2.6" fill="#f5cd78" />
    </svg>
  );
}
