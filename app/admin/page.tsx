"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CloseIcon, RefreshIcon, TrashIcon } from "@/components/icons";
import ImageUploadField from "@/components/ImageUploadField";
import { fetchJson, sendJson } from "@/lib/fetchJson";
import type { Pandal, PaymentSettings, Sponsor } from "@/lib/types";

type SponsorWithPandal = Sponsor & { pandals: { name: string } | null };
type StatusFilter = "all" | "pending" | "approved" | "rejected";
type AdsSubTab = "banners" | "card" | "map";

export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [tab, setTab] = useState<"pandals" | "sponsors" | "settings">("pandals");
  const [adsSubTab, setAdsSubTab] = useState<AdsSubTab>("banners");
  const [pandals, setPandals] = useState<Pandal[]>([]);
  const [sponsors, setSponsors] = useState<SponsorWithPandal[]>([]);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [pandalFilter, setPandalFilter] = useState<StatusFilter>("pending");
  const [pandalSearch, setPandalSearch] = useState("");
  const [sponsorFilter, setSponsorFilter] = useState<StatusFilter>("pending");
  const [sponsorSearch, setSponsorSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchJson<{ loggedIn: boolean }>("/api/admin/session").then((data) => setLoggedIn(data?.loggedIn ?? false));
  }, []);

  const loadData = async () => {
    const [pandalsRes, sponsorsRes, settingsRes] = await Promise.all([
      fetchJson<{ pandals: Pandal[] }>("/api/admin/pandals"),
      fetchJson<{ sponsors: SponsorWithPandal[] }>("/api/admin/sponsors"),
      fetchJson<{ settings: PaymentSettings }>("/api/admin/settings"),
    ]);
    setPandals(pandalsRes?.pandals ?? []);
    setSponsors(sponsorsRes?.sponsors ?? []);
    setSettings(settingsRes?.settings ?? null);
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    if (!loggedIn) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loggedIn]);

  const saveSettings = async (patch: Partial<PaymentSettings>) => {
    const result = await sendJson<{ settings: PaymentSettings }>("/api/admin/settings", patch, "PATCH");
    if (result.ok) setSettings(result.data.settings);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const result = await sendJson("/api/admin/login", { password });
    if (result.ok) {
      setLoggedIn(true);
    } else {
      setLoginError(result.error);
    }
  };

  const handleLogout = async () => {
    await sendJson("/api/admin/logout");
    setLoggedIn(false);
  };

  const updatePandalStatus = async (id: string, status: "approved" | "rejected") => {
    await sendJson(`/api/admin/pandals/${id}`, { status }, "PATCH");
    loadData();
  };

  const setBannerPaid = async (id: string, banner_paid: boolean) => {
    await sendJson(`/api/admin/pandals/${id}`, { banner_paid }, "PATCH");
    loadData();
  };

  const sendAdminNote = async (id: string, note: string) => {
    await sendJson(`/api/admin/pandals/${id}`, { admin_note: note }, "PATCH");
    loadData();
  };

  const deletePandal = async (id: string) => {
    if (!confirm("Permanently delete this mandapam listing?")) return;
    await sendJson(`/api/admin/pandals/${id}`, undefined, "DELETE");
    loadData();
  };

  const updateSponsorStatus = async (id: string, status: "approved" | "rejected") => {
    await sendJson(`/api/admin/sponsors/${id}`, { status }, "PATCH");
    loadData();
  };

  const setSponsorEditUnlocked = async (id: string, edit_unlocked: boolean) => {
    await sendJson(`/api/admin/sponsors/${id}`, { edit_unlocked }, "PATCH");
    loadData();
  };

  if (loggedIn === null) {
    return <div className="p-6 text-sm text-[color:var(--muted)]">Loading…</div>;
  }

  if (!loggedIn) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center p-6">
        <div className="card-elevated p-6">
          <span className="icon-tile icon-tile-circle mb-4 h-12 w-12" style={{ background: "#ffffff" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/bappa-logo.png" alt="" className="h-7 w-7 object-contain" />
          </span>
          <h1 className="mb-4 text-xl font-bold text-[color:var(--foreground)]">Admin sign in</h1>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="field-input"
              autoFocus
            />
            {loginError && <p className="text-sm text-[color:var(--coral-deep)]">{loginError}</p>}
            <button type="submit" className="btn-primary w-full py-2">
              Sign in
            </button>
          </form>
        </div>
      </div>
    );
  }

  const pendingPandalsCount = pandals.filter((p) => p.status === "pending").length;

  const pandalSearchLower = pandalSearch.trim().toLowerCase();
  const filteredPandals = pandals.filter(
    (p) =>
      (pandalFilter === "all" || p.status === pandalFilter) &&
      (pandalSearchLower === "" ||
        p.name.toLowerCase().includes(pandalSearchLower) ||
        p.organizer_name.toLowerCase().includes(pandalSearchLower) ||
        p.contact_phone.includes(pandalSearchLower) ||
        p.address.toLowerCase().includes(pandalSearchLower))
  );

  const sponsorSearchLower = sponsorSearch.trim().toLowerCase();
  const filteredSponsors = sponsors.filter(
    (s) =>
      s.placement === adsSubTab &&
      (sponsorFilter === "all" || s.status === sponsorFilter) &&
      (sponsorSearchLower === "" ||
        s.sponsor_name.toLowerCase().includes(sponsorSearchLower) ||
        s.contact_phone.includes(sponsorSearchLower) ||
        (s.pandals?.name.toLowerCase().includes(sponsorSearchLower) ?? false))
  );

  const pandalsWithBanner = pandals.filter((p) => (p.banner_image_urls?.length ?? 0) > 0);
  const pendingBannerCount = pandalsWithBanner.filter((p) => !p.banner_paid).length;
  const pendingCardAdsCount = sponsors.filter((s) => s.placement === "card" && s.status === "pending").length;
  const pendingMapAdsCount = sponsors.filter((s) => s.placement === "map" && s.status === "pending").length;
  const pendingAdsTotal = pendingBannerCount + pendingCardAdsCount + pendingMapAdsCount;

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl overflow-x-hidden p-4 pb-16">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="icon-tile icon-tile-circle h-9 w-9 flex-shrink-0" style={{ background: "#ffffff" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/bappa-logo.png" alt="" className="h-6 w-6 object-contain" />
          </span>
          <h1 className="truncate text-xl font-bold text-[color:var(--foreground)]">Admin</h1>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            onClick={refresh}
            disabled={refreshing}
            aria-label="Refresh"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--muted)] transition-colors hover:bg-[rgba(43,22,8,0.06)] disabled:opacity-50"
          >
            <RefreshIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button onClick={handleLogout} className="btn-ghost text-sm">
            Log out
          </button>
        </div>
      </div>

      <div className="mb-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <TabButton active={tab === "pandals"} onClick={() => setTab("pandals")}>
          Mandapams ({pendingPandalsCount} pending)
        </TabButton>
        <TabButton active={tab === "sponsors"} onClick={() => setTab("sponsors")}>
          Ads ({pendingAdsTotal} pending)
        </TabButton>
        <TabButton active={tab === "settings"} onClick={() => setTab("settings")}>
          Payment settings
        </TabButton>
      </div>

      {tab === "pandals" && (
        <div className="space-y-4">
          <FilterBar
            filter={pandalFilter}
            onFilterChange={setPandalFilter}
            counts={{
              all: pandals.length,
              pending: pandals.filter((p) => p.status === "pending").length,
              approved: pandals.filter((p) => p.status === "approved").length,
              rejected: pandals.filter((p) => p.status === "rejected").length,
            }}
            search={pandalSearch}
            onSearchChange={setPandalSearch}
            searchPlaceholder="Search by name, organizer, phone, address…"
          />

          <div className="space-y-2">
            {filteredPandals.length === 0 && <Empty>No mandapams match this filter.</Empty>}
            {filteredPandals.map((pandal) => (
              <PandalRow key={pandal.id} pandal={pandal} onSendNote={sendAdminNote}>
                <StatusBadge status={pandal.status} />
                {pandal.status !== "approved" && (
                  <ActionButton color="orange" icon={<CheckIcon className="h-3.5 w-3.5" />} onClick={() => updatePandalStatus(pandal.id, "approved")}>
                    Approve
                  </ActionButton>
                )}
                {pandal.status !== "rejected" && (
                  <ActionButton color="red" icon={<CloseIcon className="h-3.5 w-3.5" />} onClick={() => updatePandalStatus(pandal.id, "rejected")}>
                    {pandal.status === "pending" ? "Reject" : "Unpublish"}
                  </ActionButton>
                )}
                <ActionButton color="gray" icon={<TrashIcon className="h-3.5 w-3.5" />} onClick={() => deletePandal(pandal.id)}>
                  Delete
                </ActionButton>
              </PandalRow>
            ))}
          </div>
        </div>
      )}

      {tab === "sponsors" && (
        <div className="space-y-4">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            <SubTabButton active={adsSubTab === "banners"} onClick={() => setAdsSubTab("banners")}>
              Banners ({pendingBannerCount})
            </SubTabButton>
            <SubTabButton active={adsSubTab === "card"} onClick={() => setAdsSubTab("card")}>
              Mandapam Card Ads ({pendingCardAdsCount})
            </SubTabButton>
            <SubTabButton active={adsSubTab === "map"} onClick={() => setAdsSubTab("map")}>
              Map Ads ({pendingMapAdsCount})
            </SubTabButton>
          </div>

          {adsSubTab === "banners" ? (
            <div className="space-y-2">
              {pandalsWithBanner.length === 0 && <Empty>No association banners submitted yet.</Empty>}
              {pandalsWithBanner.map((pandal) => (
                <BannerRow key={pandal.id} pandal={pandal} onSetBannerPaid={setBannerPaid} />
              ))}
            </div>
          ) : (
            <>
              <FilterBar
                filter={sponsorFilter}
                onFilterChange={setSponsorFilter}
                counts={{
                  all: sponsors.filter((s) => s.placement === adsSubTab).length,
                  pending: sponsors.filter((s) => s.placement === adsSubTab && s.status === "pending").length,
                  approved: sponsors.filter((s) => s.placement === adsSubTab && s.status === "approved").length,
                  rejected: sponsors.filter((s) => s.placement === adsSubTab && s.status === "rejected").length,
                }}
                search={sponsorSearch}
                onSearchChange={setSponsorSearch}
                searchPlaceholder="Search by sponsor, phone, mandapam…"
              />

              <div className="space-y-2">
                {filteredSponsors.length === 0 && <Empty>No ads match this filter.</Empty>}
                {filteredSponsors.map((sponsor) => (
                  <SponsorRow key={sponsor.id} sponsor={sponsor} onSetEditUnlocked={setSponsorEditUnlocked}>
                    <StatusBadge status={sponsor.status} />
                    {sponsor.status !== "approved" && (
                      <ActionButton color="orange" icon={<CheckIcon className="h-3.5 w-3.5" />} onClick={() => updateSponsorStatus(sponsor.id, "approved")}>
                        Approve
                      </ActionButton>
                    )}
                    {sponsor.status !== "rejected" && (
                      <ActionButton color="red" icon={<CloseIcon className="h-3.5 w-3.5" />} onClick={() => updateSponsorStatus(sponsor.id, "rejected")}>
                        {sponsor.status === "pending" ? "Reject" : "Unpublish"}
                      </ActionButton>
                    )}
                  </SponsorRow>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === "settings" && (
        <SettingsPanel key={settings ? "loaded" : "loading"} settings={settings} onSave={saveSettings} />
      )}
    </div>
  );
}

function SettingsPanel({
  settings,
  onSave,
}: {
  settings: PaymentSettings | null;
  onSave: (patch: Partial<PaymentSettings>) => void;
}) {
  const [upiId, setUpiId] = useState(settings?.upi_id ?? "");
  const [saved, setSaved] = useState(false);
  const [qrSaved, setQrSaved] = useState<"saved" | "removed" | null>(null);

  if (!settings) {
    return <p className="text-sm text-[color:var(--muted)]">Loading…</p>;
  }

  return (
    <div className="card-elevated max-w-md space-y-5 p-5">
      <div>
        <h2 className="text-sm font-semibold text-[color:var(--foreground)]">UPI ID &amp; QR code</h2>
        <p className="mt-1 text-xs text-[color:var(--muted)]">
          Shown to everyone paying for a banner or ad — on /submit and /sponsor.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[color:var(--foreground)]">UPI ID</label>
        <div className="flex gap-2">
          <input
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="annadhanam@upi"
            className="field-input"
          />
          <button
            type="button"
            onClick={() => {
              onSave({ upi_id: upiId });
              setSaved(true);
              setTimeout(() => setSaved(false), 2000);
            }}
            className="btn-primary shrink-0 px-4 text-sm"
          >
            Save
          </button>
        </div>
        {saved && <p className="mt-1 text-xs text-green-700">Saved.</p>}
      </div>

      <div>
        <ImageUploadField
          label="QR code image"
          folder="settings"
          value={settings.qr_image_url}
          onChange={(url) => {
            onSave({ qr_image_url: url });
            setQrSaved(url ? "saved" : "removed");
            setTimeout(() => setQrSaved(null), 2000);
          }}
        />
        {qrSaved && <p className="mt-1 text-xs text-green-700">{qrSaved === "saved" ? "Saved." : "Removed."}</p>}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={active ? "btn-primary px-3 py-1.5 text-sm" : "btn-secondary px-3 py-1.5 text-sm"}>
      {children}
    </button>
  );
}

/** Sub-tabs within the Ads tab (Banners / Normal Ads / Map Ads) — kept
 * visually smaller/flatter than the main tabs above so the hierarchy reads
 * correctly at a glance. */
function SubTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        active
          ? "bg-[color:var(--accent-deep)] text-white"
          : "bg-[rgba(43,22,8,0.06)] text-[color:var(--muted)] hover:bg-[rgba(43,22,8,0.1)]"
      }`}
    >
      {children}
    </button>
  );
}

function FilterBar({
  filter,
  onFilterChange,
  counts,
  search,
  onSearchChange,
  searchPlaceholder,
}: {
  filter: StatusFilter;
  onFilterChange: (f: StatusFilter) => void;
  counts: Record<StatusFilter, number>;
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder: string;
}) {
  const options: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onFilterChange(o.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              filter === o.value
                ? "bg-[color:var(--accent)] text-white"
                : "bg-[rgba(43,22,8,0.06)] text-[color:var(--muted)] hover:bg-[rgba(43,22,8,0.1)]"
            }`}
          >
            {o.label} ({counts[o.value]})
          </button>
        ))}
      </div>
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        className="field-input text-sm"
      />
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-[rgba(43,22,8,0.05)] p-3 text-sm text-[color:var(--muted-soft)]">{children}</p>;
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status}`}>{status}</span>;
}

function ActionButton({
  color,
  icon,
  onClick,
  children,
}: {
  color: "orange" | "red" | "gray";
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const colors = {
    orange: "bg-gradient-to-br from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700",
    red: "bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700",
    gray: "bg-gradient-to-br from-neutral-400 to-neutral-500 hover:from-neutral-500 hover:to-neutral-600",
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 ${colors[color]}`}
    >
      {icon}
      {children}
    </button>
  );
}

