import Link from "next/link";

interface BrandProps {
  tagline?: boolean;
  size?: "sm" | "lg";
}

// The BappaSeva wordmark + Ganesha mark, shared by every top bar across the
// site so the brand reads identically on the hero, the map, and every form.
// Always links back to the homepage, like any site logo.
export default function Brand({ tagline = false, size = "sm" }: BrandProps) {
  const iconBox = size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const iconSize = size === "lg" ? "h-7 w-7" : "h-6 w-6";
  const nameSize = size === "lg" ? "text-xl" : "text-sm";

  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span
        className={`flex ${iconBox} flex-shrink-0 items-center justify-center rounded-xl bg-[color:var(--cream-50)] shadow-[inset_0_0_0_1.5px_rgba(234,108,29,0.35)]`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/bappa-logo.png" alt="" className={`${iconSize} object-contain`} />
      </span>
      <div className="leading-tight">
        <p className={`${nameSize} font-extrabold tracking-tight text-[color:var(--foreground)]`}>BappaSeva</p>
        {tagline && (
          <p className="hidden text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)] sm:block">
            He brings us closer
          </p>
        )}
      </div>
    </Link>
  );
}
