"use client";

import { useRef, useState } from "react";

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

    // The file is stored on the user's own hard drive, through their PC server.
    let base = "";
    try {
      const res = await fetch("/api/server-url", { cache: "no-store" });
      base = ((await res.json()).serverBaseUrl || "").replace(/\/+$/, "");
    } catch {}
    if (!base) {
      setError(
        "Ton serveur n'est pas configuré. Lance streamora_server.py, copie l'adresse https://…serveousercontent.com, colle-la dans « Adresse de mon serveur » puis réessaie."
      );
      return;
    }

    setUploading(true);
    try {
      const publicUrl: string = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${base}/upload`);
        xhr.setRequestHeader("X-Filename", encodeURIComponent(file.name));
        xhr.setRequestHeader("Content-Type", "application/octet-stream");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              resolve(`${base}${data.url}`);
            } catch {
              reject(new Error("Réponse du serveur invalide"));
            }
          } else {
            reject(new Error(`Le serveur a répondu ${xhr.status}`));
          }
        };
        xhr.onerror = () =>
          reject(new Error("Impossible de joindre ton serveur (est-il bien lancé ?)"));
        xhr.send(file);
      });
      setUrl(publicUrl);
      onUploaded?.(publicUrl);
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
        Choisis une vidéo (n&apos;importe quelle durée). Elle est enregistrée sur <b>ton disque dur</b> (via ton serveur)
        et tu récupères un <b>lien public</b> à coller dans un film/épisode.
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
