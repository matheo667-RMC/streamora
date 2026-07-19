// Adds series by TMDB id. Episodes are created with empty videoUrl so the
// player resolves playback dynamically from the TMDB id (vidlink/vidsrc).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const TMDB_KEY = "4e2f8bed54601f3f2b98de4dc0dc7aa9";

// TMDB TV ids requested by the user
const SERIES_IDS = [
  99583,  // Danger Force (Kid Danger spinoff)
  61520,  // Sanjay et Craig
];

async function tmdb(path) {
  const res = await fetch(`https://api.themoviedb.org/3${path}${path.includes("?") ? "&" : "?"}api_key=${TMDB_KEY}&language=fr-FR`);
  if (!res.ok) throw new Error(`TMDB ${res.status} for ${path}`);
  return res.json();
}

async function addSeries(tmdbId) {
  const details = await tmdb(`/tv/${tmdbId}`);
  const title = details.name || details.original_name;
  const existing = await prisma.series.findFirst({ where: { tmdbId } });
  if (existing) {
    console.log(`= déjà présent: ${title}`);
    return;
  }

  const series = await prisma.series.create({
    data: {
      title,
      description: details.overview || "",
      category: (details.genres?.[0]?.name) || "Autre",
      posterUrl: details.poster_path ? `https://image.tmdb.org/t/p/w780${details.poster_path}` : "",
      tmdbId,
      year: details.first_air_date ? parseInt(details.first_air_date.slice(0, 4), 10) : 2024,
    },
  });

  let epCount = 0;
  for (const s of details.seasons || []) {
    const seasonNumber = s.season_number;
    if (seasonNumber === 0) continue; // skip specials
    const seasonData = await tmdb(`/tv/${tmdbId}/season/${seasonNumber}`);
    const episodes = (seasonData.episodes || []).map((ep) => ({
      seriesId: series.id,
      season: seasonNumber,
      number: ep.episode_number,
      title: ep.name || `Épisode ${ep.episode_number}`,
      videoUrl: "",
      duration: ep.runtime ? `${ep.runtime} min` : "",
    }));
    if (episodes.length) {
      await prisma.episode.createMany({ data: episodes });
      epCount += episodes.length;
    }
  }
  console.log(`+ ajouté: ${title} (${epCount} épisodes)`);
}

async function main() {
  for (const id of SERIES_IDS) {
    try {
      await addSeries(id);
    } catch (e) {
      console.error(`! erreur pour ${id}:`, e.message);
    }
  }
  await prisma.$disconnect();
}

main();
