"use client";

import { useEffect, useRef, useState } from "react";
import { clearPending, fastBase, readPending, serverBase, uploadVideo, type Pending } from "@/lib/uploadVideo";

type DiskFile = { name: string; drive: string; size: string; url: string };

/** Video picker used inside the film/episode forms: the file goes straight to
 *  the user's hard drive through their own server and fills in the URL, so no
 *  link ever has to be copied by hand. */
export function VideoField({
  value,
  onChange,
  onBlur,
  onFileName,
  label = "Vidéo",
}: {
  value: string;
  onChange: (url: string) => void;
  onBlur?: () => void;
  onFileName?: (name: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [showUrl, setShowUrl] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [diskFiles, setDiskFiles] = useState<DiskFile[] | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => setPending(readPending()), []);

  useEffect(() => {
    if (!uploading) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);

  async function handleFile(file: File) {
    setError("");
    setProgress(0);
    setUploading(true);
    try {
      const url = await uploadVideo(file, setProgress);
      setPending(null);
      onChange(url);
      onFileName?.(file.name.replace(/\.[^.]+$/, "").replace(/[._]+/g, " ").trim());
      onBlur?.();
    } catch (err) {
      setPending(readPending());
      setError(
        `${(err as Error).message || "Échec de l'envoi"} — rechoisis le même fichier pour reprendre où ça s'est arrêté.`
      );
    } finally {
      setUploading(false);
    }
  }

  /** Copier un film sur le disque avec l'explorateur va ~100x plus vite qu'un
   *  envoi par Internet : on laisse donc choisir un fichier deja present. */
  async function openDisk() {
    setBrowsing(true);
    setError("");
    setDiskFiles(null);
    try {
      const base = await fastBase(await serverBase());
      const res = await fetch(`${base}/api/files`, { cache: "no-store" });
      if (!res.ok) throw new Error("Serveur injoignable");
      const data = await res.json();
      setDiskFiles(data.files || []);
    } catch {
      setError("Impossible de lire tes disques (le serveur est-il lancé ?).");
      setBrowsing(false);
    }
  }

  async function pickDisk(f: DiskFile) {
    const base = await serverBase();
    onChange(f.url.startsWith("http") ? f.url : `${base}${f.url}`);
    onFileName?.(f.name.replace(/\.[^.]+$/, "").replace(/[._]+/g, " ").trim());
    setBrowsing(false);
    setError("");
  }

  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-400">{label}</label>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {pending && !uploading && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-200">
          Envoi interrompu : <b>{pending.name}</b>. Rechoisis le même fichier pour le terminer.{" "}
          <button
            type="button"
            onClick={() => {
              clearPending();
              setPending(null);
            }}
            className="underline hover:text-white"
          >
            Abandonner
          </button>
        </p>
      )}

      {!uploading && (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={openDisk}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
          >
            Choisir une vidéo déjà sur mon disque (instantané)
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-xs font-medium text-gray-300 hover:bg-white/10 transition-colors"
          >
            {pending ? "Reprendre l'envoi (même fichier)" : "Envoyer une vidéo depuis cet appareil (lent)"}
          </button>
        </div>
      )}

      {browsing && (
        <div className="rounded-lg border border-white/10 bg-black/40 p-2">
          <div className="mb-2 flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none"
            />
            <button type="button" onClick={() => setBrowsing(false)} className="text-xs text-gray-400 hover:text-white">
              Fermer
            </button>
          </div>
          {!diskFiles && <p className="text-[11px] text-gray-400">Lecture de tes disques…</p>}
          {diskFiles && diskFiles.length === 0 && (
            <p className="text-[11px] text-gray-400">
              Aucune vidéo trouvée. Copie tes films sur ton disque dur avec l&apos;explorateur, ils apparaîtront ici.
            </p>
          )}
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {(diskFiles || [])
              .filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
              .slice(0, 300)
              .map((f) => (
                <button
                  key={f.url}
                  type="button"
                  onClick={() => pickDisk(f)}
                  className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-[11px] text-gray-200 hover:bg-emerald-600/20"
                >
                  <span className="truncate">{f.name}</span>
                  <span className="shrink-0 text-gray-500">{f.drive} · {f.size}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {uploading && (
        <div>
          <div className="h-2.5 w-full rounded-full bg-black/40 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-gray-400">Envoi sur ton disque dur… {progress}% — garde la page ouverte.</p>
        </div>
      )}

      {value && !uploading && (
        <p className="text-[11px] text-emerald-400 break-all">&#x2714; Vidéo prête : {decodeURIComponent(value.split("/").pop() || "")}</p>
      )}

      {error && <p className="text-[11px] text-red-300">{error}</p>}

      <button type="button" onClick={() => setShowUrl(!showUrl)} className="text-[11px] text-gray-500 hover:text-white underline">
        {showUrl ? "Masquer le lien" : "Ou coller un lien à la main"}
      </button>

      {showUrl && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder="https://... (lien vidéo)"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
        />
      )}
    </div>
  );
}
