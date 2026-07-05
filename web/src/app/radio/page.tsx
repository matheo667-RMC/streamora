"use client";

import { useState, useRef, useEffect } from "react";
import { radioStations, RadioStation } from "@/lib/channels-data";

export default function RadioPage() {
  const [playing, setPlaying] = useState<string | null>(null);
  const [filter, setFilter] = useState("Tous");
  const audioRef = useRef<HTMLAudioElement>(null);

  const genres = ["Tous", ...Array.from(new Set(radioStations.map(r => r.genre)))];
  const filtered = filter === "Tous" ? radioStations : radioStations.filter(r => r.genre === filter);

  const playStation = (station: RadioStation) => {
    if (playing === station.id) {
      audioRef.current?.pause();
      setPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = station.streamUrl;
        audioRef.current.play().catch(() => {});
      }
      setPlaying(station.id);
    }
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const currentStation = radioStations.find(r => r.id === playing);

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      <audio ref={audioRef} />

      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-purple-400">📻</span> Radios
        </h1>
        <p className="text-gray-400 text-sm">Écoute tes radios françaises préférées en direct</p>
      </div>

      {/* Genre filter */}
      <div className="px-6 pb-4 flex flex-wrap gap-2">
        {genres.map(g => (
          <button
            key={g}
            onClick={() => setFilter(g)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === g
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Station grid */}
      <div className="px-6 pb-32 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map(station => (
          <button
            key={station.id}
            onClick={() => playStation(station)}
            className={`group relative flex flex-col items-center p-4 rounded-xl transition-all duration-200 ${
              playing === station.id
                ? "bg-purple-600/20 border border-purple-500/50 shadow-lg shadow-purple-600/10"
                : "bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10"
            }`}
          >
            {/* Logo */}
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center overflow-hidden mb-3">
              <img
                src={station.logo}
                alt={station.name}
                className="w-12 h-12 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239333ea'%3E%3Cpath d='M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/%3E%3C/svg%3E"; }}
              />
            </div>

            {/* Name */}
            <span className="text-sm font-medium text-center leading-tight">{station.name}</span>
            <span className="text-[10px] text-gray-500 mt-1">{station.genre}</span>

            {/* Playing indicator */}
            {playing === station.id && (
              <div className="absolute top-2 right-2 flex items-center gap-0.5">
                <div className="w-1 h-3 bg-purple-400 rounded-full animate-pulse" />
                <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                <div className="w-1 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Now playing bar */}
      {currentStation && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#16213e]/95 backdrop-blur-lg border-t border-purple-500/20 px-6 py-4 flex items-center gap-4 z-50">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
            <img src={currentStation.logo} alt="" className="w-7 h-7 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentStation.name}</p>
            <p className="text-xs text-gray-400">En direct • {currentStation.genre}</p>
          </div>
          <button
            onClick={() => playStation(currentStation)}
            className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center hover:bg-purple-500 transition-colors"
          >
            <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
