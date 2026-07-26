import { prisma } from "@/lib/prisma";

// TMDB-backed catalog. Films/series are keyed by tmdbId so playback resolves
// through the MultiServerPlayer (multi-source) and never rots on a dead link.

const KEY = process.env.TMDB_API_KEY || "4e2f8bed54601f3f2b98de4dc0dc7aa9";
const IMG = "https://image.tmdb.org/t/p/w500";

const GENRES: Record<number, string> = {
  28: "Action", 12: "Aventure", 16: "Animation", 35: "Comédie", 80: "Crime",
  99: "Documentaire", 18: "Drame", 10751: "Famille", 14: "Fantastique",
  36: "Histoire", 27: "Horreur", 10402: "Musique", 9648: "Mystère",
  10749: "Romance", 878: "Science-Fiction", 10770: "Téléfilm", 53: "Thriller",
  10752: "Guerre", 37: "Western", 10759: "Action & Aventure", 10762: "Enfants",
  10765: "Science-Fiction", 10766: "Feuilleton", 10768: "Guerre & Politique",
};

function categoryOf(genreIds: number[] = []): string {
  for (const g of genreIds) if (GENRES[g]) return GENRES[g];
  return "Autre";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface TmdbMovie {
  id: number; title?: string; overview?: string; poster_path?: string | null;
  genre_ids?: number[]; release_date?: string; vote_average?: number; vote_count?: number;
}
interface TmdbTv {
  id: number; name?: string; overview?: string; poster_path?: string | null;
  genre_ids?: number[]; first_air_date?: string; vote_average?: number; vote_count?: number;
}
interface TmdbSeason { season_number: number }
interface TmdbEpisode { episode_number: number; name?: string; runtime?: number | null }

async function tmdb<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const qs = new URLSearchParams({ api_key: KEY, language: "fr-FR", ...params });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://api.themoviedb.org/3${path}?${qs}`);
      if (res.status === 429) { await sleep(1200); continue; }
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch { await sleep(600); }
  }
  return null;
}

export async function importMovies(endpoint: string, pages: number): Promise<number> {
  let added = 0;
  for (let page = 1; page <= pages; page++) {
    const data = await tmdb<{ results: TmdbMovie[] }>(`/movie/${endpoint}`, { page: String(page) });
    if (!data?.results) break;
    for (const m of data.results) {
      if (!m.poster_path || !m.title) continue;
      const year = m.release_date ? parseInt(m.release_date.slice(0, 4)) : 2024;
      const payload = {
        title: m.title,
        description: m.overview || "",
        category: categoryOf(m.genre_ids),
        posterUrl: `${IMG}${m.poster_path}`,
        videoUrl: "",
        tmdbId: m.id,
        year: Number.isNaN(year) ? 2024 : year,
        featured: (m.vote_average || 0) >= 7.5 && (m.vote_count || 0) > 500,
      };
      try {
        const existing = await prisma.film.findFirst({ where: { tmdbId: m.id } });
        if (existing) await prisma.film.update({ where: { id: existing.id }, data: payload });
        else { await prisma.film.create({ data: payload }); added++; }
      } catch { /* skip */ }
    }
    await sleep(100);
  }
  return added;
}

export async function importSeries(endpoint: string, pages: number): Promise<number> {
  let added = 0;
  for (let page = 1; page <= pages; page++) {
    const data = await tmdb<{ results: TmdbTv[] }>(`/tv/${endpoint}`, { page: String(page) });
    if (!data?.results) break;
    for (const s of data.results) {
      if (!s.poster_path || !s.name) continue;
      const year = s.first_air_date ? parseInt(s.first_air_date.slice(0, 4)) : 2024;
      const payload = {
        title: s.name,
        description: s.overview || "",
        category: categoryOf(s.genre_ids),
        posterUrl: `${IMG}${s.poster_path}`,
        tmdbId: s.id,
        year: Number.isNaN(year) ? 2024 : year,
        featured: (s.vote_average || 0) >= 7.5 && (s.vote_count || 0) > 300,
      };
      try {
        let series = await prisma.series.findFirst({ where: { tmdbId: s.id } });
        if (series) {
          await prisma.series.update({ where: { id: series.id }, data: payload });
        } else {
          series = await prisma.series.create({ data: payload });
          added++;
        }
        const epCount = await prisma.episode.count({ where: { seriesId: series.id } });
        if (epCount === 0) {
          const details = await tmdb<{ seasons: TmdbSeason[] }>(`/tv/${s.id}`);
          const seasons = (details?.seasons || []).filter((se) => se.season_number >= 1);
          for (const se of seasons) {
            const seasonData = await tmdb<{ episodes: TmdbEpisode[] }>(`/tv/${s.id}/season/${se.season_number}`);
            if (!seasonData?.episodes) continue;
            const rows = seasonData.episodes.map((e) => ({
              seriesId: series!.id,
              season: se.season_number,
              number: e.episode_number,
              title: e.name || `Épisode ${e.episode_number}`,
              videoUrl: "",
              duration: e.runtime ? `${e.runtime} min` : "",
            }));
            if (rows.length) await prisma.episode.createMany({ data: rows });
            await sleep(50);
          }
        }
      } catch { /* skip */ }
    }
    await sleep(100);
  }
  return added;
}

// Weekly self-updater: pulls the freshest TMDB titles (idempotent upserts).
export async function updateCatalog(): Promise<{ films: number; series: number }> {
  let films = 0;
  films += await importMovies("now_playing", 5);
  films += await importMovies("popular", 5);
  films += await importMovies("top_rated", 3);

  let series = 0;
  series += await importSeries("on_the_air", 3);
  series += await importSeries("popular", 3);

  return { films, series };
}
