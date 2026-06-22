"use client";

import { useState } from "react";
import { VideoPlayer } from "./VideoPlayer";

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
  poster?: string;
}

export function EpisodePlayer({ seasons, episodes, seriesTitle, poster }: Props) {
  const [activeSeason, setActiveSeason] = useState(seasons[0] || 1);
  const [playingEp, setPlayingEp] = useState<Episode | null>(null);

  const seasonEpisodes = episodes.filter(ep => ep.season === activeSeason);

  return (
    <div className="mt-8 space-y-6">
      {/* Video player */}
      {playingEp && playingEp.videoUrl && (
        <div className="rounded-xl overflow-hidden bg-gray-900 border border-white/5">
          <VideoPlayer
            videoUrl={playingEp.videoUrl}
            title={`${seriesTitle} - ${playingEp.title || `Episode ${playingEp.number}`}`}
            poster={poster}
          />
          <div className="px-4 py-3 border-t border-white/5">
            <p className="text-sm font-medium">
              <span className="text-purple-400">S{String(playingEp.season).padStart(2, "0")}E{String(playingEp.number).padStart(2, "0")}</span>
              <span className="mx-2 text-gray-600">—</span>
              <span className="text-white">{playingEp.title || `Episode ${playingEp.number}`}</span>
            </p>
          </div>
        </div>
      )}

      {/* Season selector */}
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold">Episodes</h2>
        {seasons.length > 1 && (
          <div className="flex gap-1 bg-gray-900/50 rounded-lg p-1 border border-white/5">
            {seasons.map(s => (
              <button key={s} onClick={() => { setActiveSeason(s); }}
                className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${activeSeason === s ? "bg-purple-600 text-white shadow-lg shadow-purple-900/30" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                Saison {s}
              </button>
            ))}
          </div>
        )}
        {seasons.length === 1 && (
          <span className="text-sm text-gray-400">Saison {seasons[0]}</span>
        )}
      </div>

      {/* Episode list - Netflix style */}
      <div className="space-y-2">
        {seasonEpisodes.map((ep, idx) => (
          <div key={ep.id}
            className={`flex items-center gap-4 rounded-xl border p-4 cursor-pointer transition-all hover:scale-[1.01] ${
              playingEp?.id === ep.id
                ? "border-purple-500/50 bg-purple-500/10 shadow-lg shadow-purple-900/10"
                : "border-white/5 bg-gray-900/50 hover:border-white/10 hover:bg-gray-900"
            }`}
            onClick={() => ep.videoUrl && setPlayingEp(ep)}>

            {/* Episode number */}
            <div className="flex-shrink-0 w-8 text-center">
              <span className={`text-lg font-semibold ${playingEp?.id === ep.id ? "text-purple-400" : "text-gray-600"}`}>
                {idx + 1}
              </span>
            </div>

            {/* Play icon */}
            <div className={`flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-lg transition-colors ${
              playingEp?.id === ep.id ? "bg-purple-600" : "bg-white/5 group-hover:bg-white/10"
            }`}>
              {playingEp?.id === ep.id ? (
                <div className="flex gap-0.5">
                  <div className="w-1 h-4 bg-white rounded-full animate-pulse" />
                  <div className="w-1 h-4 bg-white rounded-full animate-pulse [animation-delay:150ms]" />
                  <div className="w-1 h-4 bg-white rounded-full animate-pulse [animation-delay:300ms]" />
                </div>
              ) : (
                <svg className="h-5 w-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </div>

            {/* Episode info */}
            <div className="flex-1 min-w-0">
              <p className={`font-medium truncate ${playingEp?.id === ep.id ? "text-white" : "text-gray-200"}`}>
                {ep.title || `Episode ${ep.number}`}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">E{String(ep.number).padStart(2, "0")}</span>
                {ep.duration && (
                  <>
                    <span className="h-0.5 w-0.5 rounded-full bg-gray-700" />
                    <span className="text-xs text-gray-500">{ep.duration}</span>
                  </>
                )}
              </div>
            </div>

            {/* Status */}
            {ep.videoUrl ? (
              <span className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                playingEp?.id === ep.id
                  ? "bg-purple-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-purple-500/20 hover:text-purple-300"
              }`}>
                {playingEp?.id === ep.id ? "En lecture" : "Regarder"}
              </span>
            ) : (
              <span className="flex-shrink-0 text-xs text-gray-600">Bientot</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
