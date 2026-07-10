"use client";

import { useRef, useState, useEffect } from "react";

type MediaType = "movie" | "tv";

interface Server {
  id: string;
  label: string;
  fr: boolean;
  build: (tmdbId: number, season?: number, episode?: number) => string;
}

// Multi-source list, all keyed by TMDB id so links resolve dynamically and
// don't rot like single-file embeds.
// Working, reliable sources are listed first so a film PLAYS on click. vidsrc
// renders a real player (choose audio/subtitle track via its ⚙ menu, FR when
// available). frembed (VF) is kept as an option but is currently unstable.
const MOVIE_SERVERS: Server[] = [
  { id: "vidsrc", label: "Serveur 1", fr: false, build: (id) => `https://vidsrc.to/embed/movie/${id}` },
  { id: "2embed", label: "Serveur 2", fr: false, build: (id) => `https://www.2embed.cc/embed/${id}` },
  { id: "frembed-live", label: "Serveur 3 · VF", fr: true, build: (id) => `https://frembed.live/api/film.php?id=${id}` },
  { id: "frembed-xyz", label: "Serveur 4 · VF", fr: true, build: (id) => `https://frembed.xyz/api/film.php?id=${id}` },
];

const TV_SERVERS: Server[] = [
  { id: "vidsrc", label: "Serveur 1", fr: false, build: (id, s, e) => `https://vidsrc.to/embed/tv/${id}/${s}/${e}` },
  { id: "2embed", label: "Serveur 2", fr: false, build: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}` },
  { id: "frembed-live", label: "Serveur 3 · VF", fr: true, build: (id, s, e) => `https://frembed.live/api/serie.php?id=${id}&sa=${s}&epi=${e}` },
  { id: "frembed-xyz", label: "Serveur 4 · VF", fr: true, build: (id, s, e) => `https://frembed.xyz/api/serie.php?id=${id}&sa=${s}&epi=${e}` },
];

interface Props {
  tmdbId: number;
  type: MediaType;
  season?: number;
  episode?: number;
  title: string;
}

export function MultiServerPlayer({ tmdbId, type, season, episode, title }: Props) {
  const servers = type === "movie" ? MOVIE_SERVERS : TV_SERVERS;
  const [active, setActive] = useState(servers[0].id);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const current = servers.find((s) => s.id === active) ?? servers[0];
  const src = current.build(tmdbId, season, episode);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  return (
    <div>
      <div ref={containerRef} className={`relative w-full overflow-hidden bg-black ${isFullscreen ? "h-screen" : "aspect-video"}`}>
        <iframe
          key={src}
          src={src}
          className="h-full w-full"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          title={title}
          style={{ border: "none" }}
          referrerPolicy="origin"
        />
        <button
          onClick={toggleFullscreen}
          className="absolute bottom-3 right-3 z-10 rounded-lg bg-black/70 p-2 text-white/80 hover:text-white hover:bg-black/90 transition-all backdrop-blur-sm"
          title={isFullscreen ? "Quitter le plein écran" : "Plein écran"}
        >
          {isFullscreen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
          )}
        </button>
      </div>

      {/* Server selector */}
      <div className="flex flex-wrap items-center gap-2 bg-[#16213e] px-3 py-2.5">
        <span className="text-xs text-gray-400 mr-1">Lecteurs :</span>
        {servers.map((s) => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              active === s.id
                ? "bg-purple-600 text-white"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            {s.label}
            {s.fr && <span className="ml-1 text-[9px] opacity-80">🇫🇷</span>}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-gray-500">Si un lecteur ne marche pas, essayez-en un autre.</span>
      </div>
    </div>
  );
}
