"use client";

import { useEffect, useRef, useState } from "react";

interface Profile {
  id: string;
  name: string;
  avatarUrl: string;
}

const EMOJI_AVATARS = [
  "e:🦊", "e:🐼", "e:🐯", "e:🦁", "e:🐸", "e:🐵",
  "e:🐨", "e:🐷", "e:🐮", "e:🐰", "e:🦄", "e:🐙",
  "e:👾", "e:🤖", "e:👻", "e:🎃", "e:😎", "e:🥷",
  "e:🦖", "e:🐲", "e:⚡", "e:🔥", "e:🌟", "e:🎮",
];

const EMOJI_BG = [
  "#10b981", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899",
  "#14b8a6", "#f97316", "#6366f1", "#84cc16", "#06b6d4", "#eab308",
];

function bgFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return EMOJI_BG[h % EMOJI_BG.length];
}

function Avatar({ avatarUrl, name, className }: { avatarUrl: string; name: string; className?: string }) {
  if (avatarUrl.startsWith("e:")) {
    return (
      <div
        className={`flex items-center justify-center ${className || ""}`}
        style={{ backgroundColor: bgFor(avatarUrl + name) }}
      >
        <span style={{ fontSize: "2.5em", lineHeight: 1 }}>{avatarUrl.slice(2)}</span>
      </div>
    );
  }
  if (avatarUrl.startsWith("http")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={name} className={`object-cover ${className || ""}`} />;
  }
  return (
    <div
      className={`flex items-center justify-center font-bold ${className || ""}`}
      style={{ backgroundColor: bgFor(name || "?") }}
    >
      <span style={{ fontSize: "2em" }}>{(name?.[0] || "?").toUpperCase()}</span>
    </div>
  );
}

const STORAGE_KEY = "streamora-profile";

export function ProfileGate() {
  const [visible, setVisible] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [manage, setManage] = useState(false);
  const [editing, setEditing] = useState<Profile | "new" | null>(null);

  useEffect(() => {
    // Show the picker once per browser session (like Netflix opening the app).
    let picked: string | null = null;
    try {
      picked = sessionStorage.getItem(STORAGE_KEY);
    } catch {}
    if (!picked) setVisible(true);
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/profiles", { cache: "no-store" });
      const data = await res.json();
      setProfiles(Array.isArray(data) ? data : []);
    } catch {
      setProfiles([]);
    }
    setLoading(false);
  }

  function choose(p: Profile) {
    try {
      sessionStorage.setItem(STORAGE_KEY, p.id);
      localStorage.setItem("streamora-profile-name", p.name);
      localStorage.setItem("streamora-profile-avatar", p.avatarUrl);
    } catch {}
    window.dispatchEvent(new CustomEvent("streamora-profile-changed"));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0b0f0b] flex flex-col items-center justify-center px-4 overflow-y-auto py-16">
      {editing ? (
        <ProfileEditor
          profile={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      ) : (
        <>
          <h1 className="text-3xl sm:text-5xl font-semibold text-white mb-10 text-center">
            {manage ? "Gérer les profils" : "Qui regarde ?"}
          </h1>

          {loading ? (
            <p className="text-gray-400">Chargement…</p>
          ) : (
            <div className="flex flex-wrap items-start justify-center gap-4 sm:gap-8 max-w-3xl">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => (manage ? setEditing(p) : choose(p))}
                  className="group flex flex-col items-center gap-2 w-24 sm:w-32"
                >
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-md overflow-hidden ring-2 ring-transparent group-hover:ring-white transition-all">
                    <Avatar avatarUrl={p.avatarUrl} name={p.name} className="w-full h-full" />
                    {manage && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className="text-gray-400 group-hover:text-white text-sm sm:text-base truncate max-w-full">
                    {p.name}
                  </span>
                </button>
              ))}

              {profiles.length < 5 && !manage && (
                <button
                  onClick={() => setEditing("new")}
                  className="group flex flex-col items-center gap-2 w-24 sm:w-32"
                >
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-md flex items-center justify-center text-gray-500 group-hover:text-white transition-colors">
                    <svg className="w-14 h-14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <circle cx="12" cy="12" r="10" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v8m-4-4h8" />
                    </svg>
                  </div>
                  <span className="text-gray-400 group-hover:text-white text-sm sm:text-base">Ajouter un profil</span>
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => setManage((m) => !m)}
            className="mt-12 rounded border border-gray-500 px-6 py-2 text-gray-400 hover:text-white hover:border-white transition-colors text-sm tracking-wide uppercase"
          >
            {manage ? "Terminé" : "Gérer les profils"}
          </button>
        </>
      )}
    </div>
  );
}

