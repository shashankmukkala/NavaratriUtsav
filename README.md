# Annadhanam Map

A map where anyone can pin the location, timing, and details of a free
Ganesh Chaturthi annadhanam (community food offering) they're hosting at
their pandal, so people nearby know where to go and eat. Organizers or
sponsors can also pay to put a digital sponsor banner on a pandal's page —
the online equivalent of the physical banners put up around these events.

This is a deliberately simple version of that idea: no accounts, no
curated directory, no reviews — just pin, verify, and go eat.

## How it works

1. **Anyone submits a pandal** at `/submit` — no login required. They fill in
   the pandal name, organizer name, contact number, date, timing, a short
   description, an exact location (map picker: search, drag the pin, click
   the map, or use current location), and a required photo.
2. **The submission is pending** until an admin reviews it — it does not
   appear on the public map yet.
3. **An admin reviews it at `/admin`** (password-gated) and approves or
   rejects it. Approved pandals immediately show up as pins on the public map
   at `/`.
4. **Anyone can sponsor a banner** at `/sponsor` — pick an approved pandal,
   pay via UPI, upload a payment screenshot, and optionally upload a
   logo/banner image. This also goes into the admin queue; once approved, the
   sponsor's name/logo shows on that pandal's detail card.

There are no user accounts anywhere in this app — submission forms are the
only interface for the public, and `/admin` is the only gated page.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres for data, Storage for photos/proofs) — accessed only
  from server-side API routes with the service-role key. The browser never
  talks to Supabase directly.
