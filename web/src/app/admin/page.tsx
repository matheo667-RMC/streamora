"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";

const ADMIN_EMAIL = "matheofernandes5670@gmail.com";
const ADMIN_PASSWORD = "2017";

interface Film {
  id: string;
  title: string;
  description: string;
  category: string;
  posterUrl: string;
  videoUrl: string;
  year: number;
  duration: string;
  featured: boolean;
  _count?: { downloads: number };
}

interface Episode {
  id: string;
  season: number;
  number: number;
  title: string;
  videoUrl: string;
  duration: string;
}

interface Series {
  id: string;
  title: string;
  description: string;
  category: string;
  posterUrl: string;
  year: number;
  featured: boolean;
  episodes?: Episode[];
  _count?: { episodes: number };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [tab, setTab] = useState<"dashboard" | "films" | "series" | "users">("dashboard");
  const [stats, setStats] = useState<Record<string, number>>({});
  const [films, setFilms] = useState<Film[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string; email: string; role: string; createdAt: string }[]>([]);

  // Film form
  const [filmModal, setFilmModal] = useState(false);
  const [editingFilm, setEditingFilm] = useState<Film | null>(null);
  const [filmForm, setFilmForm] = useState({ title: "", description: "", category: "Autre", posterUrl: "", videoUrl: "", year: new Date().getFullYear(), duration: "", featured: false });

  // Series form
  const [seriesModal, setSeriesModal] = useState(false);
  const [editingSeries, setEditingSeries] = useState<Series | null>(null);
  const [seriesForm, setSeriesForm] = useState({ title: "", description: "", category: "Autre", posterUrl: "", year: new Date().getFullYear(), featured: false });

  // Episode form
  const [episodeModal, setEpisodeModal] = useState(false);
  const [managingSeries, setManagingSeries] = useState<Series | null>(null);
  const [episodeForm, setEpisodeForm] = useState({ season: 1, number: 1, title: "", videoUrl: "", duration: "" });

  const [saving, setSaving] = useState(false);

