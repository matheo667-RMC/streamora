"use client";

import { useEffect, useState, useCallback } from "react";

interface Props {
  mediaType: "film" | "series";
  mediaId: string;
}

interface Review { stars: number; review: string; updatedAt: string }

const LISTS: { status: "list" | "later" | "watched"; label: string; icon: string }[] = [
  { status: "list", label: "Ma liste", icon: "M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" },
  { status: "later", label: "Plus tard", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { status: "watched", label: "Vu", icon: "M5 13l4 4L19 7" },
];

export function LibraryControls({ mediaType, mediaId }: Props) {
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [authed, setAuthed] = useState(true);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const [avg, setAvg] = useState(0);
  const [count, setCount] = useState(0);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [saved, setSaved] = useState(false);

  const loadRatings = useCallback(() => {
    fetch(`/api/ratings?mediaType=${mediaType}&mediaId=${mediaId}`)
      .then((r) => r.json())
      .then((d) => {
        setAvg(d.average || 0);
        setCount(d.count || 0);
        setReviews(d.reviews || []);
        if (d.mine) { setStars(d.mine.stars || 0); setReview(d.mine.review || ""); }
      })
      .catch(() => {});
  }, [mediaType, mediaId]);

  useEffect(() => {
    fetch("/api/library")
      .then((r) => r.json())
      .then((d) => {
        const map: Record<string, boolean> = {};
        (d.items || []).forEach((i: { mediaId: string; status: string }) => {
          if (i.mediaId === mediaId) map[i.status] = true;
        });
        setActive(map);
      })
      .catch(() => setAuthed(false));
    loadRatings();
  }, [mediaId, loadRatings]);

  async function toggle(status: string) {
    const res = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaType, mediaId, status }),
    });
    if (res.status === 401) { setAuthed(false); return; }
    const d = await res.json();
    setActive((a) => ({ ...a, [status]: d.active }));
  }

  async function saveRating(newStars: number) {
    setStars(newStars);
    const res = await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaType, mediaId, stars: newStars, review }),
    });
    if (res.status === 401) { setAuthed(false); return; }
    setSaved(true); setTimeout(() => setSaved(false), 1200);
    loadRatings();
  }

  async function saveReview() {
    const res = await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mediaType, mediaId, stars, review }),
    });
    if (res.status === 401) { setAuthed(false); return; }
    setSaved(true); setTimeout(() => setSaved(false), 1200);
    loadRatings();
  }

  if (!authed) {
    return (
      <a href="/login" className="text-sm text-emerald-400 hover:text-emerald-300">
        Connecte-toi pour ajouter à ta liste et noter
      </a>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {LISTS.map((l) => (
          <button
            key={l.status}
            onClick={() => toggle(l.status)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              active[l.status]
                ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white"
                : "bg-white/10 text-gray-300 hover:bg-white/20"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={l.icon} />
            </svg>
            {active[l.status] ? l.label + " ✓" : l.label}
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => saveRating(n)}
              aria-label={`${n} étoiles`}
            >
              <svg
                className={`h-6 w-6 transition-colors ${(hover || stars) >= n ? "text-yellow-400" : "text-gray-600"}`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-400">
            {avg > 0 ? `${avg.toFixed(1)}/5 (${count})` : "Pas encore de note"}
          </span>
          {saved && <span className="text-xs text-green-400">Enregistré ✓</span>}
        </div>

        <div className="mt-3">
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Laisse un avis (optionnel)…"
            rows={2}
            className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
          <button onClick={saveReview} className="mt-2 rounded-lg bg-white/10 px-4 py-1.5 text-xs font-semibold hover:bg-white/20">
            Publier l&apos;avis
          </button>
        </div>
      </div>

      {reviews.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-300">Avis</h3>
          {reviews.map((r, i) => (
            <div key={i} className="rounded-lg bg-white/5 p-3 text-sm">
              <div className="flex items-center gap-1 text-yellow-400 mb-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <svg key={j} className={`h-3.5 w-3.5 ${j < r.stars ? "text-yellow-400" : "text-gray-700"}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                ))}
              </div>
              <p className="text-gray-300">{r.review}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
