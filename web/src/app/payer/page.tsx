"use client";

import { useEffect, useRef, useState } from "react";

interface PayInfo {
  paypalEmail: string;
  wallets: Record<string, string>;
  prices: { month1: number; month2: number; month6: number; lifetime: number };
  autoPayEnabled?: boolean;
}

const PLAN_META = [
  { tier: "month1", label: "1 mois", key: "month1" as const, highlight: false },
  { tier: "month2", label: "2 mois", key: "month2" as const, highlight: false },
  { tier: "month6", label: "6 mois", key: "month6" as const, highlight: true },
  { tier: "lifetime", label: "À vie", key: "lifetime" as const, highlight: false },
];

const CRYPTOS = [
  { id: "btc", label: "Bitcoin (BTC)" },
  { id: "eth", label: "Ethereum (ETH)" },
  { id: "usdt", label: "USDT (TRC20)" },
  { id: "ltc", label: "Litecoin (LTC)" },
  { id: "trx", label: "Tron (TRX)" },
  { id: "sol", label: "Solana (SOL)" },
];

interface Checkout {
  paymentId: string;
  payAddress: string;
  payAmount: string;
  payCurrency: string;
  priceEur: number;
}

export default function PayerPage() {
  const [info, setInfo] = useState<PayInfo | null>(null);
  const [sub, setSub] = useState<{ authenticated: boolean; hasAccess: boolean; planLabel?: string } | null>(null);
  const [selected, setSelected] = useState<string>("month6");
  const [coin, setCoin] = useState<string>("btc");
  const [keyCode, setKeyCode] = useState("");
  const [keyMsg, setKeyMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState<string>("");
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [checkoutErr, setCheckoutErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [payStatus, setPayStatus] = useState<string>("waiting");
  const [deliveredKey, setDeliveredKey] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/payment-info").then((r) => r.json()).then(setInfo).catch(() => {});
    fetch("/api/subscription").then((r) => r.json()).then(setSub).catch(() => {});
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
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

  async function startCheckout() {
    setCheckoutErr("");
    setLoading(true);
    setDeliveredKey("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planTier: selected, payCurrency: coin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutErr(data.error || "Erreur.");
        return;
      }
      setCheckout(data);
      setPayStatus("waiting");
      startPolling(data.paymentId);
    } finally {
      setLoading(false);
    }
  }

  function startPolling(paymentId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/status?paymentId=${encodeURIComponent(paymentId)}`);
        const data = await res.json();
        setPayStatus(data.status || "waiting");
        if (data.delivered && data.keyCode) {
          setDeliveredKey(data.keyCode);
          if (pollRef.current) clearInterval(pollRef.current);
          setTimeout(() => (window.location.href = "/"), 4000);
        }
      } catch {
        // keep polling
      }
    }, 6000);
  }

  const selMeta = PLAN_META.find((p) => p.tier === selected)!;
  const autoPay = info?.autoPayEnabled;

  const statusLabel: Record<string, string> = {
    waiting: "En attente du paiement…",
    confirming: "Paiement détecté, confirmation en cours…",
    confirmed: "Confirmé, activation…",
    sending: "Traitement…",
    partially_paid: "Montant partiel reçu — complète le paiement.",
    finished: "Payé !",
    failed: "Échec du paiement.",
    expired: "Paiement expiré — recommence.",
  };

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
              onClick={() => { setSelected(p.tier); setCheckout(null); }}
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
          {/* On-site crypto checkout */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-bold mb-1">Payer {selMeta.label} — {price(selMeta.key).toFixed(2).replace(".00", "")}€</h2>
            <p className="text-sm text-gray-400 mb-4">Paiement en crypto directement sur le site. Ta clé est livrée <b>automatiquement</b> dès le paiement confirmé.</p>

            {!sub?.authenticated ? (
              <a href="/login" className="block text-center rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold hover:bg-purple-500">
                Connecte-toi pour payer
              </a>
            ) : !autoPay ? (
              <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-4 text-sm text-yellow-200">
                Le paiement en ligne n&apos;est pas encore activé. Si tu as reçu une clé, utilise-la à droite.
              </div>
            ) : deliveredKey ? (
              <div className="rounded-lg bg-green-500/10 border border-green-500/30 p-4">
                <p className="text-green-300 font-semibold">Paiement reçu ! Ton accès est activé ✓</p>
                <p className="mt-2 text-sm text-gray-300">Ta clé : <code className="text-purple-300">{deliveredKey}</code></p>
                <p className="mt-1 text-xs text-gray-500">Redirection vers l&apos;accueil…</p>
              </div>
            ) : checkout ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-300">Envoie <b>exactement</b> ce montant :</p>
                <div className="rounded-lg bg-black/30 border border-white/10 px-3 py-2">
                  <div className="text-xs text-gray-500">{checkout.payCurrency}</div>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-lg font-bold text-purple-300">{checkout.payAmount}</span>
                    <button onClick={() => copy(checkout.payAmount, "amt")} className="text-xs rounded bg-white/10 px-2 py-1 hover:bg-white/20">{copied === "amt" ? "Copié !" : "Copier"}</button>
                  </div>
                </div>
                <div className="rounded-lg bg-black/30 border border-white/10 px-3 py-2">
                  <div className="text-xs text-gray-500">Adresse</div>
                  <div className="flex items-center gap-2">
                    <span className="flex-1 truncate text-xs text-gray-300">{checkout.payAddress}</span>
                    <button onClick={() => copy(checkout.payAddress, "addr")} className="text-xs rounded bg-white/10 px-2 py-1 hover:bg-white/20">{copied === "addr" ? "Copié !" : "Copier"}</button>
                  </div>
                </div>
                <img
                  alt="QR"
                  className="mx-auto rounded-lg bg-white p-2"
                  width={160}
                  height={160}
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(checkout.payAddress)}`}
                />
                <div className="flex items-center gap-2 rounded-lg bg-purple-500/10 border border-purple-500/30 px-3 py-2 text-sm text-purple-200">
                  <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                  {statusLabel[payStatus] || "En attente…"}
                </div>
                <button onClick={() => setCheckout(null)} className="text-xs text-gray-500 hover:text-gray-300">Annuler</button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase text-gray-500">Choisis ta crypto</div>
                <div className="grid grid-cols-2 gap-2">
                  {CRYPTOS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCoin(c.id)}
                      className={`rounded-lg border px-3 py-2 text-sm text-left transition-colors ${
                        coin === c.id ? "border-purple-500 bg-purple-600/20" : "border-white/10 bg-black/30 hover:border-white/20"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={startCheckout}
                  disabled={loading}
                  className="mt-2 w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 text-sm font-semibold hover:from-purple-500 hover:to-pink-500 disabled:opacity-50"
                >
                  {loading ? "Création du paiement…" : `Payer ${price(selMeta.key).toFixed(2).replace(".00", "")}€ en crypto`}
                </button>
                {checkoutErr && <p className="text-sm text-red-400">{checkoutErr}</p>}
              </div>
            )}
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
