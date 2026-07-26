// Seeds / refreshes the catalog from TMDB. Idempotent: upserts by tmdbId.
// Films get a tmdbId so the MultiServerPlayer resolves a working stream.
// Series also get their seasons/episodes so the episode list renders.
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();
const KEY = process.env.TMDB_API_KEY || "4e2f8bed54601f3f2b98de4dc0dc7aa9";
const IMG = "https://image.tmdb.org/t/p/w500";

const GENRES = {
  28: "Action", 12: "Aventure", 16: "Animation", 35: "Comédie", 80: "Crime",
  99: "Documentaire", 18: "Drame", 10751: "Famille", 14: "Fantastique",
  36: "Histoire", 27: "Horreur", 10402: "Musique", 9648: "Mystère",
  10749: "Romance", 878: "Science-Fiction", 10770: "Téléfilm", 53: "Thriller",
  10752: "Guerre", 37: "Western", 10759: "Action & Aventure", 10762: "Enfants",
  10765: "Science-Fiction", 10766: "Feuilleton", 10768: "Guerre & Politique",
};

function categoryOf(genreIds = []) {
  for (const g of genreIds) if (GENRES[g]) return GENRES[g];
  return "Autre";
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tmdb(path, params = {}) {
  const qs = new URLSearchParams({ api_key: KEY, language: "fr-FR", ...params });
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(`https://api.themoviedb.org/3${path}?${qs}`);
      if (res.status === 429) { await sleep(1500); continue; }
      if (!res.ok) return null;
      return await res.json();
    } catch { await sleep(800); }
  }
  return null;
}

async function importMovies(endpoint, pages) {
  let count = 0;
  for (let page = 1; page <= pages; page++) {
    const data = await tmdb(`/movie/${endpoint}`, { page });
    if (!data?.results) break;
    for (const m of data.results) {
      if (!m.poster_path || !m.title) continue;
      const year = m.release_date ? parseInt(m.release_date.slice(0, 4)) : 2024;
      try {
        const existing = await prisma.film.findFirst({ where: { tmdbId: m.id } });
        const payload = {
          title: m.title,
          description: m.overview || "",
          category: categoryOf(m.genre_ids),
          posterUrl: `${IMG}${m.poster_path}`,
          videoUrl: "",
          tmdbId: m.id,
          year: isNaN(year) ? 2024 : year,
          featured: (m.vote_average || 0) >= 7.5 && (m.vote_count || 0) > 500,
        };
        if (existing) await prisma.film.update({ where: { id: existing.id }, data: payload });
        else { await prisma.film.create({ data: payload }); count++; }
      } catch { /* skip */ }
    }
    await sleep(120);
  }
  return count;
}

async function importSeries(endpoint, pages) {
  let count = 0;
  for (let page = 1; page <= pages; page++) {
    const data = await tmdb(`/tv/${endpoint}`, { page });
    if (!data?.results) break;
    for (const s of data.results) {
      if (!s.poster_path || !s.name) continue;
      const year = s.first_air_date ? parseInt(s.first_air_date.slice(0, 4)) : 2024;
      try {
        let series = await prisma.series.findFirst({ where: { tmdbId: s.id } });
        const payload = {
          title: s.name,
          description: s.overview || "",
          category: categoryOf(s.genre_ids),
          posterUrl: `${IMG}${s.poster_path}`,
          tmdbId: s.id,
          year: isNaN(year) ? 2024 : year,
          featured: (s.vote_average || 0) >= 7.5 && (s.vote_count || 0) > 300,
        };
        if (series) { await prisma.series.update({ where: { id: series.id }, data: payload }); }
        else { series = await prisma.series.create({ data: payload }); count++; }

        // Fetch seasons/episodes only if none exist yet for this series.
        const epCount = await prisma.episode.count({ where: { seriesId: series.id } });
        if (epCount === 0) {
          const details = await tmdb(`/tv/${s.id}`);
          const seasons = (details?.seasons || []).filter((se) => se.season_number >= 1);
          for (const se of seasons) {
            const seasonData = await tmdb(`/tv/${s.id}/season/${se.season_number}`);
            if (!seasonData?.episodes) continue;
            const rows = seasonData.episodes.map((e) => ({
              seriesId: series.id,
              season: se.season_number,
              number: e.episode_number,
              title: e.name || `Épisode ${e.episode_number}`,
              videoUrl: "",
              duration: e.runtime ? `${e.runtime} min` : "",
            }));
            if (rows.length) await prisma.episode.createMany({ data: rows });
            await sleep(60);
          }
        }
      } catch { /* skip */ }
    }
    await sleep(120);
  }
  return count;
}

async function main() {
  console.log("Importing movies…");
  let films = 0;
  films += await importMovies("popular", 25);
  films += await importMovies("top_rated", 15);
  films += await importMovies("now_playing", 8);
  console.log("new films:", films, "total:", await prisma.film.count());

  console.log("Importing series (with episodes)…");
  let series = 0;
  series += await importSeries("popular", 12);
  series += await importSeries("top_rated", 8);
  console.log("new series:", series, "total:", await prisma.series.count(), "episodes:", await prisma.episode.count());

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
