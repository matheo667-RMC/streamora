"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

export function VideoUploader({ onUploaded }: { onUploaded?: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleFile(file: File) {
    setError("");
    setUrl("");
    setProgress(0);
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const blob = await upload(`videos/${Date.now()}-${safeName}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload/video-token",
        multipart: true,
        onUploadProgress: (e) => setProgress(Math.round(e.percentage)),
      });
      setUrl(blob.url);
      onUploaded?.(blob.url);
    } catch (err) {
      setError((err as Error).message || "Échec de l'envoi");
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
        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">Nouveau</span>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Choisis une vidéo (n&apos;importe quelle durée). Elle s&apos;envoie et tu récupères un lien public à coller ci-dessous.
      </p>

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
          Choisir une vidéo à envoyer
        </button>
      )}

      {uploading && (
        <div>
          <div className="h-3 w-full rounded-full bg-black/40 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-gray-400">Envoi en cours… {progress}% (ne ferme pas la page)</p>
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
