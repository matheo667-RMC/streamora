import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SectionHeader, PosterCard, PosterItem } from "@/components/Papy";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  type FilmRow = { id: string; title: string; category: string | null; posterUrl: string | null };
  type SeriesRow = { id: string; title: string; posterUrl: string | null; episodes: number };

  let films: FilmRow[] = [];
  let series: SeriesRow[] = [];

  try {
    const [f, s] = await Promise.all([
      prisma.film.findMany({ where: { posterUrl: { not: "" } }, take: 18, orderBy: { createdAt: "desc" } }),
      prisma.series.findMany({ where: { posterUrl: { not: "" } }, take: 18, orderBy: { createdAt: "desc" }, include: { _count: { select: { episodes: true } } } }),
    ]);
    films = f.map((x) => ({ id: x.id, title: x.title, category: x.category, posterUrl: x.posterUrl }));
    series = (s as (typeof s[number] & { _count: { episodes: number } })[]).map((x) => ({ id: x.id, title: x.title, posterUrl: x.posterUrl, episodes: x._count.episodes }));
  } catch {
    // Database not available yet
  }

  const filmItem = (f: FilmRow): PosterItem => ({ id: f.id, title: f.title, posterUrl: f.posterUrl, kind: "films", topLeft: "HD", topRight: f.category || undefined });
  const seriesItem = (s: SeriesRow): PosterItem => ({ id: s.id, title: s.title, posterUrl: s.posterUrl, kind: "series", topLeft: `${s.episodes} EPS` });

  const hasContent = films.length > 0 || series.length > 0;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#0f0f23]">
        <div className="mx-auto max-w-[1300px] px-4 sm:px-6 pt-24 pb-16 space-y-12">

          {/* Derniers Films */}
          <section>
            <SectionHeader title="Derniers Films" href="/films" />
            {films.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
                {films.map((f) => <PosterCard key={f.id} item={filmItem(f)} />)}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Aucun film pour le moment.</p>
            )}
          </section>

          {/* Dernières Séries */}
          <section>
            <SectionHeader title="Dernières Séries" href="/series" />
            {series.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
                {series.map((s) => <PosterCard key={s.id} item={seriesItem(s)} />)}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Aucune série pour le moment.</p>
            )}
          </section>

          {!hasContent && (
            <div className="rounded-2xl border border-white/5 bg-[#151515] p-10 sm:p-16 text-center">
              <p className="text-gray-400">Aucun contenu disponible pour le moment.</p>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </>
  );
}
