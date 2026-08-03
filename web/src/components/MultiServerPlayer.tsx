"use client";

import { useRef, useState, useEffect } from "react";

type MediaType = "movie" | "tv";

interface Server {
  id: string;
  label: string;
  fr: boolean;
  build: (tmdbId: number, season?: number, episode?: number) => string;
}

// Sources keyed by TMDB id so links resolve dynamically and never rot. The
// primary plays on click; the others are fallbacks surfaced via a discreet
// "changer de lecteur" control so the UI stays clean (Netflix-like).
const MOVIE_SERVERS: Server[] = [
  { id: "vidlink", label: "Lecteur 1", fr: true, build: (id) => `https://vidlink.pro/movie/${id}` },
  { id: "vidsrccc", label: "Lecteur 2", fr: false, build: (id) => `https://vidsrc.cc/v2/embed/movie/${id}` },
  { id: "2embed", label: "Lecteur 3", fr: false, build: (id) => `https://www.2embed.cc/embed/${id}` },
  { id: "vidsrcxyz", label: "Lecteur 4", fr: false, build: (id) => `https://vidsrc.xyz/embed/movie?tmdb=${id}` },
];

const TV_SERVERS: Server[] = [
  { id: "vidlink", label: "Lecteur 1", fr: true, build: (id, s, e) => `https://vidlink.pro/tv/${id}/${s}/${e}` },
  { id: "vidsrccc", label: "Lecteur 2", fr: false, build: (id, s, e) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}` },
  { id: "2embed", label: "Lecteur 3", fr: false, build: (id, s, e) => `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}` },
  { id: "vidsrcxyz", label: "Lecteur 4", fr: false, build: (id, s, e) => `https://vidsrc.xyz/embed/tv?tmdb=${id}&season=${s}&episode=${e}` },
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [active, setActive] = useState(0);

  // Reset to the primary source when the episode/movie changes.
  useEffect(() => {
    setActive(0);
  }, [tmdbId, season, episode]);

  const src = servers[active].build(tmdbId, season, episode);

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

      {/* Discreet source switcher — if a player doesn't load, pick another. */}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
        <span className="text-gray-500">La vidéo ne se lance pas ?</span>
        {servers.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActive(i)}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              i === active
                ? "bg-emerald-600 text-white"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            {s.label}
            {s.fr ? " · VF" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}
