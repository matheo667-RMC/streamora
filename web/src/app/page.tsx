import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { HeroBanner } from "@/components/HeroBanner";
import { Footer } from "@/components/Footer";
import { HomeCategoryFilter } from "@/components/HomeCategoryFilter";
import { ContinueWatching } from "@/components/ContinueWatching";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  type FilmWithCount = Awaited<ReturnType<typeof prisma.film.findMany>>[number] & { _count: { downloads: number } };
  type SeriesWithCount = Awaited<ReturnType<typeof prisma.series.findMany>>[number] & { _count: { episodes: number } };
  let latestFilms: FilmWithCount[] = [];
  let latestSeries: SeriesWithCount[] = [];
  let filmCategories: string[] = [];
  let seriesCategories: string[] = [];

  try {
    const [f, s, fc, sc] = await Promise.all([
      prisma.film.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { downloads: true } } },
      }),
      prisma.series.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { episodes: true } } },
      }),
      prisma.film.findMany({ select: { category: true }, distinct: ["category"] }),
      prisma.series.findMany({ select: { category: true }, distinct: ["category"] }),
    ]);
    latestFilms = f as FilmWithCount[];
    latestSeries = s as SeriesWithCount[];
    filmCategories = fc.map(c => c.category).filter(Boolean);
    seriesCategories = sc.map(c => c.category).filter(Boolean);
  } catch {
    // Database not available yet
  }

  const heroItems = [
    ...latestFilms
      .filter((f) => f.posterUrl)
      .slice(0, 5)
      .map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        category: f.category,
        posterUrl: f.posterUrl,
        year: f.year,
        duration: f.duration,
        type: "film" as const,
      })),
    ...latestSeries
      .filter((s) => s.posterUrl)
      .slice(0, 3)
      .map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        category: s.category,
        posterUrl: s.posterUrl,
        year: s.year,
        type: "series" as const,
      })),
  ];

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#0a0a0a]">
        <HeroBanner items={heroItems} />

        <div className="mx-auto max-w-[1400px] space-y-8 px-4 sm:px-6 pb-16 -mt-16 relative z-10">
          {/* Continue Watching */}
          <ContinueWatching />

          {/* Derniers Films */}
          {latestFilms.length > 0 && (
            <section className="rounded-xl border border-white/5 bg-[#141414]/80 p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <Link href="/films" className="shrink-0 flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 transition-colors">
                  Derniers Films
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
                <HomeCategoryFilter categories={filmCategories} section="films" />
                <Link href="/films" className="ml-auto shrink-0 flex items-center gap-1 rounded-md bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 transition-colors">
                  Voir La Suite...
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>

              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide" id="films-row">
                {latestFilms.map((film) => (
                  <Link key={film.id} href={`/films/${film.id}`} className="flex-none w-[130px] sm:w-[150px] md:w-[170px] group" data-category={film.category}>
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 ring-1 ring-white/10 transition-all duration-300 group-hover:ring-red-500/50 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-red-900/30">
                      {film.posterUrl ? (
                        <Image src={film.posterUrl} alt={film.title} fill className="object-cover" sizes="170px" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-red-900/30 to-red-900/30 text-gray-600">
                          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                          </svg>
                        </div>
                      )}
                      {/* HD badge */}
                      <div className="absolute top-1.5 left-1.5">
                        <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold leading-none">HD</span>
                      </div>
                      {/* Category badge */}
                      <div className="absolute top-1.5 right-1.5">
                        <span className="rounded bg-red-600/90 px-1.5 py-0.5 text-[9px] font-bold leading-none">{film.category || "Film"}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs sm:text-sm text-center text-gray-300 line-clamp-2 group-hover:text-white transition-colors">{film.title}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Dernières Séries */}
          {latestSeries.length > 0 && (
            <section className="rounded-xl border border-white/5 bg-[#141414]/80 p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <Link href="/series" className="shrink-0 flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-500 transition-colors">
                  Dernières Séries
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
                <HomeCategoryFilter categories={seriesCategories} section="series" />
                <Link href="/series" className="ml-auto shrink-0 flex items-center gap-1 rounded-md bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 transition-colors">
                  Voir La Suite...
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Link>
              </div>

              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide" id="series-row">
                {latestSeries.map((s) => (
                  <Link key={s.id} href={`/series/${s.id}`} className="flex-none w-[130px] sm:w-[150px] md:w-[170px] group" data-category={s.category}>
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 ring-1 ring-white/10 transition-all duration-300 group-hover:ring-red-500/50 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-red-900/30">
                      {s.posterUrl ? (
                        <Image src={s.posterUrl} alt={s.title} fill className="object-cover" sizes="170px" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-red-900/30 to-red-900/30 text-gray-600">
                          <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                          </svg>
                        </div>
                      )}
                      {/* Episode count badge */}
                      <div className="absolute top-1.5 left-1.5 flex flex-col items-center">
                        <span className="rounded-t bg-red-600 px-1.5 py-0.5 text-[8px] font-bold leading-none uppercase">Eps</span>
                        <span className="rounded-b bg-red-800 px-1.5 py-0.5 text-[11px] font-bold leading-none">{s._count.episodes}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs sm:text-sm text-center text-gray-300 line-clamp-2 group-hover:text-white transition-colors">{s.title}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {latestFilms.length === 0 && latestSeries.length === 0 && (
            <div className="rounded-2xl border border-white/5 bg-[#141414]/80 p-10 sm:p-16 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
              <p className="text-gray-400">Aucun contenu disponible pour le moment.</p>
              <p className="mt-2 text-sm text-gray-600">Les films et séries seront ajoutés bientôt.</p>
            </div>
          )}
        </div>

        <Footer />
      </div>
    </>
  );
}
