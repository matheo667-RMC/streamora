"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center bg-black"><div className="text-gray-400">Chargement...</div></div>;
  }

  if (!session?.user) return null;

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 4) {
      setError("Le nouveau mot de passe doit contenir au moins 4 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage("Mot de passe modifié avec succès !");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setError(data.error || "Erreur lors du changement");
      }
    } catch {
      setError("Erreur de connexion");
    }
    setLoading(false);
  }

  const isDiscordUser = !session.user.email?.includes("@") || session.user.image?.includes("discord");

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-black pt-20 px-4 pb-10">
        <div className="mx-auto max-w-xl">
          <h1 className="text-3xl font-bold mb-8">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Mon compte</span>
          </h1>

          {/* Profile info */}
          <div className="rounded-2xl border border-white/10 bg-gray-900/50 p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-2xl font-bold flex-shrink-0">
                {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="text-lg font-semibold">{session.user.name || "Sans nom"}</p>
                <p className="text-sm text-gray-400">{session.user.email}</p>
              </div>
            </div>
          </div>

          {/* Change password */}
          {!isDiscordUser && (
            <div className="rounded-2xl border border-white/10 bg-gray-900/50 p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Changer le mot de passe</h2>

              {message && (
                <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">{message}</div>
              )}
              {error && (
                <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400">Mot de passe actuel</label>
                  <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
                    placeholder="Mot de passe actuel" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Nouveau mot de passe</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={4}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
                    placeholder="Nouveau mot de passe" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Confirmer le nouveau mot de passe</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={4}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
                    placeholder="Confirmer" />
                </div>
                <button type="submit" disabled={loading} className="w-full btn-primary py-2.5">
                  {loading ? "Modification..." : "Changer le mot de passe"}
                </button>
              </form>
            </div>
          )}

          {isDiscordUser && (
            <div className="rounded-2xl border border-white/10 bg-gray-900/50 p-6 mb-6">
              <p className="text-sm text-gray-400">
                Tu es connecte via Discord. Le mot de passe se gere sur Discord directement.
              </p>
            </div>
          )}

          {/* Logout */}
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full rounded-xl border border-red-500/20 bg-red-500/5 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
            Se deconnecter
          </button>
        </div>
      </div>
    </>
  );
}
