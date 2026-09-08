"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import BackButton from "@/components/BackButton";
import Brand from "@/components/Brand";
import ImageUploadField from "@/components/ImageUploadField";
import SignInPrompt from "@/components/SignInPrompt";
import { CalendarIcon, ClockIcon, PinIcon, TrashIcon } from "@/components/icons";
import { fetchJson, sendJson } from "@/lib/fetchJson";
import type { Pandal, Sponsor } from "@/lib/types";

type SponsorWithPandal = Sponsor & { pandals: { name: string } | null };
type SessionUser = { name?: string; email?: string; image?: string };

export default function ProfilePage() {
  const [session, setSession] = useState<{ user?: SessionUser } | null>(null);
  const [pandals, setPandals] = useState<Pandal[]>([]);
  const [sponsors, setSponsors] = useState<SponsorWithPandal[]>([]);
  const [editing, setEditing] = useState<Pandal | null>(null);

  const loadData = () => {
    fetchJson<{ pandals: Pandal[] }>("/api/me/pandals").then((data) => setPandals(data?.pandals ?? []));
    fetchJson<{ sponsors: SponsorWithPandal[] }>("/api/me/sponsors").then((data) => setSponsors(data?.sponsors ?? []));
  };

  useEffect(() => {
    fetchJson<{ user?: SessionUser }>("/api/auth/session").then((data) => setSession(data ?? null));
  }, []);

  useEffect(() => {
    if (session?.user) loadData();
  }, [session]);

  const deletePandal = async (id: string) => {
    if (!confirm("Delete this mandapam listing? This can't be undone.")) return;
    await sendJson(`/api/me/pandals/${id}`, undefined, "DELETE");
    loadData();
  };

  const deleteSponsor = async (id: string) => {
    if (!confirm("Delete this ad? This can't be undone.")) return;
    await sendJson(`/api/me/sponsors/${id}`, undefined, "DELETE");
    loadData();
  };

  return (
    <div
      className="min-h-dvh w-full"
      style={{
        background:
          "radial-gradient(ellipse 70% 45% at 15% 0%, rgba(244,169,60,0.28), transparent 60%), radial-gradient(ellipse 60% 40% at 100% 8%, rgba(234,108,29,0.18), transparent 55%), linear-gradient(180deg, var(--cream-50), var(--cream-200) 45%, var(--cream-100))",
      }}
    >
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-4 sm:px-6">
        <nav className="nav-shell flex items-center gap-4 px-4 py-2.5 sm:px-5">
          <BackButton />
          <Brand />
        </nav>

        {session === null ? (
          <p className="mt-10 text-center text-sm text-[color:var(--muted)]">Loading…</p>
        ) : !session.user ? (
          <>
            <div className="mt-16 text-center">
              <p className="eyebrow">Your profile</p>
              <h1 className="mt-3 text-2xl font-bold text-[color:var(--foreground)]">Sign in to see your uploads</h1>
              <p className="mt-2 text-sm text-[color:var(--muted)]">
                See every mandapam or ad you&apos;ve submitted, and edit or delete them.
              </p>
            </div>
            <SignInPrompt
              open
              onClose={() => {}}
              callbackUrl="/profile"
              message="Sign in with the same Google account you used to submit, to see your uploads."
            />
          </>
        ) : (
          <div className="mt-8 space-y-8">
            <div className="card-elevated flex items-center gap-4 p-5">
              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt="" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <span className="icon-tile icon-tile-circle h-14 w-14 text-lg font-bold">
                  {session.user.name?.[0] ?? "?"}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-[color:var(--foreground)]">{session.user.name}</p>
                <p className="truncate text-sm text-[color:var(--muted)]">{session.user.email}</p>
              </div>
              <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="btn-ghost text-sm">
                Sign out
              </button>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[color:var(--muted-soft)]">
                My mandapams ({pandals.length})
              </h2>
              {pandals.length === 0 ? (
                <Empty>You haven&apos;t added any mandapams yet.</Empty>
              ) : (
                <div className="space-y-2">
                  {pandals.map((pandal) => (
                    <div key={pandal.id} className="card-elevated flex items-center gap-3 p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pandal.image_url} alt="" className="h-14 w-14 flex-shrink-0 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">{pandal.name}</p>
                        <p className="truncate text-xs text-[color:var(--muted)]">{pandal.address}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-[color:var(--muted-soft)]">
                          <span className="inline-flex items-center gap-1">
                            <CalendarIcon className="h-3 w-3" />
                            {pandal.event_date}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            {pandal.timing_text}
                          </span>
                        </div>
                        <span className={`status-badge status-${pandal.status} mt-1.5 inline-block`}>{pandal.status}</span>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <button type="button" onClick={() => setEditing(pandal)} className="btn-secondary px-3 py-1.5 text-xs">
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deletePandal(pandal.id)}
                          aria-label="Delete"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--coral-deep)] transition-colors hover:bg-[rgba(234,108,29,0.1)]"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[color:var(--muted-soft)]">
                My ads ({sponsors.length})
              </h2>
              {sponsors.length === 0 ? (
                <Empty>You haven&apos;t run any ads yet.</Empty>
              ) : (
                <div className="space-y-2">
                  {sponsors.map((sponsor) => {
                    const image = sponsor.banner_image_urls?.[0] ?? sponsor.banner_image_url;
                    return (
                      <div key={sponsor.id} className="card-elevated flex items-center gap-3 p-3">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image} alt="" className="h-14 w-14 flex-shrink-0 rounded-xl object-cover" />
                        ) : (
                          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(43,22,8,0.06)] text-xs text-[color:var(--muted-soft)]">
                            No logo
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">{sponsor.sponsor_name}</p>
                          <p className="truncate text-xs text-[color:var(--muted)]">
                            {sponsor.placement === "card" ? "Mandapam card ad" : "Map-wide ad"}
                          </p>
                          <span className={`status-badge status-${sponsor.status} mt-1.5 inline-block`}>{sponsor.status}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteSponsor(sponsor.id)}
                          aria-label="Delete"
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[color:var(--coral-deep)] transition-colors hover:bg-[rgba(234,108,29,0.1)]"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {editing && (
        <EditPandalModal
          pandal={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-[rgba(43,22,8,0.05)] p-4 text-sm text-[color:var(--muted-soft)]">{children}</p>;
}

function EditPandalModal({ pandal, onClose, onSaved }: { pandal: Pandal; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(pandal.name);
  const [contactPhone, setContactPhone] = useState(pandal.contact_phone);
  const [address, setAddress] = useState(pandal.address);
  const [eventDate, setEventDate] = useState(pandal.event_date);
  const [timingText, setTimingText] = useState(pandal.timing_text);
  const [description, setDescription] = useState(pandal.description ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(pandal.image_url);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await sendJson(
      `/api/me/pandals/${pandal.id}`,
      {
        name,
        organizer_name: name,
        contact_phone: contactPhone,
        address,
        event_date: eventDate,
        timing_text: timingText,
        description: description || null,
        image_url: imageUrl,
      },
      "PATCH"
    );
    setSaving(false);
    if (result.ok) {
      onSaved();
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSave} className="card-elevated max-h-[90vh] w-full max-w-md overflow-y-auto p-6">
        <p className="text-lg font-bold text-[color:var(--foreground)]">Edit mandapam</p>
        <p className="mt-1 text-xs text-[color:var(--muted)]">
          Saving sends it back for a quick review before it&apos;s live again.
        </p>

        <div className="mt-4 space-y-4">
          <ImageUploadField label="Photo" folder="pandals" value={imageUrl} onChange={setImageUrl} />

          <div>
            <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">Association name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">Contact phone</label>
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="field-input" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">Address</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="field-input" />
            <p className="mt-1 flex items-center gap-1 text-xs text-[color:var(--muted-soft)]">
              <PinIcon className="h-3 w-3" />
              Location pin stays the same — message us to move it.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">Date</label>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="field-input" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">Serving time</label>
              <input value={timingText} onChange={(e) => setTimingText(e.target.value)} className="field-input" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">Additional details</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="field-input" />
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-[color:var(--coral-deep)]">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center py-2.5">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center py-2.5">
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
