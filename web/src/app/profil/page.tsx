"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
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

function Header() {
  return (
    <header className="border-b border-[#e6e6e6] bg-white">
      <div className="mx-auto flex h-[57px] max-w-[1100px] items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="Streamora" width={28} height={28} className="rounded" />
          <span className="text-xl font-extrabold tracking-tight text-emerald-600">
            STREAMORA
          </span>
        </Link>
      </div>
    </header>
  );
}

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
      className="flex w-full items-center gap-4 px-5 py-5 text-left transition-colors hover:bg-[#f7f7f7]"
    >
      <span className="shrink-0 text-[#141414]">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-[#141414]">{title}</span>
        <span className="block truncate text-sm text-[#6d6d6d]">{subtitle}</span>
      </span>
      <svg className="h-5 w-5 shrink-0 text-[#141414]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#d2d2d2] bg-white divide-y divide-[#e6e6e6]">
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
      className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-[#f7f7f7]"
    >
      <span className={selected ? "font-bold text-[#141414]" : "text-[#141414]"}>{label}</span>
      {selected && (
        <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
    return (
      <div className="min-h-screen bg-[#f3f3f3]">
        <Header />
        <p className="pt-20 text-center text-[#6d6d6d]">Chargement…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#f3f3f3]">
        <Header />
        <p className="pt-20 text-center text-[#6d6d6d]">
          Aucun profil.{" "}
          <Link href="/" className="text-emerald-600 underline">
            Créer un profil
          </Link>
        </p>
      </div>
    );
  }

  const back = () => setView("home");
  const langLabel = (code: string) => LANGS.find((l) => l.code === code)?.label || code;

  const titles: Record<View, string> = {
    home: "Gérez votre profil et vos préférences",
    edit: "Modifiez votre profil",
    icon: "Choisissez une icône de profil",
    lock: "Verrouillage du profil",
    langues: "Langues",
    "sous-titres": "Affichage des sous-titres",
    lecture: "Paramètres de lecture",
    historique: `Historique du profil ${profile.name}`,
  };

  const wide = view === "icon";

  return (
    <div className="min-h-screen bg-[#f3f3f3] text-[#141414]">
      <Header />

      <div className={`mx-auto px-6 pb-20 pt-8 ${wide ? "max-w-[1300px]" : "max-w-[1100px]"}`}>
        <button
          onClick={() => (view === "home" ? window.history.back() : back())}
          className="mb-6 rounded-full p-2 text-[#141414] transition-colors hover:bg-black/5"
          aria-label="Retour"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className={wide ? "" : "mx-auto max-w-[580px]"}>
          <h1
            className={`mb-6 text-[28px] font-bold sm:text-[32px] ${
              wide ? "" : "text-center sm:text-left"
            }`}
          >
            {titles[view]}
          </h1>

          {profiles.length > 1 && view === "home" && (
            <div className="mb-6 flex flex-wrap gap-2">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setCurrentId(p.id)}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                    p.id === profile.id
                      ? "border-[#141414] font-semibold"
                      : "border-[#d2d2d2] text-[#6d6d6d] hover:text-[#141414]"
                  }`}
                >
                  <span className="h-6 w-6 overflow-hidden rounded">
                    <Avatar avatarUrl={p.avatarUrl} name={p.name} className="h-full w-full" />
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

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
                <h2 className="mb-2 text-sm text-[#6d6d6d]">Préférences</h2>
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
                  className="flex w-full items-center gap-4 px-5 py-5 transition-colors hover:bg-[#f7f7f7]"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <circle cx="12" cy="8" r="4" />
                    <path d="M5 21a7 7 0 0114 0" />
                  </svg>
                  <span className="flex-1">
                    <span className="block font-bold">Compte</span>
                    <span className="block text-sm text-[#6d6d6d]">E-mail, mot de passe, abonnement</span>
                  </span>
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </Card>

              <button
                onClick={removeProfile}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#d2d2d2] bg-white py-4 font-bold text-[#c11119] transition-colors hover:bg-[#f7f7f7]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
                </svg>
                Supprimer le profil
              </button>
            </div>
          )}

          {view === "edit" && (
            <EditView
              profile={profile}
              saving={saving}
              onIcon={() => setView("icon")}
              onCancel={back}
              onDelete={removeProfile}
              onSave={async (name) => {
                if (await patch({ name })) back();
              }}
            />
          )}

          {view === "icon" && (
            <IconGallery
              profile={profile}
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
                <h2 className="mb-2 text-sm text-[#6d6d6d]">Langue de l&apos;application</h2>
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
                <h2 className="mb-2 text-sm text-[#6d6d6d]">Langue audio préférée</h2>
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
              <div className="rounded-lg border border-[#d2d2d2] bg-black p-8 text-center">
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
                <h2 className="mb-2 text-sm text-[#6d6d6d]">Langue des sous-titres</h2>
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
                <h2 className="mb-2 text-sm text-[#6d6d6d]">Taille du texte</h2>
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
      </div>
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
      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-[#f7f7f7]"
    >
      <span>{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-emerald-600" : "bg-[#d2d2d2]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
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
  onCancel,
  onDelete,
  onSave,
}: {
  profile: Profile;
  saving: boolean;
  onIcon: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(profile.name);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-5">
        <button
          onClick={onIcon}
          className="group relative h-[100px] w-[100px] shrink-0 overflow-hidden rounded"
          aria-label="Choisir une icône de profil"
        >
          <Avatar avatarUrl={profile.avatarUrl} name={profile.name} className="h-full w-full" />
          <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-100 transition-opacity">
            <span className="rounded-full bg-white/90 p-1.5">
              <svg className="h-4 w-4 text-[#141414]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.4-9.4a2 2 0 112.8 2.8L11.8 15H9v-2.8l8.6-8.6z" />
              </svg>
            </span>
          </span>
        </button>

        <label className="flex-1 rounded border border-[#141414] px-3 py-2">
          <span className="block text-xs text-[#4b5563]">Nom de profil</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="w-full bg-transparent text-[17px] text-[#141414] outline-none"
          />
        </label>
      </div>

      <button
        onClick={() => onSave(name)}
        disabled={saving || !name.trim()}
        className="w-full rounded bg-[#141414] py-3.5 font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
      >
        {saving ? "…" : "Enregistrer"}
      </button>

      <button onClick={onCancel} className="w-full py-1 font-bold text-[#141414] hover:underline">
        Annuler
      </button>

      <div className="border-t border-[#d2d2d2] pt-6">
        <button
          onClick={onDelete}
          className="w-full rounded-lg border border-[#d2d2d2] bg-white py-4 font-bold text-[#c11119] transition-colors hover:bg-[#f7f7f7]"
        >
          Supprimer le profil
        </button>
      </div>
    </div>
  );
}

function IconGallery({
  profile,
  onPick,
}: {
  profile: Profile;
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-[#6d6d6d]">
          Pour {profile.name}
          <span className="h-6 w-6 overflow-hidden rounded">
            <Avatar avatarUrl={profile.avatarUrl} name={profile.name} className="h-full w-full" />
          </span>
        </p>
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
          className="rounded border border-[#141414] px-4 py-2 text-sm font-bold text-[#141414] transition-colors hover:bg-black/5"
        >
          Importer ma propre photo
        </button>
      </div>

      {groups.map((g) => (
        <div key={g.title}>
          <h2 className="mb-3 text-lg font-bold">{g.title}</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {g.icons.map((icon) => (
              <button
                key={icon.url}
                onClick={() => onPick(icon.url)}
                title={icon.title}
                className={`h-[110px] w-[110px] shrink-0 overflow-hidden rounded transition-all ${
                  profile.avatarUrl === icon.url
                    ? "ring-4 ring-emerald-600"
                    : "hover:ring-4 hover:ring-[#141414]/30"
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
      <p className="text-[#6d6d6d]">
        Un code à 4 chiffres sera demandé pour ouvrir ce profil. Laisse vide et enregistre pour
        retirer le verrouillage.
      </p>
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        placeholder={locked ? "Nouveau code (4 chiffres)" : "Code (4 chiffres)"}
        className="w-full rounded border border-[#141414] px-4 py-3.5 text-center text-2xl tracking-[0.5em] text-[#141414] outline-none placeholder:text-base placeholder:tracking-normal placeholder:text-[#6d6d6d]"
      />
      <button
        onClick={() => onSave(pin)}
        disabled={saving || (pin.length > 0 && pin.length < 4)}
        className="w-full rounded bg-[#141414] py-3.5 font-bold text-white transition-colors hover:bg-black disabled:opacity-50"
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
        <h2 className="mb-2 text-sm text-[#6d6d6d]">Catégorie d&apos;âge</h2>
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
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm text-[#6d6d6d]">Titres vus</h2>
          {items.length > 0 && (
            <button
              onClick={() => {
                clearHistory();
                setItems([]);
              }}
              className="text-sm font-semibold text-[#0071eb] hover:underline"
            >
              Tout masquer
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="text-[#6d6d6d]">Rien pour l&apos;instant.</p>
        ) : (
          <Card>
            {items.map((h) => (
              <div key={`${h.type}-${h.id}`} className="flex items-center gap-3 px-5 py-3">
                <span className="w-20 shrink-0 text-xs text-[#6d6d6d]">
                  {new Date(h.timestamp).toLocaleDateString("fr-FR")}
                </span>
                <Link
                  href={h.type === "film" ? `/films/${h.filmId || h.id}` : `/series/${h.seriesId}`}
                  className="min-w-0 flex-1 truncate text-sm text-[#0071eb] hover:underline"
                >
                  {h.seriesTitle ? `${h.seriesTitle} : S${h.season} · ${h.title}` : h.title}
                </Link>
                <button
                  onClick={() => {
                    removeFromHistory(h.id, h.type);
                    setItems(getWatchHistory());
                  }}
                  className="shrink-0 text-xs text-[#6d6d6d] hover:text-[#c11119]"
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
