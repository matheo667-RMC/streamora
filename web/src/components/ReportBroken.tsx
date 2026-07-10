"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  type: "film" | "episode";
  id: string;
  seriesId?: string;
}

export function ReportBroken({ type, id, seriesId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function remove() {
    if (busy) return;
    if (!confirm("Ce lien ne marche pas ? Il sera supprimé du site.")) return;
    setBusy(true);
    try {
      if (type === "film") {
        await fetch(`/api/films/${id}`, { method: "DELETE" });
      } else if (seriesId) {
        await fetch(`/api/series/${seriesId}/episodes`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ episodeId: id }),
        });
      }
      setDone(true);
      if (type === "film") router.push("/films");
      else router.refresh();
    } catch {
      setBusy(false);
    }
  }

  if (done) return <span className="text-xs text-green-400">Supprimé ✓</span>;

  return (
    <button
      onClick={remove}
      disabled={busy}
      className="text-xs text-gray-500 hover:text-red-400 transition-colors underline decoration-dotted"
      title="Signaler que ce lien ne fonctionne pas (supprime le titre)"
    >
      {busy ? "Suppression…" : "Ce lien ne marche pas ?"}
    </button>
  );
}
