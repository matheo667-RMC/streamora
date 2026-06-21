import { NextResponse } from "next/server";

const TMDB_API_KEY = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0YjYyNTI0NTMxMjc0MDE5NjY2YzVhMWU0ZGIzYjlhNCIsIm5iZiI6MTczMjAwMDAwMC4wLCJzdWIiOiI2NzQ4MDAwMDAwMDAwMDAwMDAiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.placeholder";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const type = searchParams.get("type") || "movie";

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const endpoint = type === "series" ? "tv" : "movie";
    const res = await fetch(
      `https://api.themoviedb.org/3/search/${endpoint}?query=${encodeURIComponent(query)}&language=fr-FR&page=1&api_key=4b62524531274019666c5a1e4db3b9a4`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }

    const data = await res.json();

    const results = (data.results || [])
      .filter((item: Record<string, unknown>) => item.poster_path)
      .slice(0, 8)
      .map((item: Record<string, unknown>) => ({
        id: item.id,
        title: (item.title || item.name || "") as string,
        year: ((item.release_date || item.first_air_date || "") as string).slice(0, 4),
        posterUrl: `https://image.tmdb.org/t/p/w780${item.poster_path}`,
        posterUrlHD: `https://image.tmdb.org/t/p/original${item.poster_path}`,
        overview: ((item.overview || "") as string).slice(0, 200),
      }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
