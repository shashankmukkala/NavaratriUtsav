"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import BackButton from "@/components/BackButton";
import Brand from "@/components/Brand";
import ImageUploadField from "@/components/ImageUploadField";
import SignInPrompt from "@/components/SignInPrompt";
import { CalendarIcon, ClockIcon, PinIcon, TrashIcon } from "@/components/icons";
import { CATEGORIES, categoryInfo } from "@/lib/categories";
import { formatEventDateRange } from "@/lib/eventStatus";
import { fetchJson, fetchJsonCached, sendJson } from "@/lib/fetchJson";
import type { Pandal, Sponsor } from "@/lib/types";


type SponsorWithPandal = Sponsor & { pandals: { name: string } | null };
type SessionUser = { name?: string; email?: string; image?: string };

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<{ user?: SessionUser } | null>(null);
  const [pandals, setPandals] = useState<Pandal[]>([]);
  const [sponsors, setSponsors] = useState<SponsorWithPandal[]>([]);
  const [editing, setEditing] = useState<Pandal | null>(null);
  const [highlightDates, setHighlightDates] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<SponsorWithPandal | null>(null);
  const [requestingEdit, setRequestingEdit] = useState<string | null>(null);
  const loadData = useCallback(() => {
    fetchJson<{ pandals: Pandal[] }>("/api/me/pandals").then((data) => setPandals(data?.pandals ?? []));
    fetchJson<{ sponsors: SponsorWithPandal[] }>("/api/me/sponsors").then((data) => setSponsors(data?.sponsors ?? []));
  }, []);

  useEffect(() => {
    fetchJsonCached<{ user?: SessionUser }>("/api/auth/session").then((data) => setSession(data ?? null));
  }, []);

  useEffect(() => {
    if (session?.user) loadData();
  }, [session, loadData]);

  const deletePandal = async (id: string) => {
    if (!confirm("Delete this listing? This can't be undone.")) return;
    await sendJson(`/api/me/pandals/${id}`, undefined, "DELETE");
    loadData();
  };

  const deleteSponsor = async (id: string) => {
    if (!confirm("Delete this ad? This can't be undone.")) return;
    await sendJson(`/api/me/sponsors/${id}`, undefined, "DELETE");
    loadData();
  };

  const dismissAdminNote = async (id: string) => {
    await sendJson(`/api/me/pandals/${id}`, { admin_note: null }, "PATCH");
    loadData();
  };

  const requestSponsorEdit = async (id: string) => {
    setRequestingEdit(id);
    await sendJson(`/api/me/sponsors/${id}/request-edit`, undefined, "POST");
    setRequestingEdit(null);
    loadData();
  };

  return (
    <div className="theme-wine w-full">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-4 sm:px-6">
        <nav className="nav-shell flex items-center gap-4 px-4 py-2.5 sm:px-5">
          <BackButton fallbackHref="/map" />
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
                See every celebration or ad you&apos;ve submitted, and edit or delete them.
              </p>
            </div>
            <SignInPrompt
              open
              onClose={() => router.back()}
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
                My celebrations ({pandals.length})
              </h2>
              {pandals.length === 0 ? (
                <Empty>You haven&apos;t added any celebrations yet.</Empty>
              ) : (
                <div className="space-y-2">
                  {pandals.map((pandal) => {
                    return (
                      <div key={pandal.id} className="card-elevated flex flex-col gap-3 p-3 sm:flex-row">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={pandal.thumbnail_url || pandal.image_url} alt="" className="h-14 w-14 flex-shrink-0 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="flex items-center gap-2 text-sm font-semibold text-[color:var(--foreground)]">
                            <span className="truncate">{pandal.name}</span>
                            <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold ${categoryInfo(pandal.category).badgeClass}`}>
                              {categoryInfo(pandal.category).label}
                            </span>
                          </p>
                          <p className="truncate text-xs text-[color:var(--muted)]">{pandal.address}</p>
                          <div className="flex items-center gap-3 text-xs text-[color:var(--muted-soft)]">
                            {pandal.event_date ? (
                              <>
                                <span className="inline-flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  {formatEventDateRange(pandal.event_date, pandal.event_date_end)}
                                </span>
                                {pandal.timing_text && (
                                  <span className="inline-flex items-center gap-1">
                                    <ClockIcon className="h-3 w-3" />
                                    {pandal.timing_text}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span>No date set — shown for the whole festival</span>
                            )}
                          </div>
                          <span className={`status-badge status-${pandal.status} inline-block`}>{pandal.status}</span>

                          {pandal.admin_note && (
                            <div className="flex items-start gap-1.5 rounded-lg bg-[rgba(184,50,31,0.1)] px-2.5 py-1.5">
                              <p className="flex-1 text-xs text-[color:var(--foreground)]">
                                <span className="font-semibold text-[color:var(--accent-deep)]">Note from admin: </span>
                                {pandal.admin_note}
                              </p>
                              <button
                                type="button"
                                onClick={() => dismissAdminNote(pandal.id)}
                                aria-label="Dismiss note"
                                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[color:var(--muted)] hover:bg-[rgba(43,22,8,0.08)]"
                              >
                                ×
                              </button>
                            </div>
                          )}

                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(pandal);
                              setHighlightDates(false);
                            }}
                            className="btn-secondary px-3 py-1.5 text-xs"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(pandal);
                              setHighlightDates(true);
                            }}
                            className="btn-secondary px-3 py-1.5 text-xs"
                          >
                            {pandal.event_date ? "Edit Event Date" : "Add Event Date"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deletePandal(pandal.id)}
                            aria-label="Delete"
                            className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--coral-deep)] transition-colors hover:bg-[rgba(184,50,31,0.1)]"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
                            {sponsor.placement === "card" ? "Listing card ad" : "Map-wide ad"}
                          </p>
                          <span className={`status-badge status-${sponsor.status} mt-1.5 inline-block`}>{sponsor.status}</span>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                          {sponsor.edit_unlocked ? (
                            <button type="button" onClick={() => setEditingSponsor(sponsor)} className="btn-secondary px-3 py-1.5 text-xs">
                              Edit
                            </button>
                          ) : sponsor.edit_requested ? (
                            <span className="rounded-full bg-[rgba(43,22,8,0.06)] px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)]">
                              Edit requested
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => requestSponsorEdit(sponsor.id)}
                              disabled={requestingEdit === sponsor.id}
                              className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-60"
                            >
                              {requestingEdit === sponsor.id ? "Requesting…" : "Request edit"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteSponsor(sponsor.id)}
                            aria-label="Delete"
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[color:var(--coral-deep)] transition-colors hover:bg-[rgba(184,50,31,0.1)]"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <p className="mt-10 text-center text-xs text-[color:var(--muted)]">
          Need help? Write to us at{" "}
          <a href="mailto:bappaseva2026@gmail.com" className="font-semibold text-[color:var(--accent-deep)] hover:underline">
            bappaseva2026@gmail.com
          </a>
        </p>
      </div>

      {editing && (
        <EditPandalModal
          pandal={editing}
          highlightDates={highlightDates}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadData();
          }}
        />
      )}


      {editingSponsor && (
        <EditSponsorModal
          sponsor={editingSponsor}
          onClose={() => setEditingSponsor(null)}
          onSaved={() => {
            setEditingSponsor(null);
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

function EditPandalModal({
  pandal,
  highlightDates = false,
  onClose,
  onSaved,
}: {
  pandal: Pandal;
  /** Scrolls to and visually highlights the date/time fields — used when
   * this modal was opened from the dedicated "Add/Edit Event Date"
   * button rather than the plain "Edit" one. */
  highlightDates?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [category, setCategory] = useState(categoryInfo(pandal.category).value);
  const [name, setName] = useState(pandal.name);
  const [organizerName, setOrganizerName] = useState(pandal.organizer_name);
  const [contactPhone, setContactPhone] = useState(pandal.contact_phone);
  const [eventDate, setEventDate] = useState(pandal.event_date ?? "");
  const [eventDateEnd, setEventDateEnd] = useState(pandal.event_date_end ?? "");
  const [timingText, setTimingText] = useState(pandal.timing_text ?? "");
  const [description, setDescription] = useState(pandal.description ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(pandal.image_url);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(pandal.thumbnail_url);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateFieldsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightDates) {
      dateFieldsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightDates]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await sendJson(
      `/api/me/pandals/${pandal.id}`,
      {
        category,
        name,
        organizer_name: organizerName,
        contact_phone: contactPhone,
        event_date: eventDate || null,
        event_date_end: eventDateEnd || null,
        timing_text: timingText || null,
        description: description || null,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
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
        <p className="text-lg font-bold text-[color:var(--foreground)]">Edit celebration</p>
        <p className="mt-1 text-xs text-[color:var(--muted)]">
          Saving sends it back for a quick review before it&apos;s live again.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`filter-chip justify-center whitespace-normal text-center leading-tight ${category === c.value ? "filter-chip-active" : ""}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <ImageUploadField
            label={categoryInfo(category).photoLabel}
            folder="pandals"
            value={imageUrl}
            onChange={setImageUrl}
            onThumbnailChange={setThumbnailUrl}
            aspect={16 / 9}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">Organizer / association name</label>
            <input value={organizerName} onChange={(e) => setOrganizerName(e.target.value)} className="field-input" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">Contact phone</label>
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="field-input" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">Address</label>
            <textarea
              readOnly
              value={pandal.address}
              rows={2}
              className="field-input cursor-not-allowed bg-[rgba(43,22,8,0.04)] text-[color:var(--muted)]"
            />
            <p className="mt-1 flex items-center gap-1 text-xs text-[color:var(--muted-soft)]">
              <PinIcon className="h-3 w-3" />
              This is fixed to the map pin — message us if the location itself needs to move.
            </p>
          </div>

          <div
            ref={dateFieldsRef}
            className={`grid grid-cols-2 gap-3 rounded-xl transition-shadow ${
              highlightDates ? "-m-2 p-2 ring-2 ring-[color:var(--accent)] ring-offset-2" : ""
            }`}
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">Event date</label>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="field-input" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">Timings</label>
              <input value={timingText} onChange={(e) => setTimingText(e.target.value)} className="field-input" />
            </div>
          </div>

          {eventDate && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">
                Ends on (optional — for multiple days)
              </label>
              <input
                type="date"
                min={eventDate}
                value={eventDateEnd}
                onChange={(e) => setEventDateEnd(e.target.value)}
                className="field-input"
              />
            </div>
          )}

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

/** Editing an ad needs admin approval first (unlike a celebration listing) —
 * this modal only ever opens once that approval is in, via edit_unlocked. */
function EditSponsorModal({
  sponsor,
  onClose,
  onSaved,
}: {
  sponsor: SponsorWithPandal;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [sponsorName, setSponsorName] = useState(sponsor.sponsor_name);
  const [contactPhone, setContactPhone] = useState(sponsor.contact_phone);
  const [linkUrl, setLinkUrl] = useState(sponsor.link_url ?? "");
  const [bannerUrl, setBannerUrl] = useState<string | null>(sponsor.banner_image_urls?.[0] ?? sponsor.banner_image_url ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await sendJson(
      `/api/me/sponsors/${sponsor.id}`,
      {
        sponsor_name: sponsorName,
        contact_phone: contactPhone,
        link_url: linkUrl || null,
        banner_image_urls: bannerUrl ? [bannerUrl] : [],
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
        <p className="text-lg font-bold text-[color:var(--foreground)]">Edit ad</p>
        <p className="mt-1 text-xs text-[color:var(--muted)]">Saving sends it back for a quick review before it&apos;s live again.</p>

        <div className="mt-4 space-y-4">
          <ImageUploadField label="Banner image" folder="sponsors" value={bannerUrl} onChange={setBannerUrl} aspect={16 / 9} />

          <div>
            <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">Sponsor name</label>
            <input value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} className="field-input" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">Contact phone</label>
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="field-input" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">Link (optional)</label>
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className="field-input" />
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
