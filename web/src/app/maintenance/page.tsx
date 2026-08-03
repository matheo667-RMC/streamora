"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Style = "classic" | "cinema" | "neon" | "minimal" | "countdown";

export default function MaintenancePage() {
  const [style, setStyle] = useState<Style>("classic");
  const [msg, setMsg] = useState("Streamora est en maintenance.");

  useEffect(() => {
    fetch("/api/admin/maintenance")
      .then((r) => r.json())
      .then((d) => {
        if (d.maintenanceStyle) setStyle(d.maintenanceStyle as Style);
        if (d.maintenanceMsg) setMsg(d.maintenanceMsg);
      })
      .catch(() => {});
  }, []);

  if (style === "cinema") return <CinemaMode msg={msg} />;
  if (style === "neon") return <NeonMode msg={msg} />;
  if (style === "minimal") return <MinimalMode msg={msg} />;
  if (style === "countdown") return <CountdownMode msg={msg} />;
  return <ClassicMode msg={msg} />;
}

function ClassicMode({ msg }: { msg: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center">
      <div className="max-w-lg">
        <Image src="/logo.png" alt="Streamora" width={80} height={80} className="mx-auto rounded-xl mb-8" />
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
            Maintenance
          </span>
        </h1>
        <div className="w-16 h-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full mx-auto mb-6" />
        <p className="text-lg text-gray-300 mb-2">{msg}</p>
        <p className="text-sm text-gray-500">Nous revenons très bientôt !</p>
        <div className="mt-10 flex justify-center gap-3">
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0s" }} />
          <div className="h-3 w-3 rounded-full bg-green-500 animate-bounce" style={{ animationDelay: "0.15s" }} />
          <div className="h-3 w-3 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0.3s" }} />
        </div>
        <p className="mt-8 text-xs text-gray-700">&copy; {new Date().getFullYear()} Streamora</p>
      </div>
    </div>
  );
}

function CinemaMode({ msg }: { msg: string }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-gray-950 via-black to-gray-950 px-4 text-center">
      {/* Film strip decorations */}
      <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 flex items-center overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-8 h-6 mx-2 rounded-sm bg-gray-700 border border-gray-600" />
        ))}
      </div>
      <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-t border-gray-700 flex items-center overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-8 h-6 mx-2 rounded-sm bg-gray-700 border border-gray-600" />
        ))}
      </div>

      <div className="max-w-lg z-10">
        <div className="mb-8 relative">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-2xl shadow-orange-500/30">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-yellow-400">
          Entracte
        </h1>
        <p className="text-lg text-gray-300 mb-2">{msg}</p>
        <p className="text-sm text-gray-500 italic">Le spectacle reprend dans un instant...</p>

        <div className="mt-8 flex justify-center">
          <div className="px-6 py-3 rounded-full border-2 border-yellow-500/50 text-yellow-400 text-sm animate-pulse">
            Rideau en cours...
          </div>
        </div>

        <p className="mt-10 text-xs text-gray-700">&copy; {new Date().getFullYear()} Streamora</p>
      </div>
    </div>
  );
}

function NeonMode({ msg }: { msg: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 text-center relative overflow-hidden">
      {/* Neon glow background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="max-w-lg z-10">
        <Image src="/logo.png" alt="Streamora" width={70} height={70} className="mx-auto rounded-xl mb-8 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />

        <h1 className="text-5xl md:text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-green-400 drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]">
          MAINTENANCE
        </h1>

        <div className="my-6 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />

        <p className="text-lg text-gray-200 mb-2 font-light">{msg}</p>

        <div className="mt-10 inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-sm text-emerald-300">Mise à jour en cours</span>
        </div>

        <p className="mt-10 text-xs text-gray-700">&copy; {new Date().getFullYear()} Streamora</p>
      </div>
    </div>
  );
}

function MinimalMode({ msg }: { msg: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
      <div className="max-w-md">
        <div className="w-16 h-16 mx-auto mb-8 rounded-2xl bg-black flex items-center justify-center">
          <Image src="/logo.png" alt="Streamora" width={40} height={40} className="rounded-lg" />
        </div>

        <h1 className="text-3xl font-semibold text-gray-900 mb-4">
          En maintenance
        </h1>

        <p className="text-gray-600 mb-8 leading-relaxed">{msg}</p>

        <div className="w-12 h-0.5 bg-gray-200 mx-auto mb-8" />

        <p className="text-sm text-gray-400">
          Nous travaillons à améliorer votre expérience.
        </p>

        <p className="mt-12 text-xs text-gray-300">&copy; {new Date().getFullYear()} Streamora</p>
      </div>
    </div>
  );
}

function CountdownMode({ msg }: { msg: string }) {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d + 1) % 4);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-black via-gray-950 to-black px-4 text-center relative overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(rgba(139,92,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.3) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
      </div>

      <div className="max-w-lg z-10">
        <Image src="/logo.png" alt="Streamora" width={60} height={60} className="mx-auto rounded-xl mb-6" />

        <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs text-red-400 font-medium uppercase tracking-wider">Hors ligne</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
          Maintenance en cours{".".repeat(dots)}
        </h1>

        <p className="text-gray-400 mb-8">{msg}</p>

        {/* Progress bar animation */}
        <div className="w-full max-w-xs mx-auto h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full animate-[progress_3s_ease-in-out_infinite]" style={{
            animation: "progress 3s ease-in-out infinite",
          }} />
        </div>
        <p className="mt-3 text-xs text-gray-600">Mise à jour du système...</p>

        <p className="mt-10 text-xs text-gray-700">&copy; {new Date().getFullYear()} Streamora</p>
      </div>

      <style jsx>{`
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 80%; }
          100% { width: 0%; }
        }
      `}</style>
    </div>
  );
}
