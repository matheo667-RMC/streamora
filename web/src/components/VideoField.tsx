"use client";

import { useEffect, useRef, useState } from "react";
import { clearPending, readPending, uploadVideo, type Pending } from "@/lib/uploadVideo";

/** Video picker used inside the film/episode forms: the file goes straight to
 *  the user's hard drive through their own server and fills in the URL, so no
 *  link ever has to be copied by hand. */
export function VideoField({
  value,
  onChange,
  onBlur,
  label = "Vidéo",
}: {
  value: string;
  onChange: (url: string) => void;
  onBlur?: () => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [showUrl, setShowUrl] = useState(false);

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
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          {value ? "Remplacer la vidéo" : pending ? "Reprendre l'envoi (même fichier)" : "Choisir une vidéo sur mon appareil"}
        </button>
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
