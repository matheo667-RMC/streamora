"use client";

import { useState, useRef } from "react";
import Image from "next/image";

interface Film {
  id: string;
  title: string;
  description: string;
  category: string;
  posterUrl: string;
  videoUrl: string;
  trailerUrl: string;
  year: number;
  duration: string;
  featured: boolean;
  _count: { downloads: number };
}

interface SeriesItem {
  id: string;
  title: string;
  description: string;
  category: string;
  posterUrl: string;
  year: number;
  featured: boolean;
  _count: { episodes: number };
}

interface DownloadEntry {
  id: string;
  createdAt: string | Date;
  film: { title: string };
  user: { name: string | null; email: string | null; image: string | null };
}

interface Stats {
  totalFilms: number;
  totalUsers: number;
  totalDownloads: number;
  totalSeries: number;
}

const CATEGORIES = [
  "Action",
  "Aventure",
  "Comédie",
  "Drame",
  "Horreur",
  "Animation",
  "Sci-Fi",
  "Marvel",
  "Anime",
  "Documentaire",
  "Autre",
];

type Tab = "overview" | "films" | "addfilm" | "series" | "addseries" | "downloads";

export function AdminDashboard({
  films: initialFilms,
  series: initialSeries,
  stats,
  recentDownloads,
}: {
  films: Film[];
  series: SeriesItem[];
  stats: Stats;
  recentDownloads: DownloadEntry[];
}) {
  const [films, setFilms] = useState(initialFilms);
  const [series, setSeries] = useState(initialSeries);
  const [tab, setTab] = useState<Tab>("overview");
  const [editingFilm, setEditingFilm] = useState<Film | null>(null);
  const [editingSeries, setEditingSeries] = useState<SeriesItem | null>(null);

  const [filmForm, setFilmForm] = useState({
    title: "",
    description: "",
    category: "Action",
    posterUrl: "",
    videoUrl: "",
    trailerUrl: "",
    year: new Date().getFullYear(),
    duration: "",
    featured: false,
  });

  const [seriesForm, setSeriesForm] = useState({
    title: "",
    description: "",
    category: "Action",
    posterUrl: "",
    year: new Date().getFullYear(),
    featured: false,
  });

  const [saving, setSaving] = useState(false);

  function resetFilmForm() {
    setFilmForm({
      title: "", description: "", category: "Action", posterUrl: "",
      videoUrl: "", trailerUrl: "", year: new Date().getFullYear(),
      duration: "", featured: false,
    });
    setEditingFilm(null);
  }

  function resetSeriesForm() {
    setSeriesForm({
      title: "", description: "", category: "Action", posterUrl: "",
      year: new Date().getFullYear(), featured: false,
    });
    setEditingSeries(null);
  }

  async function handleFilmSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingFilm ? `/api/films/${editingFilm.id}` : "/api/films";
      const method = editingFilm ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filmForm),
      });
      if (res.ok) {
        const film = await res.json();
        if (editingFilm) {
          setFilms(films.map((f) => f.id === film.id ? { ...film, _count: f._count } : f));
        } else {
          setFilms([{ ...film, _count: { downloads: 0 } }, ...films]);
        }
        resetFilmForm();
        setTab("films");
      }
    } finally { setSaving(false); }
  }

  async function handleSeriesSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingSeries ? `/api/series/${editingSeries.id}` : "/api/series";
      const method = editingSeries ? "PUT" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(seriesForm),
      });
      if (res.ok) {
        const s = await res.json();
        if (editingSeries) {
          setSeries(series.map((x) => x.id === s.id ? { ...s, _count: x._count } : x));
        } else {
          setSeries([{ ...s, _count: { episodes: 0 } }, ...series]);
        }
        resetSeriesForm();
        setTab("series");
      }
    } finally { setSaving(false); }
  }

  async function handleDeleteFilm(id: string) {
    if (!confirm("Supprimer ce film ?")) return;
    const res = await fetch(`/api/films/${id}`, { method: "DELETE" });
    if (res.ok) setFilms(films.filter((f) => f.id !== id));
  }

  async function handleDeleteSeries(id: string) {
    if (!confirm("Supprimer cette série et tous ses épisodes ?")) return;
    const res = await fetch(`/api/series/${id}`, { method: "DELETE" });
    if (res.ok) setSeries(series.filter((s) => s.id !== id));
  }

  function startEditFilm(film: Film) {
    setEditingFilm(film);
    setFilmForm({
      title: film.title, description: film.description, category: film.category,
      posterUrl: film.posterUrl, videoUrl: film.videoUrl, trailerUrl: film.trailerUrl,
      year: film.year, duration: film.duration, featured: film.featured,
    });
    setTab("addfilm");
  }

  function startEditSeries(s: SeriesItem) {
    setEditingSeries(s);
    setSeriesForm({
      title: s.title, description: s.description, category: s.category,
      posterUrl: s.posterUrl, year: s.year, featured: s.featured,
    });
    setTab("addseries");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Panneau Admin</h1>

      {/* Tabs */}
      <div className="mb-8 flex flex-wrap gap-2 border-b border-gray-800 pb-4">
        {([
          ["overview", "Vue d'ensemble"],
          ["films", "Films"],
          ["addfilm", editingFilm ? "Modifier film" : "Ajouter film"],
          ["series", "Séries"],
          ["addseries", editingSeries ? "Modifier série" : "Ajouter série"],
          ["downloads", "Téléchargements"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              if (key === "addfilm" && !editingFilm) resetFilmForm();
              if (key === "addseries" && !editingSeries) resetSeriesForm();
              setTab(key);
            }}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${
              tab === key ? "bg-primary-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Films" value={stats.totalFilms} color="text-primary-400" />
          <StatCard label="Séries" value={stats.totalSeries} color="text-yellow-400" />
          <StatCard label="Utilisateurs" value={stats.totalUsers} color="text-green-400" />
          <StatCard label="Téléchargements" value={stats.totalDownloads} color="text-emerald-400" />
        </div>
      )}

      {/* Films list */}
      {tab === "films" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Films ({films.length})</h2>
            <button onClick={() => { resetFilmForm(); setTab("addfilm"); }} className="btn-primary text-sm">
              + Ajouter un film
            </button>
          </div>
          {films.length === 0 ? (
            <p className="text-gray-400">Aucun film ajouté.</p>
          ) : (
            films.map((film) => (
              <div key={film.id} className="flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded bg-gray-800">
                  {film.posterUrl ? (
                    <Image src={film.posterUrl} alt={film.title} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-600 text-xs">?</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{film.title}</h3>
                  <p className="text-sm text-gray-400">
                    {film.category} · {film.year} · {film._count.downloads} téléchargement{film._count.downloads > 1 ? "s" : ""}
                    {film.featured && <span className="ml-2 text-primary-400">★ En vedette</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEditFilm(film)} className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700">Modifier</button>
                  <button onClick={() => handleDeleteFilm(film.id)} className="rounded-lg bg-red-900/50 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900">Supprimer</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add/Edit Film */}
      {tab === "addfilm" && (
        <form onSubmit={handleFilmSubmit} className="max-w-2xl space-y-4">
          <h2 className="text-xl font-semibold mb-4">{editingFilm ? "Modifier le film" : "Ajouter un film"}</h2>

          <div>
            <label className="mb-1 block text-sm text-gray-300">Titre du film *</label>
            <input type="text" required value={filmForm.title}
              onChange={(e) => setFilmForm({ ...filmForm, title: e.target.value })}
              className="input-field" placeholder="Ex: Harry Potter et la Chambre des Secrets" />
            <p className="mt-1 text-xs text-gray-500">Écrivez le titre tel que vous voulez qu&apos;il apparaisse sur le site</p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300">Description</label>
            <textarea value={filmForm.description}
              onChange={(e) => setFilmForm({ ...filmForm, description: e.target.value })}
              className="input-field h-24 resize-none" placeholder="Synopsis du film..." />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-300">Catégorie</label>
              <select value={filmForm.category}
                onChange={(e) => setFilmForm({ ...filmForm, category: e.target.value })}
                className="input-field">
                {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Année</label>
              <input type="number" value={filmForm.year}
                onChange={(e) => setFilmForm({ ...filmForm, year: parseInt(e.target.value) })}
                className="input-field" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300">Image / Affiche du film</label>
            <PosterUpload value={filmForm.posterUrl} onChange={(url) => setFilmForm({ ...filmForm, posterUrl: url })} />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300">URL de la vidéo</label>
            <input type="url" value={filmForm.videoUrl}
              onChange={(e) => setFilmForm({ ...filmForm, videoUrl: e.target.value })}
              className="input-field" placeholder="https://example.com/movie.mp4" />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300">Durée</label>
            <input type="text" value={filmForm.duration}
              onChange={(e) => setFilmForm({ ...filmForm, duration: e.target.value })}
              className="input-field" placeholder="2h 31min" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="film-featured" checked={filmForm.featured}
              onChange={(e) => setFilmForm({ ...filmForm, featured: e.target.checked })}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-primary-600" />
            <label htmlFor="film-featured" className="text-sm text-gray-300">En vedette (affiché sur la page d&apos;accueil)</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Enregistrement..." : editingFilm ? "Mettre à jour" : "Ajouter le film"}
            </button>
            {editingFilm && (
              <button type="button" onClick={() => { resetFilmForm(); setTab("films"); }} className="btn-secondary">Annuler</button>
            )}
          </div>
        </form>
      )}

      {/* Series list */}
      {tab === "series" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Séries ({series.length})</h2>
            <button onClick={() => { resetSeriesForm(); setTab("addseries"); }} className="btn-primary text-sm">
              + Ajouter une série
            </button>
          </div>
          {series.length === 0 ? (
            <p className="text-gray-400">Aucune série ajoutée.</p>
          ) : (
            series.map((s) => (
              <div key={s.id} className="flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded bg-gray-800">
                  {s.posterUrl ? (
                    <Image src={s.posterUrl} alt={s.title} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-600 text-xs">?</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{s.title}</h3>
                  <p className="text-sm text-gray-400">
                    {s.category} · {s.year} · {s._count.episodes} épisode{s._count.episodes > 1 ? "s" : ""}
                    {s.featured && <span className="ml-2 text-primary-400">★ En vedette</span>}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startEditSeries(s)} className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700">Modifier</button>
                  <button onClick={() => handleDeleteSeries(s.id)} className="rounded-lg bg-red-900/50 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900">Supprimer</button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add/Edit Series */}
      {tab === "addseries" && (
        <form onSubmit={handleSeriesSubmit} className="max-w-2xl space-y-4">
          <h2 className="text-xl font-semibold mb-4">{editingSeries ? "Modifier la série" : "Ajouter une série"}</h2>

          <div>
            <label className="mb-1 block text-sm text-gray-300">Titre de la série *</label>
            <input type="text" required value={seriesForm.title}
              onChange={(e) => setSeriesForm({ ...seriesForm, title: e.target.value })}
              className="input-field" placeholder="Ex: Breaking Bad" />
            <p className="mt-1 text-xs text-gray-500">Écrivez le titre tel que vous voulez qu&apos;il apparaisse sur le site</p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300">Description</label>
            <textarea value={seriesForm.description}
              onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })}
              className="input-field h-24 resize-none" placeholder="Synopsis de la série..." />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-300">Catégorie</label>
              <select value={seriesForm.category}
                onChange={(e) => setSeriesForm({ ...seriesForm, category: e.target.value })}
                className="input-field">
                {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Année</label>
              <input type="number" value={seriesForm.year}
                onChange={(e) => setSeriesForm({ ...seriesForm, year: parseInt(e.target.value) })}
                className="input-field" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300">Image / Affiche de la série</label>
            <PosterUpload value={seriesForm.posterUrl} onChange={(url) => setSeriesForm({ ...seriesForm, posterUrl: url })} />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="series-featured" checked={seriesForm.featured}
              onChange={(e) => setSeriesForm({ ...seriesForm, featured: e.target.checked })}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-primary-600" />
            <label htmlFor="series-featured" className="text-sm text-gray-300">En vedette</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Enregistrement..." : editingSeries ? "Mettre à jour" : "Ajouter la série"}
            </button>
            {editingSeries && (
              <button type="button" onClick={() => { resetSeriesForm(); setTab("series"); }} className="btn-secondary">Annuler</button>
            )}
          </div>
        </form>
      )}

      {/* Downloads */}
      {tab === "downloads" && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold mb-4">Derniers téléchargements</h2>
          {recentDownloads.length === 0 ? (
            <p className="text-gray-400">Aucun téléchargement pour le moment.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-800 text-gray-400">
                  <tr>
                    <th className="pb-3 pr-4">Utilisateur</th>
                    <th className="pb-3 pr-4">Film</th>
                    <th className="pb-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {recentDownloads.map((dl) => (
                    <tr key={dl.id}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          {dl.user.image ? (
                            <Image src={dl.user.image} alt="" width={24} height={24} className="rounded-full" />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-gray-700" />
                          )}
                          <span>{dl.user.name ?? dl.user.email}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-300">{dl.film.title}</td>
                      <td className="py-3 text-gray-400">
                        {new Date(dl.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PosterUpload({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        onChange(data.url);
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-start gap-4">
      {value && (
        <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-800">
          <Image src={value} alt="Poster" fill className="object-cover" />
        </div>
      )}
      <div className="flex flex-col gap-2 flex-1">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
          className="btn-secondary text-sm w-fit">
          {uploading ? "Upload en cours..." : value ? "Changer l'image" : "Choisir une image"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="input-field text-xs" placeholder="Ou collez une URL d'image" />
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