function PandalRow({
  pandal,
  children,
  onSendNote,
}: {
  pandal: Pandal;
  children: React.ReactNode;
  onSendNote: (id: string, note: string) => void;
}) {
  const [noteDraft, setNoteDraft] = useState(pandal.admin_note ?? "");
  return (
    <div className="card-elevated flex flex-col gap-3 p-3 sm:flex-row">
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pandal.image_url} alt="" className="h-14 w-14 flex-shrink-0 rounded-xl object-cover" />
        <div className="min-w-0 flex-1 sm:hidden">
          <p className="text-sm font-semibold text-[color:var(--foreground)]">{pandal.name}</p>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="hidden text-sm font-semibold text-[color:var(--foreground)] sm:block">{pandal.name}</p>
        <p className="text-xs text-[color:var(--muted)]">{pandal.address}</p>
        <p className="text-xs text-[color:var(--muted-soft)]">
          {pandal.organizer_name} · {pandal.contact_phone} · {pandal.event_date} · {pandal.timing_text}
        </p>
        {pandal.description && <p className="text-xs text-[color:var(--muted-soft)]">{pandal.description}</p>}
        <p className="text-[0.6875rem] text-[color:var(--muted-soft)]">
          Submitted {new Date(pandal.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </p>

        <div className="flex items-center gap-1.5 pt-1">
          <input
            type="text"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Message to owner (e.g. why this was rejected)…"
            className="field-input flex-1 py-1 text-xs"
          />
          <button
            type="button"
            onClick={() => onSendNote(pandal.id, noteDraft.trim())}
            disabled={noteDraft.trim() === (pandal.admin_note ?? "")}
            className="btn-secondary flex-shrink-0 px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pandal.admin_note ? "Update" : "Send"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:shrink-0">{children}</div>
    </div>
  );
}

function SponsorRow({
  sponsor,
  children,
  onSetEditUnlocked,
}: {
  sponsor: SponsorWithPandal;
  children: React.ReactNode;
  onSetEditUnlocked: (id: string, unlocked: boolean) => void;
}) {
  const images = sponsor.banner_image_urls?.length ? sponsor.banner_image_urls : sponsor.banner_image_url ? [sponsor.banner_image_url] : [];
  const price = sponsor.placement === "card" ? 200 : 500;

  return (
    <div className="card-elevated flex flex-col gap-3 p-3 sm:flex-row">
      <div className="flex flex-shrink-0 gap-1.5">
        {images.length > 0 ? (
          images.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="h-14 w-14 rounded-xl object-cover" />
          ))
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[rgba(43,22,8,0.06)] text-xs text-[color:var(--muted-soft)]">
            No logo
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold text-[color:var(--foreground)]">{sponsor.sponsor_name}</p>
        <p className="text-xs text-[color:var(--muted)]">
          {sponsor.placement === "card" ? "Mandapam card ad" : "Map-wide ad"} · ₹{price} / 2 days
        </p>
        <p className="text-xs text-[color:var(--muted)]">{sponsor.contact_phone}</p>
        <p className="text-[0.6875rem] text-[color:var(--muted-soft)]">
          Submitted {new Date(sponsor.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          {sponsor.expires_at && (
            <> · Expires {new Date(sponsor.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={sponsor.payment_proof_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-[color:var(--accent-deep)] underline"
          >
            View payment proof
          </a>
          {sponsor.link_url && (
            <a
              href={sponsor.link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-[color:var(--accent-deep)] underline"
            >
              Ad link
            </a>
          )}
        </div>

        {sponsor.edit_requested && !sponsor.edit_unlocked && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-[rgba(234,108,29,0.1)] px-2.5 py-1.5">
            <span className="text-xs font-semibold text-[color:var(--accent-deep)]">Wants to edit this ad</span>
            <button
              type="button"
              onClick={() => onSetEditUnlocked(sponsor.id, true)}
              className="rounded-full bg-[rgba(34,139,34,0.16)] px-2 py-0.5 text-[0.6875rem] font-semibold text-green-800"
            >
              Allow edit
            </button>
            <button
              type="button"
              onClick={() => onSetEditUnlocked(sponsor.id, false)}
              className="rounded-full bg-[rgba(43,22,8,0.08)] px-2 py-0.5 text-[0.6875rem] font-semibold text-[color:var(--muted)]"
            >
              Deny
            </button>
          </div>
        )}
        {sponsor.edit_unlocked && (
          <p className="text-[0.6875rem] font-semibold text-green-700">Edit approved — owner can now save one change.</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:shrink-0">{children}</div>
    </div>
  );
}

/** Confirms/revokes payment for a mandapam's own association banner — a
 * dedicated Ads > Banners row instead of being buried in the Mandapams
 * tab, and using the same polished ActionButton treatment as every other
 * approve/reject action instead of a plain text pill. */
function BannerRow({ pandal, onSetBannerPaid }: { pandal: Pandal; onSetBannerPaid: (id: string, paid: boolean) => void }) {
  return (
    <div className="card-elevated flex flex-col gap-3 p-3 sm:flex-row">
      <div className="flex flex-shrink-0 gap-1.5">
        {pandal.banner_image_urls!.map((url) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={url} src={url} alt="" className="h-14 w-14 rounded-xl border border-[rgba(43,22,8,0.1)] object-cover" />
        ))}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-semibold text-[color:var(--foreground)]">{pandal.name}</p>
        <p className="text-xs text-[color:var(--muted)]">Association banner · ₹200 one-time</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className={pandal.banner_paid ? "status-badge status-approved" : "status-badge status-pending"}>
            {pandal.banner_paid ? "Paid" : "Unpaid"}
          </span>
          {pandal.banner_payment_proof_url && (
            <a
              href={pandal.banner_payment_proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-[color:var(--accent-deep)] underline"
            >
              View payment screenshot
            </a>
          )}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {pandal.banner_paid ? (
          <ActionButton color="gray" icon={<CloseIcon className="h-3.5 w-3.5" />} onClick={() => onSetBannerPaid(pandal.id, false)}>
            Revoke
          </ActionButton>
        ) : (
          <ActionButton color="orange" icon={<CheckIcon className="h-3.5 w-3.5" />} onClick={() => onSetBannerPaid(pandal.id, true)}>
            Confirm Payment
          </ActionButton>
        )}
      </div>
    </div>
  );
}
