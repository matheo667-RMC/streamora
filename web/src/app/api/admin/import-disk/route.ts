import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findPoster } from "@/lib/poster";
import { allowedFromAdminOrServer } from "@/lib/sync-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TMDB_KEY = "4e2f8bed54601f3f2b98de4dc0dc7aa9";

type DiskFile = { name: string; url: string };
type Meta = { tmdbId: number; title: string; year: number; description: string; category: string; posterUrl: string };

const NOISE =
  /\b(1080p|2160p|720p|480p|4k|uhd|hdr|x264|x265|h264|h265|hevc|xvid|divx|aac|ac3|dts|dd5\.?1|web-?dl|web-?rip|webrip|bluray|brrip|bdrip|dvdrip|hdrip|hdlight|remux|multi|truefrench|vff|vf2?|vostfr|vo|french|fr|eng|subfrench|amzn|nf|dsnp|hulu|integrale|complete)\b/gi;

/** Les fichiers ressemblent a "Le.Film.2019.1080p.WEB-DL.x264.mkv" : on retire
 *  le bruit technique pour retrouver un titre cherchable sur TMDB. */
function cleanTitle(raw: string): string {
  return raw
    .replace(/\.[^.]+$/, "")
    .replace(/[._]+/g, " ")
    .replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
    .replace(NOISE, " ")
    .replace(/[-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseEpisode(fileName: string): { title: string; season: number; number: number } | null {
  // "Serie.S01E02", "Serie - 1x02" : les deux ecritures sont courantes.
  const m =
    fileName.match(/^(.*?)[\s._-]*[Ss](\d{1,2})[\s._-]*[EeXx](\d{1,3})/) ||
    fileName.match(/^(.*?)[\s._-]+(\d{1,2})[xX](\d{2,3})\b/);
  if (!m) return null;
  const title = cleanTitle(m[1] + ".x");
  if (!title) return null;
  return { title, season: Number(m[2]), number: Number(m[3]) };
}

function parseYear(fileName: string): number {
  const m = fileName.match(/\b(19\d{2}|20\d{2})\b/);
  return m ? Number(m[1]) : 0;
}

async function tmdb(title: string, kind: "movie" | "tv", year: number): Promise<Meta | null> {
  const yearParam = year ? `&${kind === "tv" ? "first_air_date_year" : "year"}=${year}` : "";
  const url =
    `https://api.themoviedb.org/3/search/${kind}?query=${encodeURIComponent(title)}` +
    `&language=fr-FR&page=1&api_key=${TMDB_KEY}${yearParam}`;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const hit = (await res.json()).results?.[0];
    if (!hit) return null;
    return {
      tmdbId: Number(hit.id) || 0,
      title: hit.title || hit.name || title,
      year: Number((hit.release_date || hit.first_air_date || "").slice(0, 4)) || year || 2024,
      description: hit.overview || "",
      category: GENRES[hit.genre_ids?.[0] as number] || "Autre",
      posterUrl: hit.poster_path ? `https://image.tmdb.org/t/p/w780${hit.poster_path}` : "",
    };
  } catch {
    return null;
  }
}

const GENRES: Record<number, string> = {
  28: "Action", 12: "Aventure", 16: "Animation", 35: "Comédie", 80: "Crime",
  99: "Documentaire", 18: "Drame", 10751: "Famille", 14: "Fantastique", 36: "Histoire",
  27: "Horreur", 10402: "Musique", 9648: "Mystère", 10749: "Romance", 878: "Science-Fiction",
  53: "Thriller", 10752: "Guerre", 37: "Western", 10759: "Action", 10765: "Science-Fiction",
};

/** Noms des episodes d'une saison, pour ne pas afficher "Episode 3" partout. */
async function seasonTitles(tmdbId: number, season: number): Promise<Record<number, string>> {
  if (!tmdbId) return {};
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}?language=fr-FR&api_key=${TMDB_KEY}`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return {};
    const out: Record<number, string> = {};
    for (const e of (await res.json()).episodes || []) out[Number(e.episode_number)] = e.name || "";
    return out;
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  if (!(await allowedFromAdminOrServer(req))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = (await req.json()) as { files?: DiskFile[] };
  const files = (body.files || []).filter((f) => f && f.url && /\.(mp4|mkv|webm|m4v|mov|avi|ts)$/i.test(f.name));

  const [knownFilms, knownEpisodes] = await Promise.all([
    prisma.film.findMany({ select: { videoUrl: true } }),
    prisma.episode.findMany({ select: { videoUrl: true } }),
  ]);
  const known = new Set([...knownFilms, ...knownEpisodes].map((r) => r.videoUrl).filter(Boolean));

  let films = 0;
  let episodes = 0;
  const seriesCache = new Map<string, { id: string; tmdbId: number }>();
  const titleCache = new Map<string, Record<number, string>>();

  for (const file of files) {
    if (known.has(file.url)) continue;

    const ep = parseEpisode(file.name);
    if (ep) {
      const key = ep.title.toLowerCase();
      let series = seriesCache.get(key);
      if (!series) {
        const existing = await prisma.series.findFirst({ where: { title: { equals: ep.title, mode: "insensitive" } } });
        if (existing) {
          series = { id: existing.id, tmdbId: existing.tmdbId || 0 };
        } else {
          const meta = await tmdb(ep.title, "tv", 0);
          const poster = meta?.posterUrl || (await findPoster(meta?.title || ep.title, "tv", meta?.tmdbId));
          const created = await prisma.series.create({
            data: {
              title: meta?.title || ep.title,
              description: meta?.description || "",
              category: meta?.category || "Autre",
              posterUrl: poster,
              year: meta?.year || 2024,
              tmdbId: meta?.tmdbId || null,
            },
          });
          series = { id: created.id, tmdbId: meta?.tmdbId || 0 };
        }
        seriesCache.set(key, series);
      }

      const dup = await prisma.episode.findFirst({
        where: { seriesId: series.id, season: ep.season, number: ep.number },
      });
      if (dup) {
        if (!dup.videoUrl) await prisma.episode.update({ where: { id: dup.id }, data: { videoUrl: file.url } });
        continue;
      }

      const cacheKey = `${series.tmdbId}-${ep.season}`;
      if (!titleCache.has(cacheKey)) titleCache.set(cacheKey, await seasonTitles(series.tmdbId, ep.season));
      const name = titleCache.get(cacheKey)?.[ep.number];

      await prisma.episode.create({
        data: {
          seriesId: series.id,
          season: ep.season,
          number: ep.number,
          title: name || `Épisode ${ep.number}`,
          videoUrl: file.url,
        },
      });
      episodes++;
      continue;
    }

    const year = parseYear(file.name);
    // L'annee aide la recherche mais ne doit pas rester collee au titre.
    const title = cleanTitle(file.name).replace(/\b(19\d{2}|20\d{2})\b/g, "").replace(/\s+/g, " ").trim();
    if (!title) continue;
    const meta = await tmdb(title, "movie", year);
    const poster = meta?.posterUrl || (await findPoster(meta?.title || title, "movie", meta?.tmdbId));
    await prisma.film.create({
      data: {
        title: meta?.title || title,
        description: meta?.description || "",
        category: meta?.category || "Autre",
        posterUrl: poster,
        videoUrl: file.url,
        year: meta?.year || year || 2024,
        tmdbId: meta?.tmdbId || null,
      },
    });
    films++;
  }

  return NextResponse.json({ films, episodes, scanned: files.length });
}
