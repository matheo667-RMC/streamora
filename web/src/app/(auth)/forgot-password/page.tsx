"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "reset" | "done">("email");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerifyEmail(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword: "temp_check_only" }),
      });
      const data = await res.json();

      if (res.status === 404) {
        setError("Aucun compte avec cet email");
      } else {
        setStep("reset");
      }
    } catch {
      setError("Erreur de connexion");
    }
    setLoading(false);
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 4) {
      setError("Le mot de passe doit contenir au moins 4 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        setStep("done");
      } else {
        setError(data.error || "Erreur lors de la réinitialisation");
      }
    } catch {
      setError("Erreur de connexion");
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-gray-950 to-black px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-8">
        <div className="mb-6 flex justify-center">
          <Image src="/logo.png" alt="Streamora" width={50} height={50} className="rounded-xl" />
        </div>

        {step === "email" && (
          <>
            <h1 className="text-2xl font-bold text-center mb-2">Mot de passe oublie</h1>
            <p className="text-sm text-gray-400 text-center mb-6">Entre ton adresse email pour reinitialiser ton mot de passe</p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>
            )}

            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors"
                  placeholder="ton@email.com" />
              </div>
              <button type="submit" disabled={loading} className="w-full btn-primary py-3">
                {loading ? "Verification..." : "Continuer"}
              </button>
            </form>
          </>
        )}

        {step === "reset" && (
          <>
            <h1 className="text-2xl font-bold text-center mb-2">Nouveau mot de passe</h1>
            <p className="text-sm text-gray-400 text-center mb-6">Choisis un nouveau mot de passe pour <strong>{email}</strong></p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400">Nouveau mot de passe</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={4}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors"
                  placeholder="Nouveau mot de passe" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Confirmer le mot de passe</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={4}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors"
                  placeholder="Confirmer le mot de passe" />
              </div>
              <button type="submit" disabled={loading} className="w-full btn-primary py-3">
                {loading ? "Reinitialisation..." : "Reinitialiser le mot de passe"}
              </button>
            </form>
          </>
        )}

        {step === "done" && (
          <div className="text-center">
            <div className="text-5xl mb-4">&#x2705;</div>
            <h1 className="text-2xl font-bold mb-2">Mot de passe change !</h1>
            <p className="text-sm text-gray-400 mb-6">Tu peux maintenant te connecter avec ton nouveau mot de passe.</p>
            <Link href="/login" className="btn-primary py-3 w-full inline-block text-center">
              Se connecter
            </Link>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-red-400 hover:text-red-300 transition-colors">
            &larr; Retour a la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
