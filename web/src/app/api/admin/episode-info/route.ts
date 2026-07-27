import { NextResponse } from "next/server";

const TMDB_API_KEY = "4e2f8bed54601f3f2b98de4dc0dc7aa9";

interface TmdbSearchResult {
  id: number;
}
interface TmdbEpisode {
  episode_number: number;
  name?: string;
  runtime?: number;
}

function formatRuntime(minutes: number): string {
  if (!minutes || minutes <= 0) return "";
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
  return `${minutes}min`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const season = Number(searchParams.get("season") || "1");
  const number = Number(searchParams.get("number") || "1");

  if (!query) {
    return NextResponse.json({ title: "", duration: "" });
  }

  try {
    const searchRes = await fetch(
      `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(query)}&language=fr-FR&page=1&api_key=${TMDB_API_KEY}`,
      { next: { revalidate: 3600 } }
    );
    if (!searchRes.ok) return NextResponse.json({ title: "", duration: "" });
    const searchData = (await searchRes.json()) as { results?: TmdbSearchResult[] };
    const first = searchData.results?.[0];
    if (!first) return NextResponse.json({ title: "", duration: "" });

    const seasonRes = await fetch(
      `https://api.themoviedb.org/3/tv/${first.id}/season/${season}?language=fr-FR&api_key=${TMDB_API_KEY}`,
      { next: { revalidate: 3600 } }
    );
    if (!seasonRes.ok) return NextResponse.json({ title: "", duration: "" });
    const seasonData = (await seasonRes.json()) as { episodes?: TmdbEpisode[] };
    const episode = seasonData.episodes?.find((e) => e.episode_number === number);
    if (!episode) return NextResponse.json({ title: "", duration: "" });

    return NextResponse.json({
      title: episode.name || "",
      duration: formatRuntime(episode.runtime || 0),
    });
  } catch {
    return NextResponse.json({ title: "", duration: "" });
  }
}
