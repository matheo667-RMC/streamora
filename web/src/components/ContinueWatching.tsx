"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { getWatchHistory, WatchHistoryItem } from "@/lib/watch-history";

export function ContinueWatching() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);

  useEffect(() => {
    setHistory(getWatchHistory().slice(0, 15));
  }, []);

  if (history.length === 0) return null;

  function timeAgo(ts: number) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `Il y a ${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Il y a ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `Il y a ${days}j`;
  }

  return (
    <section className="rounded-xl border border-white/5 bg-[#141414]/80 p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Continuer à regarder
        </div>
      </div>

      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {history.map((item) => {
          const href = item.type === "film"
            ? `/films/${item.filmId || item.id}`
            : `/series/${item.seriesId}`;
          
          return (
            <Link
              key={`${item.type}-${item.id}-${item.timestamp}`}
              href={href}
              className="flex-none w-[130px] sm:w-[150px] md:w-[170px] group"
            >
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 ring-1 ring-white/10 transition-all duration-300 group-hover:ring-emerald-500/50 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-emerald-900/30">
                {item.posterUrl ? (
                  <Image src={item.posterUrl} alt={item.title} fill className="object-cover" sizes="170px" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-900/30 to-emerald-900/20 text-gray-600">
                    <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="rounded-full bg-emerald-600/90 p-3">
                    <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
                {/* Resume badge */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                  <p className="text-[10px] text-gray-300">{timeAgo(item.timestamp)}</p>
                  {item.type === "episode" && item.season && (
                    <p className="text-[10px] text-emerald-400 font-medium">S{item.season} E{item.episodeNumber}</p>
                  )}
                </div>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-center text-gray-300 line-clamp-2 group-hover:text-white transition-colors">
                {item.type === "episode" ? item.seriesTitle || item.title : item.title}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
