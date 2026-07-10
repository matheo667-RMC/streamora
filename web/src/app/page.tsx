import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { HeroBanner } from "@/components/HeroBanner";
import { Footer } from "@/components/Footer";
import { MediaRow, RowItem } from "@/components/MediaRow";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  type FilmRow = { id: string; title: string; description: string; category: string | null; posterUrl: string | null; year: number | null; duration: string | null };
  type SeriesRow = { id: string; title: string; description: string; category: string | null; posterUrl: string | null; year: number | null; episodes: number };

  let films: FilmRow[] = [];
  let series: SeriesRow[] = [];

  try {
    const [f, s] = await Promise.all([
      prisma.film.findMany({ where: { posterUrl: { not: "" } }, take: 400, orderBy: { createdAt: "desc" } }),
      prisma.series.findMany({ where: { posterUrl: { not: "" } }, take: 200, orderBy: { createdAt: "desc" }, include: { _count: { select: { episodes: true } } } }),
    ]);
    films = f.map((x) => ({ id: x.id, title: x.title, description: x.description, category: x.category, posterUrl: x.posterUrl, year: x.year, duration: x.duration }));
    series = (s as (typeof s[number] & { _count: { episodes: number } })[]).map((x) => ({ id: x.id, title: x.title, description: x.description, category: x.category, posterUrl: x.posterUrl, year: x.year, episodes: x._count.episodes }));
  } catch {
    // Database not available yet
  }

  const heroItems = [
    ...films.slice(0, 5).map((f) => ({ id: f.id, title: f.title, description: f.description, category: f.category || "", posterUrl: f.posterUrl || "", year: f.year ?? 0, duration: f.duration || undefined, type: "film" as const })),
    ...series.slice(0, 3).map((s) => ({ id: s.id, title: s.title, description: s.description, category: s.category || "", posterUrl: s.posterUrl || "", year: s.year ?? 0, type: "series" as const })),
  ];

  const filmItem = (f: FilmRow): RowItem => ({ id: f.id, title: f.title, posterUrl: f.posterUrl, category: f.category, kind: "films", badge: f.category || "Film" });
  const seriesItem = (s: SeriesRow): RowItem => ({ id: s.id, title: s.title, posterUrl: s.posterUrl, category: s.category, kind: "series", badge: `${s.episodes} ép` });

  // Group films by category, keep the biggest ones -> Netflix-style genre rows.
  const byCat = new Map<string, FilmRow[]>();
  for (const f of films) {
    const c = f.category || "Autres";
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c)!.push(f);
  }
  const genreRows = Array.from(byCat.entries())
    .filter(([, arr]) => arr.length >= 4)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 8)
    .map(([cat, arr]) => ({ cat, items: arr.slice(0, 18).map(filmItem) }));

  const hasContent = films.length > 0 || series.length > 0;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#0f0f1a]">
        <HeroBanner items={heroItems} />

        <div className="mx-auto max-w-[1500px] space-y-7 px-4 sm:px-6 pb-16 -mt-20 relative z-10">

          {films.length > 0 && (
            <MediaRow title="Tendances · Films" href="/films" items={films.slice(0, 18).map(filmItem)} />
          )}
          {series.length > 0 && (
            <MediaRow title="Séries populaires" href="/series" items={series.slice(0, 18).map(seriesItem)} />
          )}

          {genreRows.map((g) => (
            <MediaRow key={g.cat} title={g.cat} href={`/films?category=${encodeURIComponent(g.cat)}`} items={g.items} />
          ))}

          {series.length > 6 && (
            <MediaRow title="À découvrir · Séries" href="/series" items={series.slice(6, 24).map(seriesItem)} />
          )}

          {!hasContent && (
            <div className="rounded-2xl border border-white/5 bg-[#16213e]/80 p-10 sm:p-16 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-purple-500/10 flex items-center justify-center">
                <svg className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
              <p className="text-gray-400">Aucun contenu disponible pour le moment.</p>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </>
  );
}
