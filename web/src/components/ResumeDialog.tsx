"use client";

import { useState, useEffect } from "react";
import { getLastWatchedForSeries, WatchHistoryItem } from "@/lib/watch-history";

interface Props {
  seriesId: string;
  onResume: (item: WatchHistoryItem) => void;
}

export function ResumeDialog({ seriesId, onResume }: Props) {
  const [lastWatched, setLastWatched] = useState<WatchHistoryItem | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const item = getLastWatchedForSeries(seriesId);
    if (item) setLastWatched(item);
  }, [seriesId]);

  if (!lastWatched || dismissed) return null;

  function timeAgo(ts: number) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `il y a ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `il y a ${days} jour${days > 1 ? "s" : ""}`;
  }

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-600/10 p-4 mb-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="shrink-0 rounded-full bg-emerald-600/20 p-2">
          <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white">
            Reprendre {lastWatched.title}
            {lastWatched.season && <span className="text-emerald-400"> (S{lastWatched.season} E{lastWatched.episodeNumber})</span>}
          </p>
          <p className="text-xs text-gray-400">{timeAgo(lastWatched.timestamp)}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onResume(lastWatched)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
          >
            Oui
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/20 transition-colors"
          >
            Non
          </button>
        </div>
      </div>
    </div>
  );
}
