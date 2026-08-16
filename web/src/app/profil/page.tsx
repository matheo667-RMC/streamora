"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ProfileGate";
import {
  WatchHistoryItem,
  getWatchHistory,
  clearHistory,
  removeFromHistory,
} from "@/lib/watch-history";

interface Profile {
  id: string;
  name: string;
  avatarUrl: string;
  locked?: boolean;
  locale: string;
  audioLang: string;
  subtitleLang: string;
  subtitleSize: string;
  autoplayNext: boolean;
  autoplayPreview: boolean;
  maturity: string;
}

type View =
  | "home"
  | "edit"
  | "icon"
  | "lock"
  | "langues"
  | "sous-titres"
  | "lecture"
  | "historique";

const LANGS = [
  { code: "fr", label: "Français" },
  { code: "en", label: "Anglais" },
  { code: "es", label: "Espagnol" },
  { code: "pt", label: "Portugais" },
  { code: "ar", label: "Arabe" },
  { code: "de", label: "Allemand" },
  { code: "it", label: "Italien" },
];

const SIZES = [
  { code: "small", label: "Petit" },
  { code: "medium", label: "Moyen" },
  { code: "large", label: "Grand" },
];

const MATURITY = [
  { code: "7", label: "7+ · pour les enfants" },
  { code: "12", label: "12+" },
  { code: "16", label: "16+" },
  { code: "18", label: "18+ · tout le catalogue" },
];

function Row({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 px-4 py-4 text-left hover:bg-white/5 transition-colors"
    >
      <span className="text-emerald-400 shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-white">{title}</span>
        <span className="block text-sm text-gray-400 truncate">{subtitle}</span>
      </span>
      <svg className="h-5 w-5 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#151515]/80 divide-y divide-white/5 overflow-hidden">
      {children}
    </div>
  );
}

