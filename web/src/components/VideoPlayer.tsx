"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { extractDriveFileId, getDriveEmbedUrl } from "@/lib/video-url";

interface Props {
  videoUrl: string;
  title: string;
  poster?: string;
}

// Check if URL is an external embed (vidzy, fsvid, uqload, etc.)
function isEmbedUrl(url: string): boolean {
  const embedDomains = ["vidzy.cc", "vidzy.org", "vidzy.live", "fsvid.lol", "uqload.is", "uqload.to", "uqload.com", "uqload.io", "uqload.net", "doodstream", "voe.sx", "streamtape", "vidsrc", "2embed", "vidlink.pro", "streamsrcs", "cloudemb.com", "nontongo.win", "vidoza.net", "videzz.net", "mixdrop.co", "sendvid.com", "sibnet.ru", "jetload.net", "multiup.us", "videasy.net", "videasy.to"];
  return embedDomains.some(d => url.includes(d)) || url.includes("/embed") || url.includes("embed-") || url.startsWith("/api/papy");
}

function EmbedPlayer({ videoUrl, title }: { videoUrl: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full overflow-hidden rounded-xl bg-black ${isFullscreen ? "h-screen" : "aspect-video"}`}>
      <iframe
        src={videoUrl}
        className="h-full w-full"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        title={title}
        style={{ border: "none" }}
        referrerPolicy="origin"
      />
      {/* Custom fullscreen button */}
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
  );
}

function StreamzoPlayer({ videoUrl, title, poster }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const [failed, setFailed] = useState(false);
  const ref = videoUrl.replace(/^streamzo:/, "");
  const src = `/api/streamzo?ref=${encodeURIComponent(ref)}`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    } else {
      import("hls.js").then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          const hls = new Hls({ maxBufferLength: 30 });
          hls.loadSource(src);
          hls.attachMedia(video);
          hls.on(Hls.Events.ERROR, (_e, data) => { if (data.fatal) setFailed(true); });
          hlsRef.current = hls;
        } else {
          setFailed(true);
        }
      });
    }
    return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [src]);

  if (failed) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black flex items-center justify-center text-center px-6">
        <p className="text-sm text-gray-400">Ce film est momentanément indisponible. Utilise le bouton « Ce lien ne marche pas ? » pour le retirer.</p>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
      <video ref={videoRef} poster={poster} controls autoPlay playsInline className="h-full w-full" title={title} />
    </div>
  );
}

export function VideoPlayer({ videoUrl, title, poster }: Props) {
  if (videoUrl.startsWith("streamzo:")) {
    return <StreamzoPlayer videoUrl={videoUrl} title={title} poster={poster} />;
  }

  // If embed URL, render iframe directly
  if (isEmbedUrl(videoUrl)) {
    return <EmbedPlayer videoUrl={videoUrl} title={title} />;
  }

  return <NativeVideoPlayer videoUrl={videoUrl} title={title} poster={poster} />;
}

function NativeVideoPlayer({ videoUrl, title, poster }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [enhance, setEnhance] = useState(true);
  const [audioEnhance, setAudioEnhance] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const driveFileId = useMemo(() => extractDriveFileId(videoUrl), [videoUrl]);
  const useIframeFallback = driveFileId !== null && videoError;

  // Set video URL - use proxy for Google Drive files (streams at full quality)
  useEffect(() => {
    if (!driveFileId) {
      setResolvedUrl(videoUrl);
    } else {
      // Use our streaming proxy endpoint directly as video source
      setResolvedUrl(`/api/video-proxy?id=${driveFileId}`);
    }
    setLoading(false);
  }, [videoUrl, driveFileId]);

  const setupAudio = useCallback(() => {
    const video = videoRef.current;
    if (!video || audioCtxRef.current || sourceRef.current) return;

    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaElementSource(video);

      // Bass boost (low shelf filter)
      const bass = ctx.createBiquadFilter();
      bass.type = "lowshelf";
      bass.frequency.value = 200;
      bass.gain.value = audioEnhance ? 4 : 0;

      // Voice clarity (peaking filter around 2-4kHz)
      const clarity = ctx.createBiquadFilter();
      clarity.type = "peaking";
      clarity.frequency.value = 3000;
      clarity.Q.value = 1;
      clarity.gain.value = audioEnhance ? 3 : 0;

      // Presence (high shelf for crispness)
      const presence = ctx.createBiquadFilter();
      presence.type = "highshelf";
      presence.frequency.value = 8000;
      presence.gain.value = audioEnhance ? 2 : 0;

      // Compressor (normalize loud/quiet parts)
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      source.connect(bass);
      bass.connect(clarity);
      clarity.connect(presence);
      presence.connect(compressor);
      compressor.connect(ctx.destination);

      audioCtxRef.current = ctx;
      sourceRef.current = source;
    } catch {
      // Fallback: no audio enhancement
    }
  }, [audioEnhance]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!audioCtxRef.current) setupAudio();

    if (video.paused) {
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume();
      }
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const bar = e.currentTarget;
    if (!video || !bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = pct * video.duration;
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) videoRef.current.volume = v;
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const skipForward = () => {
    if (videoRef.current) videoRef.current.currentTime += 10;
  };
  const skipBackward = () => {
    if (videoRef.current) videoRef.current.currentTime -= 10;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const videoFilter = enhance
    ? "contrast(1.08) saturate(1.15) brightness(1.02)"
    : "none";

  // Fallback to Google Drive iframe if direct streaming fails
  if (useIframeFallback && driveFileId) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={getDriveEmbedUrl(driveFileId)}
          className="h-full w-full"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          title={title}
          style={{ border: "none" }}
        />
      </div>
    );
  }

  // Show loading while resolving Google Drive URL
  if (!resolvedUrl) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
          <p className="mt-3 text-sm text-gray-400">Chargement de la video...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full overflow-hidden rounded-xl bg-black group"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
    >
      <video
        ref={videoRef}
        src={resolvedUrl}
        poster={poster}
        className="h-full w-full object-contain"
        style={{ filter: videoFilter }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => { handleLoadedMetadata(); setLoading(false); }}
        onCanPlay={() => setLoading(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => setVideoError(true)}
        onClick={togglePlay}
        preload="metadata"
      />

      {/* Loading spinner */}
      {loading && isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
        </div>
      )}

      {/* Play overlay (when paused and no controls) */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer" onClick={togglePlay}>
          <div className="rounded-full bg-purple-600/90 p-5 shadow-2xl hover:bg-purple-500 transition-colors">
            <svg className="h-12 w-12 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-3 px-4 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        {/* Progress bar */}
        <div className="mb-3 cursor-pointer h-1.5 rounded-full bg-white/20 group/bar" onClick={seek}>
          <div className="relative h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-md opacity-0 group-hover/bar:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button onClick={togglePlay} className="text-white hover:text-purple-400 transition-colors">
            {isPlaying ? (
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" /></svg>
            ) : (
              <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>

          {/* Skip backward */}
          <button onClick={skipBackward} className="text-white/70 hover:text-white transition-colors" title="-10s">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
            </svg>
          </button>

          {/* Skip forward */}
          <button onClick={skipForward} className="text-white/70 hover:text-white transition-colors" title="+10s">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
            </svg>
          </button>

          {/* Time */}
          <span className="text-xs text-white/70 tabular-nums min-w-[80px]">
            {fmt(currentTime)} / {fmt(duration)}
          </span>

          <div className="flex-1" />

          {/* Volume */}
          <div className="hidden sm:flex items-center gap-2">
            <svg className="h-4 w-4 text-white/70" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            </svg>
            <input type="range" min="0" max="1" step="0.05" value={volume} onChange={changeVolume}
              className="w-20 h-1 rounded-full appearance-none bg-white/20 accent-purple-500" />
          </div>

          {/* Settings */}
          <div className="relative">
            <button onClick={() => setShowSettings(!showSettings)} className="text-white/70 hover:text-white transition-colors" title="Qualite">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            {showSettings && (
              <div className="absolute bottom-10 right-0 w-56 rounded-xl border border-white/10 bg-gray-950/95 backdrop-blur-lg p-3 space-y-3 shadow-2xl" onClick={e => e.stopPropagation()}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ameliorations</p>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Image HD</span>
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${enhance ? "bg-purple-600" : "bg-gray-700"}`} onClick={() => setEnhance(!enhance)}>
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enhance ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Audio+</span>
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${audioEnhance ? "bg-purple-600" : "bg-gray-700"}`} onClick={() => setAudioEnhance(!audioEnhance)}>
                    <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${audioEnhance ? "translate-x-5" : "translate-x-0.5"}`} />
                  </div>
                </label>
                <p className="text-[10px] text-gray-600">Image: nettete, contraste, couleurs. Audio: basses, clarte voix.</p>
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition-colors">
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
      </div>

      {/* Enhancement badge */}
      {enhance && showControls && (
        <div className="absolute top-3 right-3 rounded-md bg-purple-600/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
          HD+
        </div>
      )}
    </div>
  );
}
