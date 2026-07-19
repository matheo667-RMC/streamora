"use client";

import { useEffect, useState, useCallback } from "react";

interface Settings {
  paypalEmail: string; telegramHandle: string;
  btcAddress: string; ethAddress: string; usdtAddress: string;
  ltcAddress: string; trxAddress: string; solAddress: string;
  priceMonth1: number; priceMonth2: number; priceMonth6: number; priceLifetime: number;
  paywallEnabled: boolean; maxAccountsPerIp: number;
}

interface Key {
  id: string; code: string; planTier: string; used: boolean; note: string;
  createdAt: string; usedBy?: { email?: string; name?: string } | null;
}

interface UserRow {
  id: string; name: string | null; email: string | null; role: string;
  planTier: string; planExpiresAt: string | null; badges: string; watchSeconds: number;
  signupIp: string | null; createdAt: string;
}

const PLANS = [
  { v: "month1", l: "1 mois" }, { v: "month2", l: "2 mois" },
  { v: "month6", l: "6 mois" }, { v: "lifetime", l: "À vie" },
];

function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export default function AdminPremium() {
  const [tab, setTab] = useState<"pay" | "keys" | "users">("pay");
  const [s, setS] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [keys, setKeys] = useState<Key[]>([]);
  const [genTier, setGenTier] = useState("month1");
  const [genCount, setGenCount] = useState(1);
  const [genNote, setGenNote] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    fetch("/api/admin/payment").then((r) => r.json()).then((d) => { if (!d.error) setS(d); });
    loadKeys(); loadUsers();
  }, []);

  const loadKeys = useCallback(() => {
    fetch("/api/admin/keys").then((r) => r.json()).then((d) => Array.isArray(d) && setKeys(d));
  }, []);
  const loadUsers = useCallback(() => {
    fetch("/api/admin/users").then((r) => r.json()).then((d) => Array.isArray(d) && setUsers(d));
  }, []);

  async function saveSettings() {
    if (!s) return;
    await fetch("/api/admin/payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }

  async function genKeys() {
    const res = await fetch("/api/admin/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planTier: genTier, count: genCount, note: genNote }) });
    if (res.ok) { setGenNote(""); loadKeys(); }
  }
  async function delKey(id: string) {
    await fetch("/api/admin/keys", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    loadKeys();
  }

  async function userAction(userId: string, body: Record<string, unknown>) {
    await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, ...body }) });
    loadUsers();
  }

  const field = (label: string, key: keyof Settings, placeholder = "") =>
    s && (
      <label className="block">
        <span className="text-xs text-gray-400">{label}</span>
        <input
          value={String(s[key] ?? "")}
          onChange={(e) => setS({ ...s, [key]: e.target.value })}
          placeholder={placeholder}
          className="mt-1 w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
        />
      </label>
    );

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold mb-6">Premium & Utilisateurs</h1>
        <div className="flex gap-2 mb-6">
          {(["pay", "keys", "users"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === t ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-white/5 hover:bg-white/10"}`}>
              {t === "pay" ? "Paiement" : t === "keys" ? "Clés" : "Utilisateurs"}
            </button>
          ))}
        </div>

        {tab === "pay" && s && (
          <div className="space-y-6">
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <input type="checkbox" checked={s.paywallEnabled} onChange={(e) => setS({ ...s, paywallEnabled: e.target.checked })} className="h-5 w-5 accent-purple-600" />
              <div>
                <div className="font-semibold">Activer le paiement (paywall)</div>
                <div className="text-xs text-gray-400">Si activé, seuls les membres avec abonnement ou clé peuvent regarder. Toi (fondateur) = toujours gratuit.</div>
              </div>
            </label>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 grid sm:grid-cols-2 gap-4">
              {field("Contact Telegram (@pseudo)", "telegramHandle", "@monpseudo")}
              {field("Email PayPal", "paypalEmail", "moi@exemple.com")}
              {field("Adresse BTC", "btcAddress")}
              {field("Adresse ETH", "ethAddress")}
              {field("Adresse USDT", "usdtAddress")}
              {field("Adresse LTC", "ltcAddress")}
              {field("Adresse TRX", "trxAddress")}
              {field("Adresse SOL", "solAddress")}
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {field("Prix 1 mois (€)", "priceMonth1")}
              {field("Prix 2 mois (€)", "priceMonth2")}
              {field("Prix 6 mois (€)", "priceMonth6")}
              {field("Prix à vie (€)", "priceLifetime")}
              {field("Max comptes / IP", "maxAccountsPerIp")}
            </div>

            <button onClick={saveSettings} className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-semibold">
              {saved ? "Enregistré ✓" : "Enregistrer"}
            </button>
          </div>
        )}

        {tab === "keys" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="text-xs text-gray-400 block">Offre</span>
                <select value={genTier} onChange={(e) => setGenTier(e.target.value)} className="mt-1 rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm">
                  {PLANS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-xs text-gray-400 block">Nombre</span>
                <input type="number" min={1} max={100} value={genCount} onChange={(e) => setGenCount(parseInt(e.target.value) || 1)} className="mt-1 w-20 rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm" />
              </label>
              <label className="text-sm flex-1 min-w-[150px]">
                <span className="text-xs text-gray-400 block">Note (ex: famille)</span>
                <input value={genNote} onChange={(e) => setGenNote(e.target.value)} className="mt-1 w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm" />
              </label>
              <button onClick={genKeys} className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2 text-sm font-semibold">Générer</button>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
              {keys.length === 0 && <p className="p-4 text-sm text-gray-500">Aucune clé.</p>}
              {keys.map((k) => (
                <div key={k.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 text-sm">
                  <code className="font-mono text-purple-300">{k.code}</code>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-xs">{PLANS.find((p) => p.v === k.planTier)?.l || k.planTier}</span>
                  {k.note && <span className="text-xs text-gray-500">{k.note}</span>}
                  <span className="flex-1" />
                  {k.used ? (
                    <span className="text-xs text-red-400">Utilisée{k.usedBy?.email ? ` par ${k.usedBy.email}` : ""}</span>
                  ) : (
                    <>
                      <button onClick={() => navigator.clipboard.writeText(k.code)} className="text-xs rounded bg-white/10 px-2 py-1 hover:bg-white/20">Copier</button>
                      <button onClick={() => delKey(k.id)} className="text-xs rounded bg-red-500/20 text-red-300 px-2 py-1 hover:bg-red-500/30">Suppr.</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "users" && (
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
            {users.length === 0 && <p className="p-4 text-sm text-gray-500">Aucun utilisateur.</p>}
            {users.map((u) => (
              <div key={u.id} className="px-4 py-3 border-b border-white/5 text-sm space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{u.name || u.email?.split("@")[0]}</span>
                  <span className="text-xs text-gray-500">{u.email}</span>
                  {u.role === "admin" && <span className="rounded bg-purple-500/20 text-purple-300 px-2 py-0.5 text-xs">admin</span>}
                  <span className="rounded bg-white/10 px-2 py-0.5 text-xs">{PLANS.find((p) => p.v === u.planTier)?.l || "Gratuit"}</span>
                  <span className="text-xs text-gray-500">⏱ {fmtTime(u.watchSeconds)}</span>
                  {u.signupIp && <span className="text-xs text-gray-600">IP {u.signupIp}</span>}
                </div>
                {u.badges && <div className="text-xs text-pink-300">Badges: {u.badges}</div>}
                <div className="flex flex-wrap gap-2">
                  <select defaultValue={u.planTier} onChange={(e) => userAction(u.id, { action: "setPlan", planTier: e.target.value })}
                    className="rounded bg-black/30 border border-white/10 px-2 py-1 text-xs">
                    <option value="free">Gratuit</option>
                    {PLANS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
                  </select>
                  <button onClick={() => { const b = prompt("Badges (séparés par des virgules)", u.badges); if (b !== null) userAction(u.id, { action: "setBadges", badges: b }); }}
                    className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20">Badges</button>
                  <button onClick={() => { const p = prompt("Nouveau mot de passe pour " + u.email); if (p) userAction(u.id, { action: "resetPassword", newPassword: p }); }}
                    className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20">Réinit. mot de passe</button>
                  <button onClick={() => userAction(u.id, { action: "setRole", role: u.role === "admin" ? "user" : "admin" })}
                    className="rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20">{u.role === "admin" ? "Retirer admin" : "Rendre admin"}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
