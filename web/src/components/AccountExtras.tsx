"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface Sub {
  hasAccess: boolean; founder: boolean; planLabel: string;
  planExpiresAt: string | null; badges: string[]; watchSeconds: number; image: string | null;
}

const PRESET_AVATARS = ["🎬", "🍿", "🦸", "👾", "🐱", "🐉", "🚀", "🎮", "👑", "🎧", "🌙", "⚡"];
interface Item { id: string; status: string; mediaType: string; mediaId: string; title: string; posterUrl: string }

function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

const SECTIONS = [
  { status: "list", label: "Ma liste" },
  { status: "later", label: "À regarder plus tard" },
  { status: "watched", label: "Déjà vu" },
];

export function AccountExtras() {
  const [sub, setSub] = useState<Sub | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [posters, setPosters] = useState<{ title: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    fetch("/api/subscription").then((r) => r.json()).then(setSub).catch(() => {});
    fetch("/api/library").then((r) => r.json()).then((d) => setItems(d.items || [])).catch(() => {});
    fetch("/api/avatars").then((r) => r.json()).then((d) => setPosters(d.posters || [])).catch(() => {});
  }, []);

  const byStatus = (s: string) => items.filter((i) => i.status === s);

  async function setAvatar(a: string) {
    const res = await fetch("/api/account/avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar: a }),
    });
    if (res.ok) setSub((prev) => (prev ? { ...prev, image: a } : prev));
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    if (!file.type.startsWith("image/")) {
      setUploadError("Choisis une image (jpg, png…).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image trop lourde (max 5 Mo).");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.url) await setAvatar(data.url);
      else setUploadError("Échec de l'envoi. Réessaie.");
    } catch {
      setUploadError("Échec de l'envoi. Réessaie.");
    } finally {
      setUploading(false);
    }
  }

  const currentAvatar = sub?.image || "";

  return (
    <>
      {/* Avatar */}
      <div className="rounded-2xl border border-white/10 bg-gray-900/50 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Mon avatar</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center text-3xl overflow-hidden ring-2 ring-emerald-500/30">
            {currentAvatar.startsWith("http") ? (
              <Image src={currentAvatar} alt="avatar" width={64} height={64} className="object-cover h-full w-full" />
            ) : currentAvatar ? (
              <span>{currentAvatar}</span>
            ) : (
              <span>🎬</span>
            )}
          </div>
          <p className="text-sm text-gray-400">Choisis un avatar :</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              className={`h-11 w-11 rounded-full text-xl flex items-center justify-center transition-all ${
                currentAvatar === a ? "bg-gradient-to-br from-emerald-600 to-green-600 scale-110" : "bg-white/10 hover:bg-white/20"
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        {/* Film/série avatars */}
        {posters.length > 0 && (
          <div className="mt-5">
            <p className="text-sm text-gray-400 mb-2">Avatars films & séries :</p>
            <div className="flex flex-wrap gap-2">
              {posters.map((p) => (
                <button
                  key={p.url}
                  onClick={() => setAvatar(p.url)}
                  title={p.title}
                  className={`h-12 w-12 rounded-full overflow-hidden transition-all ring-2 ${
                    currentAvatar === p.url ? "ring-emerald-500 scale-110" : "ring-white/10 hover:ring-emerald-400/60"
                  }`}
                >
                  <Image src={p.url} alt={p.title} width={48} height={48} className="object-cover h-full w-full" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Photo perso */}
        <div className="mt-5">
          <p className="text-sm text-gray-400 mb-2">Ou mets ta photo :</p>
          <label className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 px-4 py-2 text-sm font-medium cursor-pointer transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V19a2 2 0 002 2h14a2 2 0 002-2v-2.5M7 9l5-5 5 5M12 4v12" />
            </svg>
            {uploading ? "Envoi…" : "Choisir une photo"}
            <input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} disabled={uploading} />
          </label>
          {uploadError && <p className="mt-2 text-xs text-red-400">{uploadError}</p>}
        </div>
      </div>

      {/* Stats */}
      <div className="rounded-2xl border border-white/10 bg-gray-900/50 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Mes statistiques</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 p-4">
            <div className="text-xs text-gray-400">Temps total</div>
            <div className="text-lg font-bold">{fmtTime(sub?.watchSeconds || 0)}</div>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <div className="text-xs text-gray-400">Déjà vu</div>
            <div className="text-lg font-bold">{byStatus("watched").length}</div>
          </div>
        </div>
        {sub?.badges && sub.badges.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-gray-400 mb-2">Badges</div>
            <div className="flex flex-wrap gap-2">
              {sub.badges.map((b) => (
                <span key={b} className="rounded-full bg-gradient-to-r from-emerald-600 to-green-600 px-3 py-1 text-xs font-semibold">{b}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Library */}
      {SECTIONS.map((sec) => {
        const list = byStatus(sec.status);
        return (
          <div key={sec.status} className="rounded-2xl border border-white/10 bg-gray-900/50 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">{sec.label}</h2>
            {list.length === 0 ? (
              <p className="text-sm text-gray-500">Rien pour l&apos;instant.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {list.map((it) => (
                  <Link key={it.id} href={`/${it.mediaType === "film" ? "films" : "series"}/${it.mediaId}`} className="group">
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 ring-1 ring-white/10 group-hover:ring-emerald-500/50">
                      {it.posterUrl && <Image src={it.posterUrl} alt={it.title} fill className="object-cover" sizes="120px" />}
                    </div>
                    <p className="mt-1 text-xs text-center text-gray-300 line-clamp-2">{it.title}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
