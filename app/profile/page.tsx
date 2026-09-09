"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import BackButton from "@/components/BackButton";
import Brand from "@/components/Brand";
import ImageUploadField from "@/components/ImageUploadField";
import SignInPrompt from "@/components/SignInPrompt";
import { CalendarIcon, ClockIcon, MegaphoneIcon, PinIcon, TrashIcon } from "@/components/icons";
import { fetchJson, sendJson } from "@/lib/fetchJson";
import type { Pandal, PaymentSettings, Sponsor } from "@/lib/types";


type SponsorWithPandal = Sponsor & { pandals: { name: string } | null };
type SessionUser = { name?: string; email?: string; image?: string };

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<{ user?: SessionUser } | null>(null);
  const [pandals, setPandals] = useState<Pandal[]>([]);
  const [sponsors, setSponsors] = useState<SponsorWithPandal[]>([]);
  const [editing, setEditing] = useState<Pandal | null>(null);
  const [addingBannerTo, setAddingBannerTo] = useState<Pandal | null>(null);
  const [editingSponsor, setEditingSponsor] = useState<SponsorWithPandal | null>(null);
  const [requestingEdit, setRequestingEdit] = useState<string | null>(null);

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
                My mandapams ({pandals.length})
              </h2>
              {pandals.length === 0 ? (
                <Empty>You haven&apos;t added any mandapams yet.</Empty>
              ) : (
                <div className="space-y-2">
                  {pandals.map((pandal) => {
                    return (
                      <div key={pandal.id} className="card-elevated flex flex-col gap-3 p-3 sm:flex-row">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={pandal.image_url} alt="" className="h-14 w-14 flex-shrink-0 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">{pandal.name}</p>
                          <p className="truncate text-xs text-[color:var(--muted)]">{pandal.address}</p>
                          <div className="flex items-center gap-3 text-xs text-[color:var(--muted-soft)]">
                            <span className="inline-flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {pandal.event_date}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <ClockIcon className="h-3 w-3" />
                              {pandal.timing_text}
                            </span>
                          </div>
                          <span className={`status-badge status-${pandal.status} inline-block`}>{pandal.status}</span>

                          {pandal.admin_note && (
                            <div className="flex items-start gap-1.5 rounded-lg bg-[rgba(234,108,29,0.1)] px-2.5 py-1.5">
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
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[color:var(--muted-soft)]">
                My banners ({pandals.length})
              </h2>
              <p className="mb-3 text-xs text-[color:var(--muted-soft)]">
                A one-time ₹200 per mandapam, live for as long as the listing is — unlike the ads below, which run for
                a limited time.
              </p>
              {pandals.length === 0 ? (
                <Empty>Add a mandapam first, then you can give it a banner.</Empty>
              ) : (
                <div className="space-y-2">
                  {pandals.map((pandal) => {
                    const hasBanner = (pandal.banner_image_urls?.length ?? 0) > 0;
                    return (
                      <div key={pandal.id} className="card-elevated flex items-center gap-3 p-3">
                        {hasBanner ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={pandal.banner_image_urls![0]} alt="" className="h-14 w-14 flex-shrink-0 rounded-xl object-cover" />
                        ) : (
                          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(43,22,8,0.06)] text-[color:var(--muted-soft)]">
                            <MegaphoneIcon className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[color:var(--foreground)]">{pandal.name}</p>
                          {hasBanner ? (
                            <span className={hasBanner && pandal.banner_paid ? "text-xs font-medium text-green-700" : "text-xs font-medium text-[color:var(--accent-deep)]"}>
                              {pandal.banner_paid ? "Live" : "Pending payment review"}
                            </span>
                          ) : (
                            <p className="truncate text-xs text-[color:var(--muted)]">No banner yet</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setAddingBannerTo(pandal)}
                          className="btn-secondary flex-shrink-0 px-3 py-1.5 text-xs"
                        >
                          {hasBanner ? "Update" : "Add banner"}
                        </button>
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
                            {sponsor.placement === "card" ? "Mandapam card ad" : "Map-wide ad"}
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
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[color:var(--coral-deep)] transition-colors hover:bg-[rgba(234,108,29,0.1)]"
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
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadData();
          }}
        />
      )}

      {addingBannerTo && (
        <AddBannerModal
          pandal={addingBannerTo}
          onClose={() => setAddingBannerTo(null)}
          onSaved={() => {
            setAddingBannerTo(null);
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

function EditPandalModal({ pandal, onClose, onSaved }: { pandal: Pandal; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(pandal.name);
  const [contactPhone, setContactPhone] = useState(pandal.contact_phone);
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

/** Lets an owner add (or replace) their ₹200 association banner after the
 * mandapam is already live — this never needed edit approval even during
 * the original /submit flow, so it doesn't here either; admin still has to
 * confirm the payment (banner_paid) before it actually shows anywhere. */
function AddBannerModal({ pandal, onClose, onSaved }: { pandal: Pandal; onClose: () => void; onSaved: () => void }) {
  const alreadyPaid = pandal.banner_paid;
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(pandal.banner_image_urls?.[0] ?? null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!alreadyPaid) fetchJson<{ settings: PaymentSettings }>("/api/settings").then((data) => setSettings(data?.settings ?? null));
  }, [alreadyPaid]);

  // Once it's already paid, swapping the image is free — no need to pay or
  // prove payment again for a banner that's already live.
  const canSave = alreadyPaid ? Boolean(bannerUrl) : Boolean(bannerUrl && proofUrl);

  const handleSave = async () => {
    if (!canSave) return;
    setError(null);
    setSaving(true);
    const patch: Record<string, unknown> = { banner_image_urls: bannerUrl ? [bannerUrl] : [] };
    if (!alreadyPaid) patch.banner_payment_proof_url = proofUrl;
    const result = await sendJson(`/api/me/pandals/${pandal.id}`, patch, "PATCH");
    setSaving(false);
    if (result.ok) {
      onSaved();
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="card-elevated relative w-full max-w-sm p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(43,22,8,0.06)] text-sm text-[color:var(--muted)] hover:bg-[rgba(43,22,8,0.12)]"
        >
          ×
        </button>
        <p className="pr-8 text-lg font-bold text-[color:var(--foreground)]">
          {alreadyPaid ? "Update your banner" : "Add your association banner"}
        </p>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          {alreadyPaid
            ? `Already paid — swap the image on ${pandal.name}'s card any time, for free.`
            : `One-time ₹200 — shows on ${pandal.name}'s card, for good.`}
        </p>

        <div className="mt-4">
          <ImageUploadField label="Banner image" folder="pandals" value={bannerUrl} onChange={setBannerUrl} />
        </div>

        {!alreadyPaid && bannerUrl && (
          <>
            <div className="mt-4 flex items-center gap-3 rounded-xl border-2 border-dashed border-[rgba(43,22,8,0.18)] bg-white/50 p-3">
              {settings?.qr_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.qr_image_url}
                  alt="Payment QR code"
                  className="h-20 w-20 flex-shrink-0 rounded-lg border border-[rgba(43,22,8,0.12)] object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg border border-[rgba(43,22,8,0.12)] bg-white text-[0.6rem] text-[color:var(--muted-soft)]">
                  QR code
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-mono font-semibold text-[color:var(--foreground)]">
                  {settings?.upi_id ?? "annadhanam@upi"}
                </p>
                <p className="mt-1 text-xs text-[color:var(--muted)]">Scan or pay ₹200 to this UPI ID.</p>
              </div>
            </div>

            <div className="mt-4">
              <ImageUploadField label="Payment screenshot" folder="payment-proofs" required value={proofUrl} onChange={setProofUrl} />
            </div>
          </>
        )}

        {error && <p className="mt-3 text-sm text-[color:var(--coral-deep)]">{error}</p>}

        <button
          type="button"
          disabled={!canSave || saving}
          onClick={handleSave}
          className="btn-primary mt-4 w-full justify-center py-2.5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? "Saving…" : alreadyPaid ? "Save banner" : "Submit banner"}
        </button>
      </div>
    </div>
  );
}

/** Editing an ad needs admin approval first (unlike a mandapam listing) —
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
          <ImageUploadField label="Banner image" folder="sponsors" value={bannerUrl} onChange={setBannerUrl} />

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
