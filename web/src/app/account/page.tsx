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

  // 2FA state
  const [twoFAStep, setTwoFAStep] = useState<"idle" | "setup" | "verify" | "disable">("idle");
  const [qrCode, setQrCode] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFAMessage, setTwoFAMessage] = useState("");
  const [twoFAError, setTwoFAError] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      fetch("/api/auth/2fa/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.user.email }),
      })
        .then(r => r.json())
        .then(d => setTwoFAEnabled(d.twoFactorEnabled || false))
        .catch(() => {});
    }
  }, [session?.user?.email]);

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

  async function setup2FA() {
    setTwoFAError("");
    setTwoFAMessage("");
    setTwoFALoading(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setQrCode(data.qrCode);
        setSecretKey(data.secret);
        setTwoFAStep("verify");
      } else {
        setTwoFAError(data.error || "Erreur");
      }
    } catch {
      setTwoFAError("Erreur de connexion");
    }
    setTwoFALoading(false);
  }

  async function verify2FA(e: React.FormEvent) {
    e.preventDefault();
    setTwoFAError("");
    setTwoFALoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: totpCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFAEnabled(true);
        setTwoFAStep("idle");
        setTwoFAMessage("2FA activé avec succès !");
        setTotpCode("");
      } else {
        setTwoFAError(data.error || "Code invalide");
      }
    } catch {
      setTwoFAError("Erreur de connexion");
    }
    setTwoFALoading(false);
  }

  async function disable2FA(e: React.FormEvent) {
    e.preventDefault();
    setTwoFAError("");
    setTwoFALoading(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFAEnabled(false);
        setTwoFAStep("idle");
        setTwoFAMessage("2FA désactivé");
        setDisablePassword("");
      } else {
        setTwoFAError(data.error || "Erreur");
      }
    } catch {
      setTwoFAError("Erreur de connexion");
    }
    setTwoFALoading(false);
  }

  const isDiscordUser = !session.user.email?.includes("@") || session.user.image?.includes("discord");

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-black">
        {/* Header gradient */}
        <div className="relative pt-20 pb-8 px-4">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 to-transparent h-48" />
          <div className="relative mx-auto max-w-xl">
            <h1 className="text-2xl sm:text-3xl font-bold">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Mon compte</span>
            </h1>
          </div>
        </div>

        <div className="mx-auto max-w-xl px-4 pb-10">
          {/* Profile info */}
          <div className="rounded-2xl border border-white/10 bg-gray-900/50 p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-2xl font-bold flex-shrink-0 ring-2 ring-purple-500/20">
                {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold truncate">{session.user.name || "Sans nom"}</p>
                <p className="text-sm text-gray-400 truncate">{session.user.email}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {twoFAEnabled ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                      2FA actif
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
                      2FA inactif
                    </span>
                  )}
                </div>
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

          {/* 2FA Section */}
          {!isDiscordUser && (
            <div className="rounded-2xl border border-white/10 bg-gray-900/50 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Authentification 2FA</h2>
                {twoFAEnabled && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-400">Actif</span>
                )}
              </div>

              {twoFAMessage && (
                <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400">{twoFAMessage}</div>
              )}
              {twoFAError && (
                <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{twoFAError}</div>
              )}

              {twoFAStep === "idle" && !twoFAEnabled && (
                <div>
                  <p className="text-sm text-gray-400 mb-4">
                    Protege ton compte avec une appli d&apos;authentification (Google Authenticator, Authy, etc.)
                  </p>
                  <button onClick={setup2FA} disabled={twoFALoading} className="w-full btn-primary py-2.5">
                    {twoFALoading ? "Chargement..." : "Activer la 2FA"}
                  </button>
                </div>
              )}

              {twoFAStep === "idle" && twoFAEnabled && (
                <div>
                  <p className="text-sm text-gray-400 mb-4">
                    La 2FA est activée. Un code sera demandé à chaque connexion.
                  </p>
                  <button onClick={() => { setTwoFAStep("disable"); setTwoFAError(""); setTwoFAMessage(""); }}
                    className="w-full rounded-xl border border-red-500/20 bg-red-500/5 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                    Desactiver la 2FA
                  </button>
                </div>
              )}

              {twoFAStep === "verify" && (
                <div>
                  <p className="text-sm text-gray-400 mb-4">
                    Scanne ce QR code avec ton appli d&apos;authentification :
                  </p>

                  {qrCode && (
                    <div className="flex justify-center mb-4">
                      <div className="rounded-xl bg-white p-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
                      </div>
                    </div>
                  )}

                  <div className="mb-4 rounded-lg bg-gray-800/50 p-3">
                    <p className="text-[10px] text-gray-500 mb-1">Ou entre cette cle manuellement :</p>
                    <p className="text-xs font-mono text-purple-400 break-all select-all">{secretKey}</p>
                  </div>

                  <form onSubmit={verify2FA} className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-400">Code a 6 chiffres</label>
                      <input type="text" value={totpCode}
                        onChange={e => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        required maxLength={6} autoFocus
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white text-center text-xl tracking-[0.5em] font-mono placeholder-gray-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
                        placeholder="000000" />
                    </div>
                    <button type="submit" disabled={twoFALoading || totpCode.length !== 6} className="w-full btn-primary py-2.5">
                      {twoFALoading ? "Verification..." : "Activer"}
                    </button>
                    <button type="button" onClick={() => { setTwoFAStep("idle"); setTotpCode(""); setTwoFAError(""); }}
                      className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors py-1">
                      Annuler
                    </button>
                  </form>
                </div>
              )}

              {twoFAStep === "disable" && (
                <form onSubmit={disable2FA} className="space-y-3">
                  <p className="text-sm text-gray-400">Entre ton mot de passe pour desactiver la 2FA :</p>
                  <input type="password" value={disablePassword}
                    onChange={e => setDisablePassword(e.target.value)}
                    required autoFocus
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
                    placeholder="Mot de passe" />
                  <button type="submit" disabled={twoFALoading}
                    className="w-full rounded-xl border border-red-500/20 bg-red-500/5 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                    {twoFALoading ? "Desactivation..." : "Confirmer la desactivation"}
                  </button>
                  <button type="button" onClick={() => { setTwoFAStep("idle"); setDisablePassword(""); setTwoFAError(""); }}
                    className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors py-1">
                    Annuler
                  </button>
                </form>
              )}
            </div>
          )}

          {isDiscordUser && (
            <div className="rounded-2xl border border-white/10 bg-gray-900/50 p-6 mb-6">
              <p className="text-sm text-gray-400">
                Tu es connecte via Discord. Le mot de passe et la 2FA se gerent sur Discord directement.
              </p>
            </div>
          )}

          {/* Logout */}
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full rounded-xl border border-red-500/20 bg-red-500/5 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Se déconnecter
          </button>
        </div>
      </div>
    </>
  );
}
