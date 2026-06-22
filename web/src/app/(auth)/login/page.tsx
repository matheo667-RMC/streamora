"use client";

import { signIn } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [step, setStep] = useState<"login" | "2fa">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Check if 2FA is enabled for this user
    try {
      const checkRes = await fetch("/api/auth/2fa/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const checkData = await checkRes.json();

      if (checkData.twoFactorEnabled) {
        // Need 2FA code first - verify credentials then show 2FA step
        setStep("2fa");
        setLoading(false);
        return;
      }
    } catch {
      // If check fails, proceed with normal login
    }

    await doLogin();
  }

  async function handle2FA(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Verify 2FA code
    try {
      const verifyRes = await fetch("/api/auth/2fa/login-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, code: totpCode }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        setError(verifyData.error || "Code invalide");
        setLoading(false);
        return;
      }
    } catch {
      setError("Erreur de connexion");
      setLoading(false);
      return;
    }

    await doLogin();
  }

  async function doLogin() {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Email ou mot de passe incorrect");
      setStep("login");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-gradient-to-br from-black via-gray-950 to-purple-950/30">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/60 backdrop-blur-2xl p-8 md:p-10 shadow-2xl">
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="Streamora"
            width={72}
            height={72}
            className="mx-auto rounded-xl"
          />
          <h1 className="mt-4 text-3xl font-bold">
            {step === "2fa" ? "Verification 2FA" : "Se connecter"}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {step === "2fa"
              ? "Entre le code de ton appli d'authentification"
              : "Accédez à vos films et séries"}
          </p>
        </div>

        {step === "login" && (
          <>
            {/* Discord Login */}
            <button
              onClick={() => signIn("discord", { callbackUrl: "/" })}
              className="mb-6 flex w-full items-center justify-center gap-3 rounded-lg bg-[#5865F2] px-6 py-3.5 font-semibold text-white hover:bg-[#4752C4] transition-all"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
              </svg>
              Continuer avec Discord
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-black/60 px-4 text-gray-500">ou avec email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <input
                type="email"
                placeholder="Adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
              />

              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3.5 font-semibold text-white hover:from-purple-500 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-all"
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>

            <div className="mt-4 text-center">
              <Link href="/forgot-password" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
                Mot de passe oublie ?
              </Link>
            </div>

            <p className="mt-4 text-center text-sm text-gray-400">
              Pas encore de compte ?{" "}
              <Link href="/register" className="text-purple-400 hover:text-purple-300 font-medium">
                Creer un compte
              </Link>
            </p>
          </>
        )}

        {step === "2fa" && (
          <form onSubmit={handle2FA} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 text-center">
              <div className="text-4xl mb-2">
                <svg className="h-12 w-12 mx-auto text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">
                Ouvre ton appli d&apos;authentification et entre le code a 6 chiffres
              </p>
            </div>

            <input
              type="text"
              placeholder="000000"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              maxLength={6}
              autoFocus
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-white text-center text-2xl tracking-[0.5em] font-mono placeholder-gray-600 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
            />

            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3.5 font-semibold text-white hover:from-purple-500 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-all"
            >
              {loading ? "Verification..." : "Verifier"}
            </button>

            <button
              type="button"
              onClick={() => { setStep("login"); setError(""); setTotpCode(""); }}
              className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors py-2"
            >
              &larr; Retour
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
