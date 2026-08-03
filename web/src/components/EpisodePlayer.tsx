"use client";

import { useState, useRef, useEffect } from "react";
import { VideoPlayer } from "./VideoPlayer";
import { MultiServerPlayer } from "./MultiServerPlayer";
import { addToHistory, getLastWatchedForSeries, WatchHistoryItem } from "@/lib/watch-history";
import { ReportBroken } from "./ReportBroken";

interface Episode {
  id: string;
  season: number;
  number: number;
  title: string;
  videoUrl: string;
  duration: string;
}

interface Props {
  seasons: number[];
  episodes: Episode[];
  seriesTitle: string;
  seriesId: string;
  seriesTmdbId?: number | null;
  poster?: string;
}

export function EpisodePlayer({ seasons, episodes, seriesTitle, seriesId, seriesTmdbId, poster }: Props) {
  const [activeSeason, setActiveSeason] = useState(seasons[0] || 1);
  const [playingEp, setPlayingEp] = useState<Episode | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [resumeItem, setResumeItem] = useState<WatchHistoryItem | null>(null);
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const last = getLastWatchedForSeries(seriesId);
    if (last) setResumeItem(last);
  }, [seriesId]);

  const handlePlayEp = (ep: Episode) => {
    if (!ep.videoUrl && !seriesTmdbId) return;
    setPlayingEp(ep);
    addToHistory({
      id: ep.id,
      type: "episode",
      title: ep.title || `Épisode ${ep.number}`,
      posterUrl: poster,
      seriesId,
      seriesTitle,
      season: ep.season,
      episodeNumber: ep.number,
      videoUrl: ep.videoUrl || `tmdb:${seriesTmdbId}`,
    });
  };

  const handleResume = () => {
    if (!resumeItem) return;
    const ep = episodes.find(e => e.id === resumeItem.id);
    if (ep) {
      setActiveSeason(ep.season);
      setPlayingEp(ep);
    }
    setResumeDismissed(true);
  };

  const seasonEpisodes = episodes.filter(ep => ep.season === activeSeason);

  const ordered = [...episodes].sort((a, b) => a.season - b.season || a.number - b.number);
  const nextEp = playingEp
    ? ordered[ordered.findIndex(e => e.id === playingEp.id) + 1] ?? null
    : null;

  return (
    <div className="mt-6 space-y-6">
      {/* Resume dialog */}
      {resumeItem && !resumeDismissed && !playingEp && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-600/10 p-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="shrink-0 rounded-full bg-emerald-600/20 p-2">
              <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white">
                Reprendre {resumeItem.title}
                {resumeItem.season && <span className="text-emerald-400"> (S{resumeItem.season} E{resumeItem.episodeNumber})</span>}
              </p>
              <p className="text-xs text-gray-400">Voulez-vous reprendre là où vous en étiez ?</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleResume} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors">
                Oui
              </button>
              <button onClick={() => setResumeDismissed(true)} className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/20 transition-colors">
                Non
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video player */}
      {playingEp && (playingEp.videoUrl || seriesTmdbId) && (
        <div className="rounded-xl overflow-hidden bg-[#16213e] border border-white/5 shadow-2xl shadow-black/50">
          {seriesTmdbId ? (
            <MultiServerPlayer
              tmdbId={seriesTmdbId}
              type="tv"
              season={playingEp.season}
              episode={playingEp.number}
              title={`${seriesTitle} - ${playingEp.title || `Episode ${playingEp.number}`}`}
            />
          ) : (
            <VideoPlayer
              videoUrl={playingEp.videoUrl}
              title={`${seriesTitle} - ${playingEp.title || `Episode ${playingEp.number}`}`}
              poster={poster}
            />
          )}
          <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
            <p className="text-sm font-medium">
              <span className="text-emerald-400">S{String(playingEp.season).padStart(2, "0")}E{String(playingEp.number).padStart(2, "0")}</span>
              <span className="mx-2 text-gray-600">—</span>
              <span className="text-white">{playingEp.title || `Episode ${playingEp.number}`}</span>
            </p>
            <div className="flex items-center gap-4">
              {!seriesTmdbId && <ReportBroken type="episode" id={playingEp.id} seriesId={seriesId} />}
              {nextEp ? (
                <button
                  onClick={() => { setActiveSeason(nextEp.season); handlePlayEp(nextEp); }}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 5v14l8-7zM13 5v14l8-7z" /></svg>
                  Épisode suivant
                </button>
              ) : playingEp.duration && (
                <span className="text-xs text-gray-500">{playingEp.duration}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Season selector - Netflix dropdown style */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold">Épisodes</h2>

        {seasons.length > 1 ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
            >
              Saison {activeSeason}
              <svg className={`h-4 w-4 text-gray-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-lg border border-white/10 bg-gray-900/95 backdrop-blur-xl py-1 shadow-xl">
                {seasons.map(s => (
                  <button
                    key={s}
                    onClick={() => { setActiveSeason(s); setDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      activeSeason === s
                        ? "bg-emerald-600/20 text-emerald-300 font-medium"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    Saison {s}
                    {activeSeason === s && (
                      <span className="ml-2 text-emerald-400">●</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : seasons.length === 1 ? (
          <span className="text-sm text-gray-400 bg-white/5 rounded-lg px-4 py-2 border border-white/10">Saison {seasons[0]}</span>
        ) : null}
      </div>

      {/* Episode list */}
      <div className="space-y-px rounded-xl overflow-hidden border border-white/5 bg-[#16213e]/80">
        {seasonEpisodes.map((ep, idx) => (
          <div key={ep.id}
            className={`flex items-center gap-4 sm:gap-5 p-4 sm:p-5 cursor-pointer transition-all ${
              playingEp?.id === ep.id
                ? "bg-emerald-500/10"
                : idx % 2 === 0
                  ? "bg-[#16213e]/60 hover:bg-[#1a1a40]"
                  : "bg-[#16213e]/30 hover:bg-[#1a1a40]"
            }`}
            onClick={() => handlePlayEp(ep)}>

            {/* Episode number */}
            <div className="flex-shrink-0 w-8 text-center">
              <span className={`text-lg sm:text-xl font-semibold ${playingEp?.id === ep.id ? "text-emerald-400" : "text-gray-600"}`}>
                {idx + 1}
              </span>
            </div>

            {/* Play icon / equalizer */}
            <div className={`flex-shrink-0 flex h-14 w-14 sm:h-16 sm:w-20 items-center justify-center rounded-md transition-colors ${
              playingEp?.id === ep.id ? "bg-emerald-600/30" : "bg-white/5"
            }`}>
              {playingEp?.id === ep.id ? (
                <div className="flex gap-0.5 items-end h-5">
                  <div className="w-1 h-full bg-emerald-400 rounded-full animate-pulse" />
                  <div className="w-1 h-3 bg-emerald-400 rounded-full animate-pulse [animation-delay:150ms]" />
                  <div className="w-1 h-4 bg-emerald-400 rounded-full animate-pulse [animation-delay:300ms]" />
                  <div className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse [animation-delay:450ms]" />
                </div>
              ) : (
                <svg className="h-6 w-6 text-white/70 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </div>

            {/* Episode info */}
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm sm:text-base ${playingEp?.id === ep.id ? "text-white" : "text-gray-200"}`}>
                {ep.title || `Épisode ${ep.number}`}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">S{String(ep.season).padStart(2, "0")}E{String(ep.number).padStart(2, "0")}</span>
                {ep.duration && (
                  <>
                    <span className="h-0.5 w-0.5 rounded-full bg-gray-700" />
                    <span className="text-xs text-gray-500">{ep.duration}</span>
                  </>
                )}
              </div>
            </div>

            {/* Action */}
            {(ep.videoUrl || seriesTmdbId) ? (
              <div className="flex-shrink-0">
                {playingEp?.id === ep.id ? (
                  <span className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">En lecture</span>
                ) : (
                  <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-400 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30 transition-colors">
                    Regarder
                  </span>
                )}
              </div>
            ) : (
              <span className="flex-shrink-0 text-xs text-gray-600 italic">Bientôt</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