  // Maintenance
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  const loadData = useCallback(() => {
    fetch("/api/admin/stats").then(r => r.json()).then(setStats).catch(() => {});
    fetch("/api/films").then(r => r.json()).then(setFilms).catch(() => {});
    fetch("/api/series").then(r => r.json()).then(setSeriesList).catch(() => {});
    fetch("/api/admin/users").then(r => r.json()).then(d => { if (Array.isArray(d)) setUsers(d); }).catch(() => {});
    fetch("/api/admin/maintenance").then(r => r.json()).then(d => setMaintenance(d.maintenanceMode || false)).catch(() => {});
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (adminUnlocked) loadData();
  }, [adminUnlocked, loadData]);

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center bg-black"><div className="text-gray-400">Chargement...</div></div>;
  }

  if (session?.user?.email !== ADMIN_EMAIL) {
    return (
      <><Navbar />
        <div className="flex min-h-screen items-center justify-center bg-black pt-16">
          <div className="text-center">
            <div className="mb-4 text-6xl">&#x1f512;</div>
            <h1 className="text-2xl font-bold text-red-400">Acces refuse</h1>
            <p className="mt-2 text-gray-400">Vous n&apos;avez pas les droits d&apos;administrateur.</p>
            <button onClick={() => router.push("/")} className="mt-6 btn-primary">Retour</button>
          </div>
        </div>
      </>
    );
  }

  if (!adminUnlocked) {
    return (
      <><Navbar />
        <div className="flex min-h-screen items-center justify-center bg-black pt-16">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-8 text-center">
            <div className="mb-4 text-5xl">&#x1f510;</div>
            <h1 className="text-xl font-bold mb-2">Panneau Admin</h1>
            <p className="text-sm text-gray-400 mb-6">Entrez le mot de passe administrateur</p>
            {pinError && <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{pinError}</div>}
            <input type="password" value={adminPin} onChange={e => setAdminPin(e.target.value)} placeholder="Mot de passe admin"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors mb-4 text-center text-lg tracking-widest"
              onKeyDown={e => { if (e.key === "Enter") { if (adminPin === ADMIN_PASSWORD) { setAdminUnlocked(true); document.cookie = "streamora-admin=true; path=/; max-age=86400"; } else { setPinError("Mot de passe incorrect"); } } }} />
            <button onClick={() => { if (adminPin === ADMIN_PASSWORD) { setAdminUnlocked(true); document.cookie = "streamora-admin=true; path=/; max-age=86400"; } else { setPinError("Mot de passe incorrect"); } }} className="w-full btn-primary py-3">Deverrouiller</button>
          </div>
        </div>
      </>
    );
  }

  // ── Film CRUD ──
  function openAddFilm() {
    setEditingFilm(null);
    setFilmForm({ title: "", description: "", category: "Autre", posterUrl: "", videoUrl: "", year: new Date().getFullYear(), duration: "", featured: false });
    setFilmModal(true);
  }
  function openEditFilm(f: Film) {
    setEditingFilm(f);
    setFilmForm({ title: f.title, description: f.description, category: f.category, posterUrl: f.posterUrl, videoUrl: f.videoUrl, year: f.year, duration: f.duration, featured: f.featured });
    setFilmModal(true);
  }
  async function saveFilm() {
    if (!filmForm.title.trim()) return;
    setSaving(true);
    const body = { ...filmForm, year: Number(filmForm.year) };
    if (editingFilm) {
      await fetch(`/api/films/${editingFilm.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/films", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false);
    setFilmModal(false);
    loadData();
  }
  async function deleteFilm(id: string, title: string) {
    if (!confirm(`Supprimer "${title}" ?`)) return;
    await fetch(`/api/films/${id}`, { method: "DELETE" });
    loadData();
  }

  // ── Series CRUD ──
  function openAddSeries() {
    setEditingSeries(null);
    setSeriesForm({ title: "", description: "", category: "Autre", posterUrl: "", year: new Date().getFullYear(), featured: false });
    setSeriesModal(true);
  }
  function openEditSeries(s: Series) {
    setEditingSeries(s);
    setSeriesForm({ title: s.title, description: s.description, category: s.category, posterUrl: s.posterUrl, year: s.year, featured: s.featured });
    setSeriesModal(true);
  }
  async function saveSeries() {
    if (!seriesForm.title.trim()) return;
    setSaving(true);
    const body = { ...seriesForm, year: Number(seriesForm.year) };
    if (editingSeries) {
      await fetch(`/api/series/${editingSeries.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/series", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false);
    setSeriesModal(false);
    loadData();
  }
  async function deleteSeries(id: string, title: string) {
    if (!confirm(`Supprimer la serie "${title}" et tous ses episodes ?`)) return;
    await fetch(`/api/series/${id}`, { method: "DELETE" });
    loadData();
  }

  // ── Episodes ──
  async function openManageEpisodes(s: Series) {
    const res = await fetch(`/api/series/${s.id}`);
    const full = await res.json();
    setManagingSeries(full);
    setEpisodeForm({ season: 1, number: (full.episodes?.length || 0) + 1, title: "", videoUrl: "", duration: "" });
    setEpisodeModal(true);
  }
  async function addEpisode() {
    if (!managingSeries) return;
    setSaving(true);
    await fetch(`/api/series/${managingSeries.id}/episodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(episodeForm),
    });
    const res = await fetch(`/api/series/${managingSeries.id}`);
    const full = await res.json();
    setManagingSeries(full);
    setEpisodeForm({ season: episodeForm.season, number: (full.episodes?.length || 0) + 1, title: "", videoUrl: "", duration: "" });
    setSaving(false);
    loadData();
  }
  async function deleteEpisode(epId: string) {
    if (!managingSeries) return;
    await fetch(`/api/series/${managingSeries.id}/episodes?episodeId=${epId}`, { method: "DELETE" });
    const res = await fetch(`/api/series/${managingSeries.id}`);
    const full = await res.json();
    setManagingSeries(full);
    loadData();
  }

  const tabs = [
    { key: "dashboard" as const, label: "Dashboard", icon: "&#x1f4ca;" },
    { key: "films" as const, label: "Films", icon: "&#x1f3ac;" },
    { key: "series" as const, label: "Series", icon: "&#x1f4fa;" },
    { key: "users" as const, label: "Utilisateurs", icon: "&#x1f465;" },
  ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-black pt-20 px-4 pb-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Panneau Admin</span>
          </h1>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 bg-gray-900/50 rounded-xl p-1 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 min-w-[100px] rounded-lg px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${tab === t.key ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                <span dangerouslySetInnerHTML={{ __html: t.icon }} /> {t.label}
              </button>
            ))}
          </div>

          {/* ── Dashboard ── */}
          {tab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: "Films", val: stats.films, color: "from-purple-600 to-purple-800" },
                  { label: "Series", val: stats.series, color: "from-pink-600 to-pink-800" },
                  { label: "Episodes", val: stats.episodes, color: "from-blue-600 to-blue-800" },
                  { label: "Downloads", val: stats.downloads, color: "from-green-600 to-green-800" },
                  { label: "Utilisateurs", val: stats.users, color: "from-yellow-600 to-yellow-800" },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl bg-gradient-to-br ${s.color} p-5 text-center`}>
                    <div className="text-3xl font-bold">{s.val || 0}</div>
                    <div className="text-xs text-white/70 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Maintenance toggle */}
              <div className={`rounded-2xl border p-6 ${maintenance ? "border-red-500/30 bg-red-500/5" : "border-white/10 bg-gray-900/50"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      {maintenance ? <span className="text-red-400">&#x1f6a7;</span> : <span className="text-green-400">&#x2705;</span>}
                      Mode Maintenance
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {maintenance
                        ? "Le site est en maintenance. Seul toi peux y accéder."
                        : "Le site est accessible à tout le monde."}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      setMaintenanceLoading(true);
                      try {
                        await fetch("/api/admin/maintenance", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ maintenanceMode: !maintenance }),
                        });
                        setMaintenance(!maintenance);
                      } catch {}
                      setMaintenanceLoading(false);
                    }}
                    disabled={maintenanceLoading}
                    className={`rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                      maintenance
                        ? "bg-green-600 hover:bg-green-500 text-white"
                        : "bg-red-600 hover:bg-red-500 text-white"
                    } disabled:opacity-50`}
                  >
                    {maintenanceLoading ? "..." : maintenance ? "Desactiver la maintenance" : "Activer la maintenance"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Films ── */}
          {tab === "films" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-400 text-sm">{films.length} film{films.length !== 1 ? "s" : ""}</p>
                <button onClick={openAddFilm} className="btn-primary text-sm">+ Ajouter un film</button>
              </div>
              <div className="space-y-2">
                {films.map(f => (
                  <div key={f.id} className="flex items-center gap-4 rounded-xl border border-white/5 bg-gray-900/50 p-3 hover:border-purple-500/30 transition-colors">
                    <div className="h-16 w-11 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0">
                      {f.posterUrl && <img src={f.posterUrl} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{f.title} {f.featured && <span className="text-yellow-400 text-xs ml-1">&#9733;</span>}</p>
                      <p className="text-xs text-gray-500">{f.year} &middot; {f.category} {f.duration && `· ${f.duration}`}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openEditFilm(f)} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10 transition-colors">Modifier</button>
                      <button onClick={() => deleteFilm(f.id, f.title)} className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition-colors">Supprimer</button>
                    </div>
                  </div>
                ))}
                {films.length === 0 && <p className="text-center text-gray-500 py-8">Aucun film. Clique sur &quot;Ajouter&quot; pour commencer.</p>}
              </div>
            </div>
          )}

          {/* ── Series ── */}
          {tab === "series" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-gray-400 text-sm">{seriesList.length} serie{seriesList.length !== 1 ? "s" : ""}</p>
                <button onClick={openAddSeries} className="btn-primary text-sm">+ Ajouter une serie</button>
              </div>
              <div className="space-y-2">
                {seriesList.map(s => (
                  <div key={s.id} className="flex items-center gap-4 rounded-xl border border-white/5 bg-gray-900/50 p-3 hover:border-purple-500/30 transition-colors">
                    <div className="h-16 w-11 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0">
                      {s.posterUrl && <img src={s.posterUrl} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{s.title} {s.featured && <span className="text-yellow-400 text-xs ml-1">&#9733;</span>}</p>
                      <p className="text-xs text-gray-500">{s.year} &middot; {s.category} &middot; {s._count?.episodes || 0} episode{(s._count?.episodes || 0) !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openManageEpisodes(s)} className="rounded-lg bg-purple-500/10 px-3 py-1.5 text-xs text-purple-400 hover:bg-purple-500/20 transition-colors">Episodes</button>
                      <button onClick={() => openEditSeries(s)} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10 transition-colors">Modifier</button>
                      <button onClick={() => deleteSeries(s.id, s.title)} className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition-colors">Supprimer</button>
                    </div>
                  </div>
                ))}
                {seriesList.length === 0 && <p className="text-center text-gray-500 py-8">Aucune serie. Clique sur &quot;Ajouter&quot; pour commencer.</p>}
              </div>
            </div>
          )}

          {/* ── Users ── */}
          {tab === "users" && (
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-4 rounded-xl border border-white/5 bg-gray-900/50 p-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {u.name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{u.name || "Sans nom"}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${u.role === "admin" ? "bg-purple-500/20 text-purple-400" : "bg-gray-800 text-gray-400"}`}>
                    {u.role}
                  </span>
                </div>
              ))}
              {users.length === 0 && <p className="text-center text-gray-500 py-8">Aucun utilisateur inscrit.</p>}
            </div>
          )}
        </div>
      </div>

      {/* ── Film Modal ── */}
      {filmModal && (
        <Modal title={editingFilm ? "Modifier le film" : "Ajouter un film"} onClose={() => setFilmModal(false)}>
          <div className="space-y-4">
            <Field label="Titre" value={filmForm.title} onChange={v => setFilmForm({ ...filmForm, title: v })} />
            <Field label="Description" value={filmForm.description} onChange={v => setFilmForm({ ...filmForm, description: v })} textarea />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Categorie" value={filmForm.category} onChange={v => setFilmForm({ ...filmForm, category: v })} />
              <Field label="Annee" value={String(filmForm.year)} onChange={v => setFilmForm({ ...filmForm, year: Number(v) || new Date().getFullYear() })} />
            </div>
            <Field label="Duree (ex: 1h30)" value={filmForm.duration} onChange={v => setFilmForm({ ...filmForm, duration: v })} />
            <Field label="URL Video (lien direct ou Google Drive)" value={filmForm.videoUrl} onChange={v => setFilmForm({ ...filmForm, videoUrl: v })} placeholder="https://..." />
            <Field label="URL Image / Affiche" value={filmForm.posterUrl} onChange={v => setFilmForm({ ...filmForm, posterUrl: v })} placeholder="https://..." />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filmForm.featured} onChange={e => setFilmForm({ ...filmForm, featured: e.target.checked })} className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500" />
              <span className="text-sm">En vedette (hero sur la page d&apos;accueil)</span>
            </label>
            <button onClick={saveFilm} disabled={saving || !filmForm.title.trim()} className="w-full btn-primary py-3">
              {saving ? "Enregistrement..." : editingFilm ? "Modifier" : "Ajouter"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Series Modal ── */}
      {seriesModal && (
        <Modal title={editingSeries ? "Modifier la serie" : "Ajouter une serie"} onClose={() => setSeriesModal(false)}>
          <div className="space-y-4">
            <Field label="Titre" value={seriesForm.title} onChange={v => setSeriesForm({ ...seriesForm, title: v })} />
            <Field label="Description" value={seriesForm.description} onChange={v => setSeriesForm({ ...seriesForm, description: v })} textarea />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Categorie" value={seriesForm.category} onChange={v => setSeriesForm({ ...seriesForm, category: v })} />
              <Field label="Annee" value={String(seriesForm.year)} onChange={v => setSeriesForm({ ...seriesForm, year: Number(v) || new Date().getFullYear() })} />
            </div>
            <Field label="URL Image / Affiche" value={seriesForm.posterUrl} onChange={v => setSeriesForm({ ...seriesForm, posterUrl: v })} placeholder="https://..." />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={seriesForm.featured} onChange={e => setSeriesForm({ ...seriesForm, featured: e.target.checked })} className="rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-500" />
              <span className="text-sm">En vedette</span>
            </label>
            <button onClick={saveSeries} disabled={saving || !seriesForm.title.trim()} className="w-full btn-primary py-3">
              {saving ? "Enregistrement..." : editingSeries ? "Modifier" : "Ajouter"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Episodes Modal ── */}
      {episodeModal && managingSeries && (
        <Modal title={`Episodes — ${managingSeries.title}`} onClose={() => setEpisodeModal(false)} wide>
          <div className="space-y-4">
            {/* Existing episodes */}
            {managingSeries.episodes && managingSeries.episodes.length > 0 && (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {managingSeries.episodes.map(ep => (
                  <div key={ep.id} className="flex items-center gap-3 rounded-lg bg-gray-800/50 p-2.5">
                    <span className="text-xs font-mono text-purple-400 w-14 flex-shrink-0">S{String(ep.season).padStart(2, "0")}E{String(ep.number).padStart(2, "0")}</span>
                    <span className="flex-1 text-sm truncate">{ep.title || `Episode ${ep.number}`}</span>
                    {ep.videoUrl && <span className="text-green-400 text-xs">&#x2714;</span>}
                    <button onClick={() => deleteEpisode(ep.id)} className="text-xs text-red-400 hover:text-red-300">Suppr.</button>
                  </div>
                ))}
              </div>
            )}
            {(!managingSeries.episodes || managingSeries.episodes.length === 0) && (
              <p className="text-center text-gray-500 text-sm py-4">Aucun episode.</p>
            )}

            <div className="border-t border-white/10 pt-4">
              <p className="text-sm font-medium mb-3">Ajouter un episode</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Saison" value={String(episodeForm.season)} onChange={v => setEpisodeForm({ ...episodeForm, season: Number(v) || 1 })} />
                <Field label="Numero" value={String(episodeForm.number)} onChange={v => setEpisodeForm({ ...episodeForm, number: Number(v) || 1 })} />
              </div>
              <Field label="Titre" value={episodeForm.title} onChange={v => setEpisodeForm({ ...episodeForm, title: v })} />
              <Field label="URL Video" value={episodeForm.videoUrl} onChange={v => setEpisodeForm({ ...episodeForm, videoUrl: v })} placeholder="https://..." />
              <Field label="Duree" value={episodeForm.duration} onChange={v => setEpisodeForm({ ...episodeForm, duration: v })} />
              <button onClick={addEpisode} disabled={saving} className="w-full btn-primary py-2.5 mt-2">
                {saving ? "Ajout..." : "Ajouter l'episode"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-lg"} rounded-2xl border border-white/10 bg-gray-950 p-6 max-h-[90vh] overflow-y-auto`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, textarea }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean }) {
  const cls = "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors";
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-400">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className={cls} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}
