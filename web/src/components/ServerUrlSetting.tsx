"use client";

import { useEffect, useState } from "react";

export function ServerUrlSetting() {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/server-url", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setValue(d.serverBaseUrl || ""))
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/server-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverBaseUrl: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erreur");
      } else {
        setValue(data.serverBaseUrl || "");
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setError("Erreur de connexion");
    }
    setSaving(false);
  }

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
      <div className="flex items-center gap-2 mb-1">
        <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
        <h3 className="font-bold text-base">Adresse de mon serveur</h3>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Colle ici l&apos;adresse publique de ton serveur (elle s&apos;affiche dans la fenêtre du lanceur, ex.
        <span className="text-emerald-300"> https://xxxx.trycloudflare.com</span>). Tes films/épisodes utilisent des liens
        <span className="text-emerald-300"> /media/...</span> : si l&apos;adresse change au redémarrage, tu ne changes que cette case.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://... (adresse publique de ton serveur)"
          className="flex-1 rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
        />
        <button
          onClick={save}
          disabled={saving}
          className={`shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors ${saved ? "bg-green-600" : "bg-emerald-600 hover:bg-emerald-500"} disabled:opacity-60`}
        >
          {saving ? "…" : saved ? "Enregistré !" : "Enregistrer"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
