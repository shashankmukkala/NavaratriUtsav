import Link from "next/link";
import BackButton from "@/components/BackButton";
import Brand from "@/components/Brand";
import ProfileNavLink from "@/components/ProfileNavLink";
import {
  ArrowRightIcon,
  CalendarIcon,
  HeartIcon,
  MapIcon,
  MegaphoneIcon,
  PinIcon,
  SparkleIcon,
  UsersIcon,
  VerifiedIcon,
} from "@/components/icons";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Without this the page is prerendered once at build time, freezing the
// prices below until the next deploy — so an admin price change wouldn't
// show here (while /sponsor, which fetches live, already showed the new
// one). Re-read at most once a minute, same as the listings cache.
export const revalidate = 60;

const BENEFITS = [
  {
    icon: <UsersIcon className="h-5 w-5" />,
    title: "Reach festival-goers",
    text: "People actively planning which events to attend.",
  },
  {
    icon: <PinIcon className="h-5 w-5" />,
    title: "Hyper-local audience",
    text: "Be seen by visitors browsing near your business.",
  },
  {
    icon: <CalendarIcon className="h-5 w-5" />,
    title: "Peak-season visibility",
    text: "Show up during the busiest nine nights of the year.",
  },
  {
    icon: <SparkleIcon className="h-5 w-5" />,
    title: "Eye-catching placements",
    text: "Map slots, listing cards or a flying banner.",
  },
  {
    icon: <MegaphoneIcon className="h-5 w-5" />,
    title: "Affordable and flexible",
    text: "Short 2-day slots, no long-term commitment.",
  },
  {
    icon: <HeartIcon className="h-5 w-5" />,
    title: "Support the community",
    text: "Your ad keeps the festival map free for all.",
  },
];

export default async function AdsChoicePage() {
  // Server component, so this reads the live prices directly rather than
  // adding a client-side fetch waterfall for two numbers.
  // Falls back to the default prices if the database is unreachable or not
  // configured, so the page still opens instead of erroring.
  let settings: { map_ad_price: number | null; card_ad_price: number | null; crow_ad_price: number | null } | null = null;
  try {
    const { data } = await supabaseAdmin()
      .from("payment_settings")
      .select("map_ad_price, card_ad_price, crow_ad_price")
      .eq("id", true)
      .single();
    settings = data;
  } catch (error) {
    console.warn("Could not load ad prices, using defaults:", error);
  }
  const mapAdPrice = settings?.map_ad_price ?? 500;
  const cardAdPrice = settings?.card_ad_price ?? 200;
  const crowAdPrice = settings?.crow_ad_price ?? 300;

  return (
    <div className="theme-wine w-full">
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-4 sm:px-6">
        <nav className="nav-shell flex items-center justify-between gap-4 px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-4">
            <BackButton />
            <Brand />
          </div>
          <ProfileNavLink />
        </nav>

        <section className="mt-10 sm:mt-16">
          <div className="text-center">
            <p className="eyebrow">Publish Ads · Why partner with us</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[color:var(--foreground)] sm:text-4xl">
              Benefits of advertising with Navaratri Utsav
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm text-[color:var(--muted)] sm:text-base">
              Put your brand in front of people at the exact moment they&apos;re planning where to go this Navratri.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map(({ icon, title, text }) => (
              // Frosted glass on the wine backdrop (like the location pill),
              // so these read as supporting points rather than as more of the
              // solid, clickable ad-option cards below.
              <div
                key={title}
                className="flex items-center gap-3.5 rounded-2xl border border-[rgba(255,246,230,0.16)] bg-[rgba(255,246,230,0.06)] p-4 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.6)] backdrop-blur-md transition-colors hover:border-[rgba(232,169,58,0.45)] hover:bg-[rgba(255,246,230,0.1)]"
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffe4a8,#e8a93a)] text-[color:var(--utsav-crimson-deep)]">
                  {icon}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[color:var(--foreground)] sm:text-base">{title}</h3>
                  <p className="mt-0.5 text-xs text-[color:var(--muted)] sm:text-sm">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-16 text-center">
          <p className="eyebrow">Choose a placement</p>
          <h2 className="mt-3 text-2xl font-extrabold leading-tight tracking-tight text-[color:var(--foreground)] sm:text-3xl">
            Where should your ad show up?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-[color:var(--muted)] sm:text-base">
            Every payment covers 2 days of display, reviewed before it goes live.
          </p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/sponsor" className="card-elevated group flex flex-col p-6 transition-transform hover:-translate-y-1 sm:p-8">
            <div className="flex items-center justify-between">
              <span className="icon-tile icon-tile-circle h-12 w-12">
                <MapIcon className="h-6 w-6" />
              </span>
              <span className="rounded-full bg-[rgba(184,50,31,0.14)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[color:var(--accent-deep)]">
                ₹{mapAdPrice} / 2 days
              </span>
            </div>
            <h2 className="mt-5 text-xl font-bold text-[color:var(--foreground)]">Advertise on the map</h2>
            <p className="mt-2 flex-1 text-sm text-[color:var(--muted)]">
              Your banner shows in the sponsored slots on the map screen — seen by everyone browsing, even before
              they open a pandal, dandiya night or event.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--accent-deep)]">
              Advertise now
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          <Link href="/sponsor?target=pandal" className="card-elevated group flex flex-col p-6 transition-transform hover:-translate-y-1 sm:p-8">
            <div className="flex items-center justify-between">
              <span className="icon-tile icon-tile-circle h-12 w-12">
                <MegaphoneIcon className="h-6 w-6" />
              </span>
              <span className="rounded-full bg-[rgba(184,50,31,0.14)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[color:var(--accent-deep)]">
                ₹{cardAdPrice} / 2 days
              </span>
            </div>
            <h2 className="mt-5 text-xl font-bold text-[color:var(--foreground)]">Advertise on listing cards</h2>
            <p className="mt-2 flex-1 text-sm text-[color:var(--muted)]">
              Your banner shows inside pandal, dandiya and event detail cards — seen by people who open one to check details. Less
              reach than the map, so it costs less.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--accent-deep)]">
              Advertise now
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          <Link href="/sponsor?target=crow" className="card-elevated group flex flex-col p-6 transition-transform hover:-translate-y-1 sm:p-8">
            <div className="flex items-center justify-between">
              <span className="icon-tile icon-tile-circle h-12 w-12 text-xl">★</span>
              <span className="rounded-full bg-[rgba(184,50,31,0.14)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[color:var(--accent-deep)]">
                ₹{crowAdPrice} / 2 days
              </span>
            </div>
            <h2 className="mt-5 text-xl font-bold text-[color:var(--foreground)]">Flying ad</h2>
            <p className="mt-2 flex-1 text-sm text-[color:var(--muted)]">
              Your banner trails behind a crow or rocket making a pass across the map every so often — the most
              eye-catching placement, premium priced to match.
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--accent-deep)]">
              Advertise now
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-[color:var(--muted)]">
          <span className="inline-flex items-center gap-2">
            <VerifiedIcon className="h-4 w-4 text-[color:var(--accent-deep)]" />
            Every ad is reviewed before it goes live
          </span>
          <span className="inline-flex items-center gap-2">
            <HeartIcon className="h-4 w-4 text-[color:var(--accent-deep)]" />
            Ads help keep the map free for everyone
          </span>
        </div>
      </div>
    </div>
  );
}
