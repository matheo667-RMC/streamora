"use client";

import { useEffect, useRef, useState } from "react";
import { clearPending, readPending, uploadVideo, type Pending } from "@/lib/uploadVideo";

export function VideoUploader({ onUploaded }: { onUploaded?: (url: string, name: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => setPending(readPending()), []);

  // Closing the page stops the upload: warn, then offer to resume it later.
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
    setUrl("");
    setProgress(0);
    setUploading(true);
    try {
      const publicUrl = await uploadVideo(file, setProgress);
      setPending(null);
      setUrl(publicUrl);
      onUploaded?.(publicUrl, file.name);
    } catch (err) {
      setPending(readPending());
      setError(
        `${(err as Error).message || "Échec de l'envoi"} — rechoisis le même fichier pour reprendre là où ça s'est arrêté.`
      );
    } finally {
      setUploading(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
      <div className="flex items-center gap-2 mb-1">
        <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" />
        </svg>
        <h3 className="font-bold text-base">Uploader une vidéo &rarr; lien public</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Choisis une vidéo (n&apos;importe quelle durée). Elle est enregistrée sur <b>ton disque dur</b> (via ton serveur)
        et tu récupères un <b>lien public</b> à coller dans un film/épisode. Si l&apos;envoi est coupé, rechoisis le même
        fichier : il <b>reprend où il s&apos;était arrêté</b>.
      </p>

      {pending && !uploading && (
        <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          Envoi interrompu : <b>{pending.name}</b>. Choisis le <b>même fichier</b> ci-dessous pour le terminer.
          <button
            onClick={() => {
              clearPending();
              setPending(null);
            }}
            className="ml-2 underline hover:text-white"
          >
            Abandonner
          </button>
        </div>
      )}

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

      {!uploading && !url && (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          {pending ? "Reprendre l'envoi (même fichier)" : "Choisir une vidéo à envoyer"}
        </button>
      )}

      {uploading && (
        <div>
          <div className="h-3 w-full rounded-full bg-black/40 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Envoi en cours… {progress}% — garde la page ouverte (sinon tu pourras reprendre plus tard).
          </p>
        </div>
      )}

      {url && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              className="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-emerald-300"
            />
            <button onClick={copy} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors ${copied ? "bg-green-600" : "bg-emerald-600 hover:bg-emerald-500"}`}>
              {copied ? "Copié !" : "Copier"}
            </button>
          </div>
          <button
            onClick={() => { setUrl(""); setProgress(0); }}
            className="text-xs text-gray-400 hover:text-white underline"
          >
            Envoyer une autre vidéo
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    </div>
  );
}