- MapLibre GL rendering free [OpenFreeMap](https://openfreemap.org/) vector
  tiles, with [Nominatim](https://nominatim.org/) (OpenStreetMap) for address
  search and reverse geocoding — no paid map API, no API key at all.
- A single shared-secret admin login (no Supabase Auth) — see "Admin access"
  below.

## Project structure

```text
app/
  page.tsx                  Public map: pins, list view, pandal detail card
  submit/page.tsx           Public "add a pandal" form
  sponsor/page.tsx          Public "sponsor a banner" form + UPI info
  admin/page.tsx            Password-gated moderation queue
  api/
    pandals/                List approved pandals (GET), submit new (POST)
    sponsors/                List approved sponsors for a pandal (GET), submit new (POST)
    upload/                 Image upload -> Supabase Storage, returns public URL
    geocode/                Server-side Nominatim proxy (address search + reverse geocode)
    admin/
      login, logout, session   Admin cookie session
      pandals/                 Full list + approve/reject/delete (admin only)
      sponsors/                Full list + approve/reject/delete (admin only)

components/
  MapView.tsx               Public map with pandal pins (MapLibre GL + OpenFreeMap)
  LocationPicker.tsx         Map + Nominatim search box for picking a pandal's exact location
  PandalDetailCard.tsx      Pandal info card, including approved sponsor banners
  ImageUploadField.tsx      Shared file-upload input used by both forms

lib/
  supabaseAdmin.ts          Server-only Supabase client (service role)
  adminAuth.ts              Signed admin session cookie (HMAC, no DB session store)
  mapStyle.ts               OpenFreeMap style URL, default map center/zoom
  mapWorker.ts              Points MapLibre at the worker script copied into /public
  types.ts                  Pandal / Sponsor / GeocodeResult types

supabase/migrations/0001_init.sql   pandals + sponsors tables
scripts/setup-storage.mjs           Creates the public "uploads" storage bucket
scripts/copy-maplibre-worker.mjs    Copies MapLibre's worker script into /public (runs on npm install)
```

## Local setup

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com), then run
`supabase/migrations/0001_init.sql` in the SQL Editor.

The map itself needs no setup or API key — MapLibre GL renders free
OpenFreeMap tiles directly, and `/api/geocode` proxies Nominatim server-side.

### 2. Fill in `.env.local`

An `.env.local` file with empty values already exists at the project root
(see `.env.local.example` for the same list with descriptions). Fill in:

```text
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

ADMIN_PASSWORD=choose_a_strong_password
ADMIN_SESSION_SECRET=a_long_random_string
```

`SUPABASE_SERVICE_ROLE_KEY` is more sensitive than the anon key — it bypasses
row-level security entirely. It is only ever read in server-side API routes
and must never be prefixed `NEXT_PUBLIC_` or committed.

Generate `ADMIN_SESSION_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Create the storage bucket

```bash
node --env-file=.env.local scripts/setup-storage.mjs
```

This creates a public `uploads` bucket (5MB limit, images only) used for
pandal photos, sponsor banners, and payment-proof screenshots.

### 4. Install and run

```bash
npm install
npm run dev
```

`npm install` also runs `scripts/copy-maplibre-worker.mjs`, which copies
MapLibre's worker script into `/public` — Turbopack/webpack rewrite
`import.meta.url` in a way that breaks MapLibre's own worker
auto-discovery, so it's served as a static file instead (see
`lib/mapWorker.ts`).

Visit `http://localhost:3000` for the public map, `/submit` to add a pandal,
`/sponsor` to sponsor one, and `/admin` to review submissions.

## Admin access

`/admin` is gated by a single shared password (`ADMIN_PASSWORD`), not a user
account — there's exactly one admin role and no per-admin identity. On
login, the server sets an `httpOnly` cookie containing an HMAC-signed,
7-day-expiring token (`lib/adminAuth.ts`); every admin API route
independently re-verifies that signature server-side (`requireAdmin`), so a
page-level check alone is never enough to protect a route.

This is intentionally simpler than a full user/roles system: fine for one
or a handful of trusted people running the moderation queue during a
festival, not meant to scale into a multi-admin product.

## Data model

**`pandals`** — one row per submitted Annadhanam location: name, organizer
name, contact phone, address, `lat`/`lng`, event date, free-form timing
text, optional description, required photo URL, and a `status` of
`pending` / `approved` / `rejected`. Only `approved` rows are ever returned
by the public `GET /api/pandals`.

**`sponsors`** — one row per sponsor banner enquiry: linked `pandal_id`,
sponsor name, contact phone, optional banner/logo image, required payment
proof screenshot, and the same `pending` / `approved` / `rejected` status.
Only `approved` rows for a given pandal are returned by the public
`GET /api/sponsors?pandal_id=...`.

Both tables have row-level security enabled with **no policies at all** —
every read and write goes through a server API route using the service-role
key, which bypasses RLS by design. There is no direct client-to-Supabase
path in this app, so there's nothing for a policy to protect.

## Known limitations / next steps

- **Payments are manual.** `/sponsor` shows a placeholder UPI ID and expects
  a screenshot as proof; there's no payment gateway or automatic
  reconciliation. Replace the placeholder UPI ID before accepting real
  sponsors, and keep verifying screenshots by hand until volume justifies a
  gateway integration.
- **No spam/rate-limiting.** Since submission is fully open and anonymous,
  a bad actor could flood `/api/pandals` or `/api/sponsors`. The admin queue
  is the only backstop for now; add rate limiting (e.g. by IP) if abuse
  becomes a problem.
- **No edit/delete for organizers.** Since there are no accounts, an
  organizer who made a mistake has to ask the admin to fix or remove their
  listing — there's no self-service edit flow.
- **No image moderation.** Uploaded photos go straight to public storage
  once approved; there's no automated content-safety check, only the
  admin's manual review before approval.
- **Single shared admin password.** Fine for a small trusted team during one
  festival season; rotate `ADMIN_PASSWORD` if it needs to change hands.
- **Nominatim's free usage policy caps requests at ~1/second** and asks for a
  real contact identifier in the User-Agent (`app/api/geocode/route.ts`). Fine
  for a community-scale festival tool; move to a paid geocoder (or self-hosted
  Nominatim) if traffic grows well beyond that.

## Verification commands

Run before considering a change complete:

```bash
npm run lint
npx tsc --noEmit
npm run build
```