function ProfileEditor({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(profile?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || EMOJI_AVATARS[0]);
  const [posters, setPosters] = useState<{ title: string; url: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/avatars", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPosters(Array.isArray(d?.posters) ? d.posters : []))
      .catch(() => {});
  }, []);

  async function uploadPhoto(file: File) {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setAvatarUrl(data.url);
      else setError(data.error || "Échec de l'envoi de la photo");
    } catch {
      setError("Échec de l'envoi de la photo");
    }
    setUploading(false);
  }

  async function save() {
    if (!name.trim()) {
      setError("Choisis un nom");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = profile
        ? await fetch(`/api/profiles/${profile.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, avatarUrl }),
          })
        : await fetch("/api/profiles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, avatarUrl }),
          });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
        setSaving(false);
        return;
      }
      onSaved();
    } catch {
      setError("Erreur de connexion");
      setSaving(false);
    }
  }

  async function remove() {
    if (!profile) return;
    if (!confirm("Supprimer ce profil ?")) return;
    setSaving(true);
    try {
      await fetch(`/api/profiles/${profile.id}`, { method: "DELETE" });
      onSaved();
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-lg">
      <h1 className="text-2xl sm:text-4xl font-semibold text-white mb-8 text-center">
        {profile ? "Modifier le profil" : "Nouveau profil"}
      </h1>

      <div className="flex flex-col items-center gap-6">
        <div className="w-28 h-28 rounded-md overflow-hidden ring-2 ring-white/20">
          <Avatar avatarUrl={avatarUrl} name={name} className="w-full h-full" />
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du profil"
          maxLength={20}
          className="w-full max-w-xs rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-center text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
        />

        <div className="w-full">
          <p className="text-sm text-gray-400 mb-2">Avatar émoji</p>
          <div className="grid grid-cols-8 gap-2">
            {EMOJI_AVATARS.map((e) => (
              <button
                key={e}
                onClick={() => setAvatarUrl(e)}
                className={`aspect-square rounded-md overflow-hidden ring-2 ${avatarUrl === e ? "ring-emerald-500" : "ring-transparent hover:ring-white/40"}`}
              >
                <Avatar avatarUrl={e} name="" className="w-full h-full text-lg" />
              </button>
            ))}
          </div>
        </div>

        {posters.length > 0 && (
          <div className="w-full">
            <p className="text-sm text-gray-400 mb-2">Depuis le catalogue</p>
            <div className="grid grid-cols-6 gap-2">
              {posters.slice(0, 12).map((p) => (
                <button
                  key={p.url}
                  onClick={() => setAvatarUrl(p.url)}
                  className={`aspect-square rounded-md overflow-hidden ring-2 ${avatarUrl === p.url ? "ring-emerald-500" : "ring-transparent hover:ring-white/40"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={p.title} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="w-full">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadPhoto(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full rounded-lg border border-white/15 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:border-white/40 transition-colors"
          >
            {uploading ? "Envoi…" : "Importer une photo"}
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-3 w-full">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-500 transition-colors disabled:opacity-60"
          >
            {saving ? "…" : "Enregistrer"}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/15 px-6 py-3 text-gray-300 hover:text-white transition-colors"
          >
            Annuler
          </button>
          {profile && (
            <button
              onClick={remove}
              disabled={saving}
              className="rounded-lg border border-red-500/40 px-6 py-3 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Supprimer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