function Choice({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between px-4 py-3.5 text-left hover:bg-white/5 transition-colors"
    >
      <span className={selected ? "text-white font-semibold" : "text-gray-300"}>{label}</span>
      {selected && (
        <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

export default function ProfilSettingsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentId, setCurrentId] = useState<string>("");
  const [view, setView] = useState<View>("home");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const profile = profiles.find((p) => p.id === currentId) || profiles[0] || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profiles", { cache: "no-store" });
      const data = await res.json();
      const list: Profile[] = Array.isArray(data) ? data : [];
      setProfiles(list);
      let picked = "";
      try {
        picked = sessionStorage.getItem("streamora-profile") || "";
      } catch {}
      setCurrentId(list.some((p) => p.id === picked) ? picked : list[0]?.id || "");
    } catch {
      setProfiles([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(changes: Partial<Profile> & { pin?: string }) {
    if (!profile) return false;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/profiles/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        setSaving(false);
        return false;
      }
      setProfiles((list) => list.map((p) => (p.id === data.id ? { ...p, ...data } : p)));
      if (changes.name !== undefined || changes.avatarUrl !== undefined) {
        try {
          if (sessionStorage.getItem("streamora-profile") === data.id) {
            localStorage.setItem("streamora-profile-name", data.name);
            localStorage.setItem("streamora-profile-avatar", data.avatarUrl);
            window.dispatchEvent(new CustomEvent("streamora-profile-changed"));
          }
        } catch {}
      }
      setSaving(false);
      return true;
    } catch {
      setError("Erreur de connexion");
      setSaving(false);
      return false;
    }
  }

  async function removeProfile() {
    if (!profile) return;
    if (!confirm(`Supprimer le profil « ${profile.name} » ? C'est définitif.`)) return;
    await fetch(`/api/profiles/${profile.id}`, { method: "DELETE" });
    try {
      if (sessionStorage.getItem("streamora-profile") === profile.id) {
        sessionStorage.removeItem("streamora-profile");
        localStorage.removeItem("streamora-profile-name");
        localStorage.removeItem("streamora-profile-avatar");
      }
    } catch {}
    window.location.href = "/";
  }

  if (loading) {
    return <div className="pt-28 text-center text-gray-400">Chargement…</div>;
  }

  if (!profile) {
    return (
      <div className="pt-28 text-center text-gray-400">
        Aucun profil.{" "}
        <Link href="/" className="text-emerald-400 hover:underline">
          Créer un profil
        </Link>
      </div>
    );
  }

  const back = () => setView("home");
  const langLabel = (code: string) => LANGS.find((l) => l.code === code)?.label || code;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-24 pb-16">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => (view === "home" ? window.history.back() : back())}
          className="rounded-full p-2 text-gray-300 hover:bg-white/10 hover:text-white"
          aria-label="Retour"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          {view === "home" && "Gérez votre profil et vos préférences"}
          {view === "edit" && "Modifiez votre profil"}
          {view === "icon" && "Choisissez une icône de profil"}
          {view === "lock" && "Verrouillage du profil"}
          {view === "langues" && "Langues"}
          {view === "sous-titres" && "Affichage des sous-titres"}
          {view === "lecture" && "Paramètres de lecture"}
          {view === "historique" && `Historique du profil ${profile.name}`}
        </h1>
      </div>

      {profiles.length > 1 && view === "home" && (
        <div className="mb-6 flex flex-wrap gap-3">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => setCurrentId(p.id)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                p.id === profile.id
                  ? "border-emerald-500 text-white"
                  : "border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              <span className="h-6 w-6 overflow-hidden rounded-full">
                <Avatar avatarUrl={p.avatarUrl} name={p.name} className="h-full w-full" />
              </span>
              {p.name}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      {view === "home" && (
        <div className="space-y-6">
          <Card>
            <Row
              icon={
                <span className="block h-10 w-10 overflow-hidden rounded">
                  <Avatar avatarUrl={profile.avatarUrl} name={profile.name} className="h-full w-full" />
                </span>
              }
              title={profile.name}
              subtitle="Modifiez le nom et l'icône du profil"
              onClick={() => setView("edit")}
            />
            <Row
              icon={
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 018 0v3" />
                </svg>
              }
              title="Verrouillage du profil"
              subtitle={profile.locked ? "Code PIN activé" : "Exigez un code PIN pour accéder à ce profil"}
              onClick={() => setView("lock")}
            />
          </Card>

          <div>
            <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Préférences
            </h2>
            <Card>
              <Row
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" d="M3 6h9M7 4v2c0 4-2 6-4 7M6 10c0 3 3 5 7 6" />
                    <path strokeLinecap="round" d="M13 20l4-10 4 10M14.5 17h5" />
                  </svg>
                }
                title="Langues"
                subtitle={`Application : ${langLabel(profile.locale)} · Audio : ${langLabel(profile.audioLang)}`}
                onClick={() => setView("langues")}
              />
              <Row
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path strokeLinecap="round" d="M7 15h5M14 15h3" />
                  </svg>
                }
                title="Affichage des sous-titres"
                subtitle={
                  profile.subtitleLang === "off"
                    ? "Sous-titres désactivés"
                    : `${langLabel(profile.subtitleLang)} · ${
                        SIZES.find((s) => s.code === profile.subtitleSize)?.label
                      }`
                }
                onClick={() => setView("sous-titres")}
              />
              <Row
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <circle cx="12" cy="12" r="9" />
                    <path d="M10 9l6 3-6 3z" />
                  </svg>
                }
                title="Paramètres de lecture"
                subtitle="Gérez la lecture automatique"
                onClick={() => setView("lecture")}
              />
              <Row
                icon={
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" d="M12 7v5l3 2" />
                  </svg>
                }
                title="Historique"
                subtitle="Gérer l'historique de lecture et les catégories d'âge"
                onClick={() => setView("historique")}
              />
            </Card>
          </div>

          <Card>
            <Link
              href="/account"
              className="flex w-full items-center gap-4 px-4 py-4 hover:bg-white/5 transition-colors"
            >
              <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <circle cx="12" cy="8" r="4" />
                <path d="M5 21a7 7 0 0114 0" />
              </svg>
              <span className="flex-1">
                <span className="block font-semibold text-white">Compte</span>
                <span className="block text-sm text-gray-400">E-mail, mot de passe, abonnement</span>
              </span>
            </Link>
          </Card>

          <button
            onClick={removeProfile}
            className="w-full rounded-xl border border-red-500/30 py-3.5 font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Supprimer le profil
          </button>
        </div>
      )}

      {view === "edit" && (
        <EditView
          profile={profile}
          saving={saving}
          onIcon={() => setView("icon")}
          onSave={async (name) => {
            if (await patch({ name })) back();
          }}
        />
      )}

      {view === "icon" && (
        <IconGallery
          current={profile.avatarUrl}
          onPick={async (url) => {
            if (await patch({ avatarUrl: url })) setView("edit");
          }}
        />
      )}

      {view === "lock" && (
        <LockView
          locked={!!profile.locked}
          saving={saving}
          onSave={async (pin) => {
            if (await patch({ pin })) back();
          }}
        />
      )}

      {view === "langues" && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Langue de l&apos;application
            </h2>
            <Card>
              {LANGS.map((l) => (
                <Choice
                  key={l.code}
                  label={l.label}
                  selected={profile.locale === l.code}
                  onClick={() => patch({ locale: l.code })}
                />
              ))}
            </Card>
          </div>
          <div>
            <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Langue audio préférée
            </h2>
            <Card>
              {LANGS.map((l) => (
                <Choice
                  key={l.code}
                  label={l.label}
                  selected={profile.audioLang === l.code}
                  onClick={() => patch({ audioLang: l.code })}
                />
              ))}
            </Card>
          </div>
        </div>
      )}

      {view === "sous-titres" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-white/10 bg-black p-6 text-center">
            <p
              className="inline-block rounded bg-black/80 px-3 py-1 text-white"
              style={{
                fontSize:
                  profile.subtitleSize === "small" ? 14 : profile.subtitleSize === "large" ? 26 : 19,
              }}
            >
              Aperçu des sous-titres
            </p>
          </div>
          <div>
            <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Langue des sous-titres
            </h2>
            <Card>
              <Choice
                label="Désactivés"
                selected={profile.subtitleLang === "off"}
                onClick={() => patch({ subtitleLang: "off" })}
              />
              {LANGS.map((l) => (
                <Choice
                  key={l.code}
                  label={l.label}
                  selected={profile.subtitleLang === l.code}
                  onClick={() => patch({ subtitleLang: l.code })}
                />
              ))}
            </Card>
          </div>
          <div>
            <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Taille du texte
            </h2>
            <Card>
              {SIZES.map((s) => (
                <Choice
                  key={s.code}
                  label={s.label}
                  selected={profile.subtitleSize === s.code}
                  onClick={() => patch({ subtitleSize: s.code })}
                />
              ))}
            </Card>
          </div>
        </div>
      )}

      {view === "lecture" && (
        <Card>
          <Toggle
            label="Lire automatiquement l'épisode suivant"
            checked={profile.autoplayNext}
            onChange={(v) => patch({ autoplayNext: v })}
          />
          <Toggle
            label="Lire les aperçus pendant la navigation"
            checked={profile.autoplayPreview}
            onChange={(v) => patch({ autoplayPreview: v })}
          />
        </Card>
      )}

      {view === "historique" && (
        <HistoryView
          maturity={profile.maturity}
          onMaturity={(m) => patch({ maturity: m })}
        />
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-white/5 transition-colors"
    >
      <span className="text-gray-200">{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-emerald-600" : "bg-white/20"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function EditView({
  profile,
  saving,
  onIcon,
  onSave,
}: {
  profile: Profile;
  saving: boolean;
  onIcon: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(profile.name);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onIcon}
          className="relative h-24 w-24 overflow-hidden rounded-lg ring-2 ring-white/10 hover:ring-emerald-500"
        >
          <Avatar avatarUrl={profile.avatarUrl} name={profile.name} className="h-full w-full" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.4-9.4a2 2 0 112.8 2.8L11.8 15H9v-2.8l8.6-8.6z" />
            </svg>
          </span>
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          placeholder="Nom de profil"
          className="flex-1 rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      <button
        onClick={onIcon}
        className="w-full rounded-xl border border-white/10 px-4 py-3.5 text-left text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
      >
        Choisir une icône de profil
      </button>

      <button
        onClick={() => onSave(name)}
        disabled={saving || !name.trim()}
        className="w-full rounded-xl bg-emerald-600 py-3.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors"
      >
        {saving ? "…" : "Enregistrer"}
      </button>
    </div>
  );
}

