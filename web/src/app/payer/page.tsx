"use client";

import { useEffect, useState } from "react";

interface PayInfo {
  telegramHandle: string;
  paypalEmail: string;
  wallets: Record<string, string>;
  prices: { month1: number; month2: number; month6: number; lifetime: number };
}

const PLAN_META = [
  { tier: "month1", label: "1 mois", key: "month1" as const, highlight: false },
  { tier: "month2", label: "2 mois", key: "month2" as const, highlight: false },
  { tier: "month6", label: "6 mois", key: "month6" as const, highlight: true },
  { tier: "lifetime", label: "À vie", key: "lifetime" as const, highlight: false },
];

const CRYPTOS = ["BTC", "ETH", "USDT", "LTC", "TRX", "SOL"];

export default function PayerPage() {
  const [info, setInfo] = useState<PayInfo | null>(null);
  const [sub, setSub] = useState<{ authenticated: boolean; hasAccess: boolean; planLabel?: string } | null>(null);
  const [selected, setSelected] = useState<string>("month6");
  const [keyCode, setKeyCode] = useState("");
  const [keyMsg, setKeyMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState<string>("");

  useEffect(() => {
    fetch("/api/payment-info").then((r) => r.json()).then(setInfo).catch(() => {});
    fetch("/api/subscription").then((r) => r.json()).then(setSub).catch(() => {});
  }, []);

  const price = (k: keyof PayInfo["prices"]) => (info ? info.prices[k] : 0);

  async function redeem() {
    setKeyMsg(null);
    const res = await fetch("/api/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: keyCode }),
    });
    const data = await res.json();
    if (res.ok) {
      setKeyMsg({ ok: true, text: `Clé validée ! Abonnement ${data.planLabel} activé.` });
      setTimeout(() => (window.location.href = "/"), 1500);
    } else {
      setKeyMsg({ ok: false, text: data.error || "Erreur." });
    }
  }

  function copy(text: string, tag: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(tag);
      setTimeout(() => setCopied(""), 1500);
    });
  }

  const selMeta = PLAN_META.find((p) => p.tier === selected)!;

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Passe à Streamora Premium
          </h1>
          <p className="mt-3 text-gray-400">Films, séries et TV en illimité, sans pub. Choisis ton offre.</p>
          {sub?.hasAccess && (
            <div className="mt-4 inline-block rounded-full bg-green-500/15 border border-green-500/30 px-4 py-2 text-sm text-green-300">
              Tu es déjà Premium ({sub.planLabel}) ✓
            </div>
          )}
        </div>

        {/* Plans */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {PLAN_META.map((p) => (
            <button
              key={p.tier}
              onClick={() => setSelected(p.tier)}
              className={`relative rounded-2xl border p-5 text-left transition-all ${
                selected === p.tier
                  ? "border-purple-500 bg-gradient-to-br from-purple-600/20 to-pink-600/10 ring-2 ring-purple-500/50"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-2 right-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-2 py-0.5 text-[10px] font-bold uppercase">
                  Populaire
                </span>
              )}
              <div className="text-sm text-gray-400">{p.label}</div>
              <div className="mt-1 text-2xl font-extrabold">
                {price(p.key).toFixed(2).replace(".00", "")}€
              </div>
              {p.tier === "lifetime" && <div className="text-xs text-pink-400 mt-1">paiement unique</div>}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Payment methods */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-bold mb-1">Payer {selMeta.label} — {price(selMeta.key).toFixed(2).replace(".00", "")}€</h2>
            <p className="text-sm text-gray-400 mb-4">Crypto, carte, Revolut ou PayPal via Telegram.</p>

            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase text-gray-500">Crypto-monnaie</div>
              {CRYPTOS.map((c) => {
                const addr = info?.wallets?.[c] || "";
                return (
                  <div key={c} className="flex items-center gap-2 rounded-lg bg-black/30 border border-white/10 px-3 py-2">
                    <span className="w-14 text-sm font-bold text-purple-300">{c}</span>
                    <span className="flex-1 truncate text-xs text-gray-300">
                      {addr || <span className="text-gray-600 italic">non configuré</span>}
                    </span>
                    {addr && (
                      <button onClick={() => copy(addr, c)} className="text-xs rounded bg-white/10 px-2 py-1 hover:bg-white/20">
                        {copied === c ? "Copié !" : "Copier"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 space-y-2">
              <div className="text-xs font-semibold uppercase text-gray-500">Carte / Revolut / PayPal</div>
              <a
                href={info?.telegramHandle ? `https://t.me/${info.telegramHandle.replace(/^@/, "")}` : "#"}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                  info?.telegramHandle
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                    : "bg-white/10 text-gray-500 pointer-events-none"
                }`}
              >
                Contacter sur Telegram {info?.telegramHandle ? info.telegramHandle : "(non configuré)"}
              </a>
              <p className="text-xs text-gray-500">
                Envoie le paiement puis une preuve sur Telegram — ton accès Premium est activé (ou tu reçois une clé).
              </p>
            </div>
          </div>

          {/* Use a key */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 h-fit">
            <h2 className="text-lg font-bold mb-1">Utiliser une clé</h2>
            <p className="text-sm text-gray-400 mb-4">Tu as reçu une clé <code className="text-purple-300">Streamora-XXXX</code> ? Entre-la ici.</p>
            {!sub?.authenticated ? (
              <a href="/login" className="block text-center rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold hover:bg-purple-500">
                Connecte-toi pour utiliser une clé
              </a>
            ) : (
              <>
                <input
                  value={keyCode}
                  onChange={(e) => setKeyCode(e.target.value)}
                  placeholder="Streamora-XXXX-XXXXXX"
                  className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-3 text-sm focus:border-purple-500 focus:outline-none"
                />
                <button
                  onClick={redeem}
                  className="mt-3 w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 text-sm font-semibold hover:from-purple-500 hover:to-pink-500"
                >
                  Valider la clé
                </button>
                {keyMsg && (
                  <p className={`mt-3 text-sm ${keyMsg.ok ? "text-green-400" : "text-red-400"}`}>{keyMsg.text}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
