"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";

const ADMIN_EMAIL = "matheofernandes5670@gmail.com";
const ADMIN_PASSWORD = "2017";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (adminUnlocked) {
      fetch("/api/admin/stats")
        .then((r) => r.json())
        .then(setStats)
        .catch(() => {});
    }
  }, [adminUnlocked]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-gray-400">Chargement...</div>
      </div>
    );
  }

  if (session?.user?.email !== ADMIN_EMAIL) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen items-center justify-center bg-black pt-16">
          <div className="text-center">
            <div className="mb-4 text-6xl">🔒</div>
            <h1 className="text-2xl font-bold text-red-400">Accès refusé</h1>
            <p className="mt-2 text-gray-400">Vous n&apos;avez pas les droits d&apos;administrateur.</p>
            <button
              onClick={() => router.push("/")}
              className="mt-6 btn-primary"
            >
              Retour à l&apos;accueil
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!adminUnlocked) {
    return (
      <>
        <Navbar />
        <div className="flex min-h-screen items-center justify-center bg-black pt-16">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-8 text-center">
            <div className="mb-4 text-5xl">🔐</div>
            <h1 className="text-xl font-bold mb-2">Panneau Admin</h1>
            <p className="text-sm text-gray-400 mb-6">Entrez le mot de passe administrateur</p>

            {pinError && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                {pinError}
              </div>
            )}

            <input
              type="password"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              placeholder="Mot de passe admin"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors mb-4 text-center text-lg tracking-widest"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (adminPin === ADMIN_PASSWORD) {
                    setAdminUnlocked(true);
                  } else {
                    setPinError("Mot de passe incorrect");
                  }
                }
              }}
            />

            <button
              onClick={() => {
                if (adminPin === ADMIN_PASSWORD) {
                  setAdminUnlocked(true);
                } else {
                  setPinError("Mot de passe incorrect");
                }
              }}
              className="w-full btn-primary py-3"
            >
              Déverrouiller
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-black pt-20 px-4 pb-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold mb-8">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Panneau Admin
            </span>
          </h1>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
            {[
              { label: "Films", key: "films", icon: "🎬", color: "purple" },
              { label: "Séries", key: "series", icon: "📺", color: "pink" },
              { label: "Épisodes", key: "episodes", icon: "📝", color: "blue" },
              { label: "Téléchargements", key: "downloads", icon: "⬇️", color: "green" },
              { label: "Utilisateurs", key: "users", icon: "👥", color: "yellow" },
            ].map((s) => (
              <div key={s.key} className="rounded-xl border border-white/5 bg-gray-900/50 p-5 text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-2xl font-bold">{stats[s.key] || 0}</div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 bg-gray-900/30 p-8 text-center">
            <p className="text-gray-400 mb-4">
              Utilise l&apos;application desktop <strong>Streamora Admin</strong> pour gérer les films et séries.
            </p>
            <p className="text-sm text-gray-500">
              Tu peux aussi voir les stats ici. Les films et séries se gèrent depuis l&apos;app sur ton PC.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
