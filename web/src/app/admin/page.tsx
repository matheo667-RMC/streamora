"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { VideoUploader } from "@/components/VideoUploader";

const ADMIN_EMAIL = "max350457@gmail.com";
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
  const [tab, setTab] = useState<"dashboard" | "films" | "series" | "users" | "convert">("dashboard");

  // Video converter
  const [convertedUrls, setConvertedUrls] = useState<{ fileName: string; url: string; size: string }[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [driveUrl, setDriveUrl] = useState("");
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

  // Poster search
  const [posterResults, setPosterResults] = useState<{ id: number; title: string; year: string; posterUrl: string; posterUrlHD: string; overview: string }[]>([]);
  const [posterSearching, setPosterSearching] = useState(false);
  const [posterTarget, setPosterTarget] = useState<"film" | "series">("film");
  const [episodeInfoLoading, setEpisodeInfoLoading] = useState(false);

  async function searchPoster(title: string, type: "film" | "series") {
    if (!title.trim()) return;
    setPosterSearching(true);
    setPosterTarget(type);
    try {
      const res = await fetch(`/api/admin/poster-search?q=${encodeURIComponent(title)}&type=${type === "series" ? "series" : "movie"}`);
      const data = await res.json();
      setPosterResults(data.results || []);
    } catch { setPosterResults([]); }
    setPosterSearching(false);
  }

  function selectPoster(url: string, description?: string) {
    if (posterTarget === "film") {
      setFilmForm(f => ({ ...f, posterUrl: url, description: f.description || description || "" }));
    } else {
      setSeriesForm(f => ({ ...f, posterUrl: url, description: f.description || description || "" }));
    }
    setPosterResults([]);
  }

  async function fillFilmDuration(url: string, current: string) {
    if (current.trim() || !url.trim()) return;
    const d = await probeVideoDuration(url);
    if (d) setFilmForm(f => (f.duration.trim() ? f : { ...f, duration: d }));
  }

  async function fillEpisodeDuration(url: string, current: string) {
    if (current.trim() || !url.trim()) return;
    const d = await probeVideoDuration(url);
    if (d) setEpisodeForm(e => (e.duration.trim() ? e : { ...e, duration: d }));
  }

  async function fillEpisodeInfo() {
    if (!managingSeries) return;
    setEpisodeInfoLoading(true);
    try {
      const res = await fetch(`/api/admin/episode-info?q=${encodeURIComponent(managingSeries.title)}&season=${episodeForm.season}&number=${episodeForm.number}`);
      const data = await res.json();
      setEpisodeForm(e => ({
        ...e,
        title: data.title || e.title,
        duration: e.duration.trim() ? e.duration : (data.duration || e.duration),
      }));
    } catch { /* ignore */ }
    setEpisodeInfoLoading(false);
  }

  // Maintenance
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintenanceStyle, setMaintenanceStyle] = useState("classic");

  const loadData = useCallback(() => {
    fetch("/api/admin/stats").then(r => r.json()).then(setStats).catch(() => {});
    fetch("/api/films").then(r => r.json()).then(setFilms).catch(() => {});
    fetch("/api/series").then(r => r.json()).then(setSeriesList).catch(() => {});
    fetch("/api/admin/users").then(r => r.json()).then(d => { if (Array.isArray(d)) setUsers(d); }).catch(() => {});
    fetch("/api/admin/maintenance").then(r => r.json()).then(d => { setMaintenance(d.maintenanceMode || false); setMaintenanceStyle(d.maintenanceStyle || "classic"); }).catch(() => {});
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
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors mb-4 text-center text-lg tracking-widest"
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
      setSaving(false);
      setSeriesModal(false);
      loadData();
    } else {
      const res = await fetch("/api/series", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const created = await res.json();
      setSaving(false);
      setSeriesModal(false);
      loadData();
      // Auto-open episodes modal after creating a new series
      if (created?.id) {
        setTimeout(() => {
          openManageEpisodes(created);
        }, 300);
      }
    }
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

  function convertDriveUrl(url: string) {
    setUploadError(null);
    // Extract Google Drive file ID from various URL formats
    let fileId = "";
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]+)/,
      /[?&]id=([a-zA-Z0-9_-]+)/,
      /\/open\?id=([a-zA-Z0-9_-]+)/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) { fileId = m[1]; break; }
    }
    if (!fileId) {
      setUploadError("Lien Google Drive invalide. Colle un lien du type : https://drive.google.com/file/d/.../view");
      return;
    }
    const proxyUrl = `/api/video-proxy?id=${fileId}`;
    setConvertedUrls(prev => [{ fileName: `Google Drive (${fileId.slice(0, 10)}...)`, url: proxyUrl, size: "Google Drive" }, ...prev]);
  }

  const tabs = [
    { key: "dashboard" as const, label: "Dashboard", icon: "&#x1f4ca;" },
    { key: "films" as const, label: "Films", icon: "&#x1f3ac;" },
    { key: "series" as const, label: "Series", icon: "&#x1f4fa;" },
    { key: "users" as const, label: "Utilisateurs", icon: "&#x1f465;" },
    { key: "convert" as const, label: "Convertisseur", icon: "&#x1f517;" },
  ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-black pt-20 px-4 pb-10">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <h1 className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">Panneau Admin</span>
            </h1>
            <a href="/admin/premium" className="rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-2 text-sm font-semibold">
              Utilisateurs & Réglages →
            </a>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 bg-gray-900/50 rounded-xl p-1 overflow-x-auto">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex-1 min-w-[100px] rounded-lg px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${tab === t.key ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}>
                <span dangerouslySetInnerHTML={{ __html: t.icon }} /> {t.label}
              </button>
            ))}
          </div>

          {/* ── Dashboard ── */}
          {tab === "dashboard" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: "Films", val: stats.films, color: "from-emerald-600 to-emerald-800" },
                  { label: "Series", val: stats.series, color: "from-green-600 to-green-800" },
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
                          body: JSON.stringify({ maintenanceMode: !maintenance, maintenanceStyle }),
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

                {/* Style selector */}
                <div className="mt-5 pt-5 border-t border-white/10">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">Style de la page maintenance :</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: "classic", name: "Classique", desc: "Logo + animation", color: "emerald" },
                      { id: "cinema", name: "Cinema", desc: "Style film/entracte", color: "yellow" },
                      { id: "neon", name: "Neon", desc: "Effets lumineux", color: "cyan" },
                      { id: "minimal", name: "Minimal", desc: "Fond blanc, simple", color: "gray" },
                      { id: "countdown", name: "Chargement", desc: "Barre de progression", color: "red" },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={async () => {
                          setMaintenanceStyle(s.id);
                          await fetch("/api/admin/maintenance", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ maintenanceMode: maintenance, maintenanceStyle: s.id }),
                          });
                        }}
                        className={`rounded-xl p-3 text-left border transition-all ${
                          maintenanceStyle === s.id
                            ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                      >
                        <div className="text-sm font-medium">{s.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{s.desc}</div>
                      </button>
                    ))}
                  </div>
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
                  <div key={f.id} className="flex items-center gap-4 rounded-xl border border-white/5 bg-gray-900/50 p-3 hover:border-emerald-500/30 transition-colors">
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
                  <div key={s.id} className="flex items-center gap-4 rounded-xl border border-white/5 bg-gray-900/50 p-3 hover:border-emerald-500/30 transition-colors">
                    <div className="h-16 w-11 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0">
                      {s.posterUrl && <img src={s.posterUrl} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{s.title} {s.featured && <span className="text-yellow-400 text-xs ml-1">&#9733;</span>}</p>
                      <p className="text-xs text-gray-500">{s.year} &middot; {s.category} &middot; {s._count?.episodes || 0} episode{(s._count?.episodes || 0) !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => openManageEpisodes(s)} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors">Episodes</button>
                      <button onClick={() => openEditSeries(s)} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10 transition-colors">Modifier</button>
                      <button onClick={() => deleteSeries(s.id, s.title)} className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition-colors">Supprimer</button>
                    </div>
                  </div>
                ))}
                {seriesList.length === 0 && <p className="text-center text-gray-500 py-8">Aucune serie. Clique sur &quot;Ajouter&quot; pour commencer.</p>}
              </div>
            </div>
          )}

          {/* ── Convertisseur ── */}
          {tab === "convert" && (
            <div className="space-y-6">
              <div className="text-center mb-2">
                <h2 className="text-xl font-bold">Video <span className="text-emerald-500">&rarr;</span> URL</h2>
                <p className="text-sm text-gray-400 mt-1">Transforme ton film en lien pour l&apos;ajouter au site</p>
              </div>

              {/* Upload video -> public link */}
              <VideoUploader onUploaded={(u) => setConvertedUrls(prev => [{ fileName: "Vidéo uploadée", url: u, size: "Lien public" }, ...prev])} />

              {/* OR separator */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-gray-500 font-medium">OU coller un lien</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Paste any direct URL - PRIMARY method */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-5.561a4.5 4.5 0 00-6.364 6.364L7.5 15.75" /></svg>
                  <h3 className="font-bold text-base">Coller n&apos;importe quel lien video</h3>
                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">Recommande</span>
                </div>
                <p className="text-xs text-gray-400 mb-4">Ton serveur perso, un lien direct (.mp4), un embed, Google Drive... colle simplement l&apos;adresse ci-dessous.</p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    id="directUrlInput"
                    placeholder="https://... (colle ton lien video ici)"
                    className="flex-1 rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (val) { setConvertedUrls(prev => [{ fileName: "URL directe", url: val, size: "Lien" }, ...prev]); (e.target as HTMLInputElement).value = ""; }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const inp = document.getElementById("directUrlInput") as HTMLInputElement;
                      const val = inp?.value.trim();
                      if (val) { setConvertedUrls(prev => [{ fileName: "URL directe", url: val, size: "Lien" }, ...prev]); inp.value = ""; }
                    }}
                    className="shrink-0 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
                  >
                    Ajouter
                  </button>
                </div>
              </div>

              {uploadError && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{uploadError}</div>
              )}

              {/* OR separator */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-gray-500 font-medium">OU via Google Drive</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Google Drive converter - optional */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <h3 className="font-bold text-sm text-gray-300 mb-1 flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor"><path d="M7.71 3.5L1.15 15l4.58 7.5h13.54L12 3.5H7.71zm5.77 0l7.44 12.88-3.56 6.12H22l-4.48-7.5L12.48 3.5h1z" /></svg>
                  Convertir un lien Google Drive
                </h3>
                <p className="text-xs text-gray-500 mb-3">Colle un lien de partage Drive (&laquo; Tous les utilisateurs disposant du lien &raquo;) pour le transformer en lien de streaming.</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={driveUrl}
                    onChange={e => setDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/.../view"
                    className="flex-1 rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                    onKeyDown={e => { if (e.key === "Enter" && driveUrl.trim()) { convertDriveUrl(driveUrl.trim()); setDriveUrl(""); } }}
                  />
                  <button
                    onClick={() => { if (driveUrl.trim()) { convertDriveUrl(driveUrl.trim()); setDriveUrl(""); } }}
                    disabled={!driveUrl.trim()}
                    className="shrink-0 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                  >
                    Convertir
                  </button>
                </div>
              </div>

              {/* Results */}
              {convertedUrls.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                    <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-5.561a4.5 4.5 0 00-6.364 6.364L7.5 15.75" />
                    </svg>
                    Liens generes
                  </h3>
                  {convertedUrls.map((r, i) => (
                    <div key={i} className="rounded-xl border border-white/10 bg-gray-900/50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 rounded-lg bg-emerald-500/10 p-2">
                          <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{r.fileName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{r.size}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <code className="flex-1 min-w-0 truncate rounded-lg bg-black/50 border border-white/5 px-3 py-2 text-xs text-gray-300 font-mono">{r.url}</code>
                            <button
                              onClick={() => { navigator.clipboard.writeText(r.url); setCopiedUrl(r.url); setTimeout(() => setCopiedUrl(null), 2000); }}
                              className={`shrink-0 rounded-lg px-4 py-2 text-xs font-medium transition-all ${copiedUrl === r.url ? "bg-green-600 text-white" : "bg-emerald-600 text-white hover:bg-emerald-500"}`}
                            >
                              {copiedUrl === r.url ? "Copie !" : "Copier"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-white/5 bg-gray-900/30 p-5">
                <h3 className="font-bold text-sm text-gray-300 mb-3">Comment ca marche ?</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="space-y-2">
                    <div className="mx-auto h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-sm">1</div>
                    <p className="text-xs text-gray-400">Recupere le lien video (ton serveur, un lien direct .mp4, Google Drive...)</p>
                  </div>
                  <div className="space-y-2">
                    <div className="mx-auto h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-sm">2</div>
                    <p className="text-xs text-gray-400">Colle-le ci-dessus (ou convertis un lien Drive) et copie l&apos;URL generee</p>
                  </div>
                  <div className="space-y-2">
                    <div className="mx-auto h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-sm">3</div>
                    <p className="text-xs text-gray-400">Colle-la dans le champ Video d&apos;un film/serie, ajoute titre + affiche</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Users ── */}
          {tab === "users" && (
            <div className="space-y-2">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-4 rounded-xl border border-white/5 bg-gray-900/50 p-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {u.name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{u.name || "Sans nom"}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${u.role === "admin" ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-800 text-gray-400"}`}>
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
            <Field label="URL Video (colle n'importe quel lien : ton serveur, .mp4, embed, Google Drive...)" value={filmForm.videoUrl} onChange={v => setFilmForm({ ...filmForm, videoUrl: v })} placeholder="https://... (n'importe quel lien video)" onBlur={() => fillFilmDuration(filmForm.videoUrl, filmForm.duration)} />
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Affiche du film</label>
              <div className="flex gap-2">
                <input type="text" value={filmForm.posterUrl} onChange={e => setFilmForm({ ...filmForm, posterUrl: e.target.value })} placeholder="URL de l'affiche ou chercher ci-dessous" className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors" />
                <button type="button" onClick={() => searchPoster(filmForm.title, "film")} disabled={posterSearching || !filmForm.title.trim()} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap transition-colors">
                  {posterSearching ? "..." : "Chercher HD"}
                </button>
              </div>
              {filmForm.posterUrl && (
                <div className="mt-2 flex justify-center"><img src={filmForm.posterUrl} alt="Preview" className="h-32 rounded-lg object-cover" /></div>
              )}
              {posterResults.length > 0 && posterTarget === "film" && (
                <div className="mt-2 grid grid-cols-4 gap-2 max-h-60 overflow-y-auto rounded-lg border border-white/10 bg-black/50 p-2">
                  {posterResults.map(r => (
                    <button key={r.id} type="button" onClick={() => selectPoster(r.posterUrlHD, r.overview)} className="group relative rounded-lg overflow-hidden border border-transparent hover:border-emerald-500 transition-colors">
                      <img src={r.posterUrl} alt={r.title} className="w-full aspect-[2/3] object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1 text-[10px] text-center truncate">{r.title} ({r.year})</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filmForm.featured} onChange={e => setFilmForm({ ...filmForm, featured: e.target.checked })} className="rounded border-gray-600 bg-gray-700 text-emerald-600 focus:ring-emerald-500" />
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
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Affiche de la serie</label>
              <div className="flex gap-2">
                <input type="text" value={seriesForm.posterUrl} onChange={e => setSeriesForm({ ...seriesForm, posterUrl: e.target.value })} placeholder="URL de l'affiche ou chercher ci-dessous" className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors" />
                <button type="button" onClick={() => searchPoster(seriesForm.title, "series")} disabled={posterSearching || !seriesForm.title.trim()} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap transition-colors">
                  {posterSearching ? "..." : "Chercher HD"}
                </button>
              </div>
              {seriesForm.posterUrl && (
                <div className="mt-2 flex justify-center"><img src={seriesForm.posterUrl} alt="Preview" className="h-32 rounded-lg object-cover" /></div>
              )}
              {posterResults.length > 0 && posterTarget === "series" && (
                <div className="mt-2 grid grid-cols-4 gap-2 max-h-60 overflow-y-auto rounded-lg border border-white/10 bg-black/50 p-2">
                  {posterResults.map(r => (
                    <button key={r.id} type="button" onClick={() => selectPoster(r.posterUrlHD, r.overview)} className="group relative rounded-lg overflow-hidden border border-transparent hover:border-emerald-500 transition-colors">
                      <img src={r.posterUrl} alt={r.title} className="w-full aspect-[2/3] object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/80 p-1 text-[10px] text-center truncate">{r.title} ({r.year})</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={seriesForm.featured} onChange={e => setSeriesForm({ ...seriesForm, featured: e.target.checked })} className="rounded border-gray-600 bg-gray-700 text-emerald-600 focus:ring-emerald-500" />
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
            {/* Help text */}
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
              <p className="text-sm text-emerald-300">Pour ajouter un episode, remplis le formulaire ci-dessous avec n&apos;importe quel lien video (ton serveur, un lien direct .mp4, un embed, Google Drive...). L&apos;episode sera automatiquement ajoute a la serie.</p>
            </div>

            {/* Existing episodes grouped by season */}
            {managingSeries.episodes && managingSeries.episodes.length > 0 && (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {[...new Set(managingSeries.episodes.map(ep => ep.season))].sort((a, b) => a - b).map(season => (
                  <div key={season}>
                    <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Saison {season}</p>
                    <div className="space-y-1">
                      {managingSeries.episodes!.filter(ep => ep.season === season).sort((a, b) => a.number - b.number).map(ep => (
                        <div key={ep.id} className="flex items-center gap-3 rounded-lg bg-gray-800/50 p-2.5 group hover:bg-gray-800 transition-colors">
                          <span className="text-xs font-mono text-gray-400 w-8 flex-shrink-0">E{String(ep.number).padStart(2, "0")}</span>
                          <span className="flex-1 text-sm truncate">{ep.title || `Episode ${ep.number}`}</span>
                          {ep.duration && <span className="text-xs text-gray-500">{ep.duration}</span>}
                          {ep.videoUrl ? <span className="text-green-400 text-xs">&#x2714; Video</span> : <span className="text-yellow-400 text-xs">Pas de video</span>}
                          <button onClick={() => deleteEpisode(ep.id)} className="text-xs text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">Suppr.</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(!managingSeries.episodes || managingSeries.episodes.length === 0) && (
              <div className="text-center py-6 border border-dashed border-white/10 rounded-lg">
                <p className="text-gray-500 text-sm">Aucun episode pour le moment.</p>
                <p className="text-gray-600 text-xs mt-1">Ajoute ton premier episode ci-dessous !</p>
              </div>
            )}

            <div className="border-t border-white/10 pt-4">
              <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">+</span>
                Ajouter un episode
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Saison" value={String(episodeForm.season)} onChange={v => setEpisodeForm({ ...episodeForm, season: Number(v) || 1 })} />
                <Field label="Episode n°" value={String(episodeForm.number)} onChange={v => setEpisodeForm({ ...episodeForm, number: Number(v) || 1 })} />
                <Field label="Duree (ex: 45min)" value={episodeForm.duration} onChange={v => setEpisodeForm({ ...episodeForm, duration: v })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Titre de l&apos;episode</label>
                <div className="flex gap-2">
                  <input type="text" value={episodeForm.title} onChange={e => setEpisodeForm({ ...episodeForm, title: e.target.value })} placeholder="Ex: L'arrivee de Luffy" className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors" />
                  <button type="button" onClick={fillEpisodeInfo} disabled={episodeInfoLoading} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 whitespace-nowrap transition-colors">
                    {episodeInfoLoading ? "..." : "Titre TMDB"}
                  </button>
                </div>
              </div>
              <Field label="URL Video (colle n'importe quel lien : ton serveur, .mp4, embed, Google Drive...)" value={episodeForm.videoUrl} onChange={v => setEpisodeForm({ ...episodeForm, videoUrl: v })} placeholder="https://... (n'importe quel lien video)" onBlur={() => fillEpisodeDuration(episodeForm.videoUrl, episodeForm.duration)} />
              <button onClick={addEpisode} disabled={saving || !episodeForm.videoUrl.trim()} className="w-full btn-primary py-2.5 mt-3">
                {saving ? "Ajout en cours..." : "Ajouter l'episode"}
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

function Field({ label, value, onChange, placeholder, textarea, onBlur }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean; onBlur?: () => void }) {
  const cls = "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors";
  return (
    <div className="space-y-1">
      <label className="text-xs text-gray-400">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} className={cls} />
      ) : (
        <input type="text" value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}

// Reads the real duration of a video file from its URL (client-side).
function probeVideoDuration(url: string): Promise<string> {
  return new Promise(resolve => {
    if (!/^https?:\/\//i.test(url.trim())) { resolve(""); return; }
    const v = document.createElement("video");
    v.preload = "metadata";
    let settled = false;
    const done = (d: string) => { if (settled) return; settled = true; v.removeAttribute("src"); v.load(); resolve(d); };
    v.onloadedmetadata = () => {
      const s = v.duration;
      if (!s || !isFinite(s)) { done(""); return; }
      const h = Math.floor(s / 3600);
      const m = Math.round((s % 3600) / 60);
      done(h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`);
    };
    v.onerror = () => done("");
    setTimeout(() => done(""), 15000);
    v.src = url.trim();
  });
}
