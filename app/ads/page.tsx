import Link from "next/link";
import BackButton from "@/components/BackButton";
import Brand from "@/components/Brand";
import { ArrowRightIcon, HeartIcon, MapIcon, MegaphoneIcon, VerifiedIcon } from "@/components/icons";

export default function AdsChoicePage() {
  return (
    <div
      className="min-h-dvh w-full"
      style={{
        background:
          "radial-gradient(ellipse 70% 45% at 15% 0%, rgba(244,169,60,0.28), transparent 60%), radial-gradient(ellipse 60% 40% at 100% 8%, rgba(234,108,29,0.18), transparent 55%), linear-gradient(180deg, var(--cream-50), var(--cream-200) 45%, var(--cream-100))",
      }}
    >
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-4 sm:px-6">
        <nav className="nav-shell flex items-center gap-4 px-4 py-2.5 sm:px-5">
          <BackButton />
          <Brand />
        </nav>

        <div className="mt-10 text-center sm:mt-16">
          <p className="eyebrow">Publish Ads</p>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-[color:var(--foreground)] sm:text-4xl">
            Where should your ad show up?
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base text-[color:var(--muted)]">
            Every payment covers 2 days of display, reviewed before it goes live.
          </p>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Link href="/sponsor" className="card-elevated group flex flex-col p-6 transition-transform hover:-translate-y-1 sm:p-8">
            <div className="flex items-center justify-between">
              <span className="icon-tile icon-tile-circle h-12 w-12">
                <MapIcon className="h-6 w-6" />
              </span>
              <span className="rounded-full bg-[rgba(234,108,29,0.14)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[color:var(--accent-deep)]">
                ₹500 / 2 days
              </span>
            </div>
            <h2 className="mt-5 text-xl font-bold text-[color:var(--foreground)]">Advertise on the map</h2>
            <p className="mt-2 flex-1 text-sm text-[color:var(--muted)]">
              Your banner shows in the sponsored slots on the map screen — seen by everyone browsing, even before
              they click on a mandapam.
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
              <span className="rounded-full bg-[rgba(234,108,29,0.14)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[color:var(--accent-deep)]">
                ₹200 / 2 days
              </span>
            </div>
            <h2 className="mt-5 text-xl font-bold text-[color:var(--foreground)]">Advertise on a mandapam card</h2>
            <p className="mt-2 flex-1 text-sm text-[color:var(--muted)]">
              Your banner shows only on one mandapam&apos;s own card — seen by people who open that specific
              Annadhanam. Less reach, so it costs less.
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
