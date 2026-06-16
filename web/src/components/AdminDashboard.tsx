"use client";

import { useState } from "react";
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
  "Documentaire",
  "Autre",
];

export function AdminDashboard({
  films: initialFilms,
  stats,
  recentDownloads,
}: {
  films: Film[];
  stats: Stats;
  recentDownloads: DownloadEntry[];
}) {
  const [films, setFilms] = useState(initialFilms);
  const [tab, setTab] = useState<"overview" | "films" | "add" | "downloads">(
    "overview"
  );
  const [editingFilm, setEditingFilm] = useState<Film | null>(null);
  const [formData, setFormData] = useState({
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
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setFormData({
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
    setEditingFilm(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingFilm
        ? `/api/films/${editingFilm.id}`
        : "/api/films";
      const method = editingFilm ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const film = await res.json();
        if (editingFilm) {
          setFilms(
            films.map((f) =>
              f.id === film.id ? { ...film, _count: f._count } : f
            )
          );
        } else {
          setFilms([{ ...film, _count: { downloads: 0 } }, ...films]);
        }
        resetForm();
        setTab("films");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce film ?")) return;

    const res = await fetch(`/api/films/${id}`, { method: "DELETE" });
    if (res.ok) {
      setFilms(films.filter((f) => f.id !== id));
    }
  }

  function startEdit(film: Film) {
    setEditingFilm(film);
    setFormData({
      title: film.title,
      description: film.description,
      category: film.category,
      posterUrl: film.posterUrl,
      videoUrl: film.videoUrl,
      trailerUrl: film.trailerUrl,
      year: film.year,
      duration: film.duration,
      featured: film.featured,
    });
    setTab("add");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Panneau Admin</h1>

      {/* Tabs */}
      <div className="mb-8 flex gap-2 border-b border-gray-800 pb-4">
        {(
          [
            ["overview", "Vue d'ensemble"],
            ["films", "Films"],
            ["add", editingFilm ? "Modifier le film" : "Ajouter un film"],
            ["downloads", "Téléchargements"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              if (key === "add" && !editingFilm) resetForm();
              setTab(key);
            }}
            className={`rounded-lg px-4 py-2 text-sm transition-colors ${
              tab === key
                ? "bg-primary-600 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div className="grid gap-6 sm:grid-cols-3">
          <StatCard label="Films" value={stats.totalFilms} icon="film" />
          <StatCard
            label="Utilisateurs"
            value={stats.totalUsers}
            icon="users"
          />
          <StatCard
            label="Téléchargements"
            value={stats.totalDownloads}
            icon="download"
          />
        </div>
      )}

      {/* Films list */}
      {tab === "films" && (
        <div className="space-y-3">
          {films.length === 0 ? (
            <p className="text-gray-400">Aucun film ajouté.</p>
          ) : (
            films.map((film) => (
              <div
                key={film.id}
                className="flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4"
              >
                <div className="relative h-16 w-11 flex-shrink-0 overflow-hidden rounded bg-gray-800">
                  {film.posterUrl ? (
                    <Image
                      src={film.posterUrl}
                      alt={film.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-600 text-xs">
                      ?
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{film.title}</h3>
                  <p className="text-sm text-gray-400">
                    {film.category} · {film.year} ·{" "}
                    {film._count.downloads} téléchargement
                    {film._count.downloads > 1 ? "s" : ""}
                    {film.featured && (
                      <span className="ml-2 text-primary-400">★ En vedette</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(film)}
                    className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(film.id)}
                    className="rounded-lg bg-red-900/50 px-3 py-1.5 text-sm text-red-400 hover:bg-red-900"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add/Edit form */}
      {tab === "add" && (
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-300">
              Titre du film *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="input-field"
              placeholder="Ex: Avengers: Endgame"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="input-field h-24 resize-none"
              placeholder="Synopsis du film..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-300">
                Catégorie
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="input-field"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-300">Année</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) =>
                  setFormData({ ...formData, year: parseInt(e.target.value) })
                }
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300">
              URL de l&apos;affiche (poster)
            </label>
            <input
              type="url"
              value={formData.posterUrl}
              onChange={(e) =>
                setFormData({ ...formData, posterUrl: e.target.value })
              }
              className="input-field"
              placeholder="https://example.com/poster.jpg"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300">
              URL de la vidéo *
            </label>
            <input
              type="url"
              value={formData.videoUrl}
              onChange={(e) =>
                setFormData({ ...formData, videoUrl: e.target.value })
              }
              className="input-field"
              placeholder="https://example.com/movie.mp4"
            />
            <p className="mt-1 text-xs text-gray-500">
              Lien direct vers le fichier vidéo (MP4, MKV, etc.)
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-300">Durée</label>
            <input
              type="text"
              value={formData.duration}
              onChange={(e) =>
                setFormData({ ...formData, duration: e.target.value })
              }
              className="input-field"
              placeholder="2h 31min"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured"
              checked={formData.featured}
              onChange={(e) =>
                setFormData({ ...formData, featured: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-primary-600"
            />
            <label htmlFor="featured" className="text-sm text-gray-300">
              Film en vedette (affiché sur la page d&apos;accueil)
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving
                ? "Enregistrement..."
                : editingFilm
                ? "Mettre à jour"
                : "Ajouter le film"}
            </button>
            {editingFilm && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setTab("films");
                }}
                className="btn-secondary"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      )}

      {/* Downloads */}
      {tab === "downloads" && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold mb-4">
            Derniers téléchargements
          </h2>
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
                            <Image
                              src={dl.user.image}
                              alt=""
                              width={24}
                              height={24}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-gray-700" />
                          )}
                          <span>{dl.user.name ?? dl.user.email}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-gray-300">
                        {dl.film.title}
                      </td>
                      <td className="py-3 text-gray-400">
                        {new Date(dl.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
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

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  const icons: Record<string, React.ReactNode> = {
    film: (
      <svg
        className="h-8 w-8 text-primary-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
        />
      </svg>
    ),
    users: (
      <svg
        className="h-8 w-8 text-green-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    download: (
      <svg
        className="h-8 w-8 text-purple-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
    ),
  };

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="mt-1 text-3xl font-bold">{value}</p>
        </div>
        {icons[icon]}
      </div>
    </div>
  );
}
