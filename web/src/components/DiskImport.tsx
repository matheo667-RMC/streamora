"use client";

import { useState } from "react";
import { fastBase, serverBase } from "@/lib/uploadVideo";

/** One click to publish every video sitting on the user's drives: the site
 *  parses the file names and fetches title, year, plot and poster itself. */
export function DiskImport() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run() {
    setBusy(true);
    setMessage("Lecture de tes disques…");
    try {
      const base = await fastBase(await serverBase());
      if (!base) throw new Error("Ton serveur n'est pas lancé.");
      const files = (await (await fetch(`${base}/api/files`, { cache: "no-store" })).json()).files || [];
      setMessage(`${files.length} vidéo(s) trouvée(s) — ajout au site en cours…`);

      let films = 0;
      let episodes = 0;
      // Par paquets : une grosse bibliotheque depasserait le temps max d'une
      // requete, et on voit la progression avancer.
      for (let i = 0; i < files.length; i += 20) {
        const res = await fetch("/api/admin/import-disk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: files.slice(i, i + 20) }),
        });
        if (!res.ok) throw new Error("Le site a refusé l'import.");
        const data = await res.json();
        films += data.films || 0;
        episodes += data.episodes || 0;
        setMessage(`${Math.min(i + 20, files.length)}/${files.length} — ${films} film(s), ${episodes} épisode(s) ajoutés…`);
      }
      setMessage(`Terminé : ${films} film(s) et ${episodes} épisode(s) ajoutés avec affiche, année et résumé.`);
    } catch (err) {
      setMessage((err as Error).message || "Import impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-gray-900/50 p-4">
      <h3 className="text-sm font-bold text-gray-200">Importer tout mon disque</h3>
      <p className="mt-1 text-[11px] text-gray-400">
        Copie tes films et séries sur tes disques avec l&apos;explorateur, puis clique ici : Mr. Robot les ajoute tous
        d&apos;un coup (titre, année, résumé, affiche). Les nouveaux fichiers sont ensuite ajoutés tout seuls.
      </p>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="mt-3 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
      >
        {busy ? "Import en cours…" : "Importer tout mon disque"}
      </button>
      {message && <p className="mt-2 text-[11px] text-emerald-300">{message}</p>}
    </div>
  );
}
