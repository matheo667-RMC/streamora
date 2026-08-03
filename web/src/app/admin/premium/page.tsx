"use client";

import { useEffect, useState, useCallback } from "react";

interface Settings {
  maxAccountsPerIp: number; autoMaintenance: boolean;
}

interface UserRow {
  id: string; name: string | null; email: string | null; role: string;
  badges: string; watchSeconds: number;
  signupIp: string | null; createdAt: string;
}

function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export default function AdminUsers() {
  const [tab, setTab] = useState<"settings" | "users">("users");
  const [s, setS] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);

  useEffect(() => {
    fetch("/api/admin/payment").then((r) => r.json()).then((d) => { if (!d.error) setS(d); });
    loadUsers();
  }, []);

  const loadUsers = useCallback(() => {
    fetch("/api/admin/users").then((r) => r.json()).then((d) => Array.isArray(d) && setUsers(d));
  }, []);

  async function saveSettings() {
    if (!s) return;
    await fetch("/api/admin/payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }

  async function userAction(userId: string, body: Record<string, unknown>) {
    await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, ...body }) });
    loadUsers();
  }

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-2xl font-bold mb-6">Utilisateurs & Réglages</h1>
        <div className="flex gap-2 mb-6">
          {(["users", "settings"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === t ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-white/5 hover:bg-white/10"}`}>
              {t === "users" ? "Utilisateurs" : "Réglages"}
            </button>
          ))}
        </div>

        {tab === "settings" && s && (
          <div className="space-y-6">
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <input type="checkbox" checked={s.autoMaintenance} onChange={(e) => setS({ ...s, autoMaintenance: e.target.checked })} className="h-5 w-5 accent-purple-600" />
              <div>
                <div className="font-semibold">Maintenance automatique le dimanche</div>
                <div className="text-xs text-gray-400">Le site passe en mode maintenance tous les dimanches (03h–05h UTC) pour les mises à jour.</div>
              </div>
            </label>

            <label className="block rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="text-xs text-gray-400">Max comptes / IP</span>
              <input
                type="number" min={1}
                value={s.maxAccountsPerIp}
                onChange={(e) => setS({ ...s, maxAccountsPerIp: parseInt(e.target.value, 10) || 1 })}
                className="mt-1 w-32 rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </label>

            <button onClick={saveSettings} className="rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-semibold">
              {saved ? "Enregistré ✓" : "Enregistrer"}
            </button>
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
                  <span className="text-xs text-gray-500">⏱ {fmtTime(u.watchSeconds)}</span>
                  {u.signupIp && <span className="text-xs text-gray-600">IP {u.signupIp}</span>}
                </div>
                {u.badges && <div className="text-xs text-pink-300">Badges: {u.badges}</div>}
                <div className="flex flex-wrap gap-2">
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
