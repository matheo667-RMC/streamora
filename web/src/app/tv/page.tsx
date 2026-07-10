"use client";

import { useState, useRef, useEffect } from "react";
import { tvChannels, TVChannel } from "@/lib/channels-data";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { IptvSection } from "@/components/IptvSection";

export default function TVPage() {
  const [activeChannel, setActiveChannel] = useState<TVChannel | null>(null);
  const [filter, setFilter] = useState("Tous");
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);

  const categories = ["Tous", ...Array.from(new Set(tvChannels.map(c => c.category)))];
  const filtered = filter === "Tous" ? tvChannels : tvChannels.filter(c => c.category === filter);

  const playChannel = (channel: TVChannel) => {
    setActiveChannel(channel);
  };

  useEffect(() => {
    if (!activeChannel || !videoRef.current) return;
    const video = videoRef.current;
    const url = activeChannel.streamUrl;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (url.includes(".m3u8")) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        video.play().catch(() => {});
      } else {
        import("hls.js").then(({ default: Hls }) => {
          if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              video.play().catch(() => {});
            });
            hlsRef.current = hls;
          }
        });
      }
    } else {
      video.src = url;
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeChannel]);

  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      {/* Header */}
      <div className="px-6 pt-24 pb-4">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-purple-400">📺</span> TV en Direct
        </h1>
        <p className="text-gray-400 text-sm">Regarde les chaînes TV françaises en direct</p>
      </div>

      {/* Video player */}
      {activeChannel && (
        <div className="px-6 pb-6">
          <div className="relative aspect-video w-full max-w-4xl mx-auto overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              key={activeChannel.id}
              controls
              className="h-full w-full"
              style={{ filter: "contrast(1.05) saturate(1.1)" }}
            />
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium">EN DIRECT</span>
              <span className="text-xs text-gray-300">• {activeChannel.name}</span>
            </div>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="px-6 pb-4 flex flex-wrap gap-2">
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === c
                ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Channel grid */}
      <div className="px-6 pb-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filtered.map(channel => (
          <button
            key={channel.id}
            onClick={() => playChannel(channel)}
            className={`group relative flex flex-col items-center p-4 rounded-xl transition-all duration-200 ${
              activeChannel?.id === channel.id
                ? "bg-purple-600/20 border border-purple-500/50 shadow-lg shadow-purple-600/10 ring-2 ring-purple-500/30"
                : "bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-105"
            }`}
          >
            {/* Logo */}
            <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden mb-3">
              <img
                src={channel.logo}
                alt={channel.name}
                className="w-14 h-14 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%239333ea'%3E%3Cpath d='M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z'/%3E%3C/svg%3E"; }}
              />
            </div>

            {/* Name */}
            <span className="text-sm font-medium text-center leading-tight">{channel.name}</span>
            <span className="text-[10px] text-gray-500 mt-1">{channel.category}</span>

            {/* Live badge */}
            {activeChannel?.id === channel.id && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-600/80 rounded-full px-1.5 py-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[9px] font-bold">LIVE</span>
              </div>
            )}
          </button>
        ))}
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <IptvSection kind="live" />
      </div>
      <Footer />
    </div>
    </>
  );
}