function IconGallery({
  current,
  onPick,
}: {
  current: string;
  onPick: (url: string) => void;
}) {
  const [groups, setGroups] = useState<{ title: string; icons: { title: string; url: string }[] }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/avatars", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setGroups(Array.isArray(d?.groups) ? d.groups : []))
      .catch(() => {});
  }, []);

  function readPhoto(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 256;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        onPick(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-8">
      <div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) readPhoto(f);
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-xl border border-white/15 px-4 py-3 text-sm text-gray-300 hover:border-emerald-500 hover:text-white transition-colors"
        >
          Importer ma propre photo
        </button>
      </div>

      {groups.map((g) => (
        <div key={g.title}>
          <h2 className="mb-3 text-lg font-semibold text-white">{g.title}</h2>
          <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
            {g.icons.map((icon) => (
              <button
                key={icon.url}
                onClick={() => onPick(icon.url)}
                title={icon.title}
                className={`aspect-square overflow-hidden rounded-lg ring-2 transition-all ${
                  current === icon.url ? "ring-emerald-500" : "ring-transparent hover:ring-white/50"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={icon.url} alt={icon.title} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LockView({
  locked,
  saving,
  onSave,
}: {
  locked: boolean;
  saving: boolean;
  onSave: (pin: string) => void;
}) {
  const [pin, setPin] = useState("");

  return (
    <div className="space-y-6">
      <p className="text-gray-400">
        Un code à 4 chiffres sera demandé pour ouvrir ce profil. Laisse vide et enregistre pour
        retirer le verrouillage.
      </p>
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        placeholder={locked ? "Nouveau code (4 chiffres)" : "Code (4 chiffres)"}
        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-center text-2xl tracking-[0.5em] text-white placeholder:text-base placeholder:tracking-normal placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
      />
      <button
        onClick={() => onSave(pin)}
        disabled={saving || (pin.length > 0 && pin.length < 4)}
        className="w-full rounded-xl bg-emerald-600 py-3.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors"
      >
        {saving ? "…" : pin ? "Activer le code" : "Retirer le verrouillage"}
      </button>
    </div>
  );
}

function HistoryView({
  maturity,
  onMaturity,
}: {
  maturity: string;
  onMaturity: (m: string) => void;
}) {
  const [items, setItems] = useState<WatchHistoryItem[]>([]);

  useEffect(() => {
    setItems(getWatchHistory());
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Catégorie d&apos;âge
        </h2>
        <Card>
          {MATURITY.map((m) => (
            <Choice
              key={m.code}
              label={m.label}
              selected={maturity === m.code}
              onClick={() => onMaturity(m.code)}
            />
          ))}
        </Card>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Titres vus</h2>
          {items.length > 0 && (
            <button
              onClick={() => {
                clearHistory();
                setItems([]);
              }}
              className="text-sm text-emerald-400 hover:underline"
            >
              Tout masquer
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="px-1 text-gray-500">Rien pour l&apos;instant.</p>
        ) : (
          <Card>
            {items.map((h) => (
              <div key={`${h.type}-${h.id}`} className="flex items-center gap-3 px-4 py-3">
                <span className="w-24 shrink-0 text-xs text-gray-500">
                  {new Date(h.timestamp).toLocaleDateString("fr-FR")}
                </span>
                <Link
                  href={h.type === "film" ? `/films/${h.filmId || h.id}` : `/series/${h.seriesId}`}
                  className="min-w-0 flex-1 truncate text-sm text-gray-200 hover:text-emerald-400"
                >
                  {h.seriesTitle
                    ? `${h.seriesTitle} : S${h.season} · ${h.title}`
                    : h.title}
                </Link>
                <button
                  onClick={() => {
                    removeFromHistory(h.id, h.type);
                    setItems(getWatchHistory());
                  }}
                  className="shrink-0 text-xs text-gray-500 hover:text-red-400"
                >
                  Masquer
                </button>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
