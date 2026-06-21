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
        <div>
          <p className="text-sm text-gray-400 mb-2">
            S{String(playingEp.season).padStart(2, "0")}E{String(playingEp.number).padStart(2, "0")} — {playingEp.title || `Episode ${playingEp.number}`}
          </p>
          <VideoPlayer
            videoUrl={playingEp.videoUrl}
            title={`${seriesTitle} - ${playingEp.title || `Episode ${playingEp.number}`}`}
            poster={poster}
          />
        </div>
      )}

      {/* Season tabs */}
      {seasons.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {seasons.map(s => (
            <button key={s} onClick={() => { setActiveSeason(s); setPlayingEp(null); }}
              className={`rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${activeSeason === s ? "bg-purple-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"}`}>
              Saison {s}
            </button>
          ))}
        </div>
      )}

      {seasons.length === 1 && (
        <h3 className="text-lg font-semibold">Saison {seasons[0]}</h3>
      )}

      {/* Episode list */}
      <div className="space-y-2">
        {seasonEpisodes.map(ep => (
          <div key={ep.id}
            className={`flex items-center gap-4 rounded-lg border p-3 cursor-pointer transition-colors ${playingEp?.id === ep.id ? "border-purple-500 bg-purple-500/10" : "border-gray-800 bg-gray-900 hover:border-gray-700"}`}
            onClick={() => ep.videoUrl && setPlayingEp(ep)}>
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-medium ${playingEp?.id === ep.id ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400"}`}>
              {ep.number}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{ep.title || `Episode ${ep.number}`}</p>
              {ep.duration && <p className="text-xs text-gray-400">{ep.duration}</p>}
            </div>
            {ep.videoUrl && (
              <button className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${playingEp?.id === ep.id ? "bg-purple-600 text-white" : "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"}`}>
                {playingEp?.id === ep.id ? "En cours" : "Regarder"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
