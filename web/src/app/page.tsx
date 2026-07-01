import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { HeroBanner } from "@/components/HeroBanner";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  type FilmWithCount = Awaited<ReturnType<typeof prisma.film.findMany>>[number] & { _count: { downloads: number } };
  type SeriesWithCount = Awaited<ReturnType<typeof prisma.series.findMany>>[number] & { _count: { episodes: number } };
  let latestFilms: FilmWithCount[] = [];
  let latestSeries: SeriesWithCount[] = [];

  try {
    const [f2, s1] = await Promise.all([
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
    ]);
    latestFilms = f2 as FilmWithCount[];
    latestSeries = s1 as SeriesWithCount[];
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
      <div className="min-h-screen bg-black">
        <HeroBanner items={heroItems} />

        <div className="mx-auto max-w-[1400px] space-y-10 px-4 sm:px-6 pb-16 -mt-16 relative z-10">
          {/* Latest Films */}
          {latestFilms.length > 0 && (
            <ContentRow title="Nouveautés" href="/films">
              {latestFilms.map((film) => (
                <Link key={film.id} href={`/films/${film.id}`} className="flex-none w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px] group">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 ring-1 ring-white/5 transition-all duration-300 group-hover:ring-purple-500/40 group-hover:shadow-xl group-hover:shadow-purple-900/20 group-hover:scale-105">
                    {film.posterUrl ? (
                      <Image src={film.posterUrl} alt={film.title} fill className="object-cover" sizes="(max-width: 640px) 140px, (max-width: 1024px) 180px, 200px" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-purple-900/30 to-pink-900/30 text-gray-600">
                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                        </svg>
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center h-8 w-8 rounded-full bg-white text-black">
                          <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </span>
                        <span className="text-xs font-medium text-white">{film.year}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 px-0.5">
                    <h3 className="text-xs sm:text-sm font-medium line-clamp-1 text-gray-200 group-hover:text-white transition-colors">{film.title}</h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{film.category}</p>
                  </div>
                </Link>
              ))}
            </ContentRow>
          )}

          {/* Series */}
          {latestSeries.length > 0 && (
            <ContentRow title="Séries" href="/series">
              {latestSeries.map((s) => (
                <Link key={s.id} href={`/series/${s.id}`} className="flex-none w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px] group">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 ring-1 ring-white/5 transition-all duration-300 group-hover:ring-purple-500/40 group-hover:shadow-xl group-hover:shadow-purple-900/20 group-hover:scale-105">
                    {s.posterUrl ? (
                      <Image src={s.posterUrl} alt={s.title} fill className="object-cover" sizes="(max-width: 640px) 140px, (max-width: 1024px) 180px, 200px" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-purple-900/30 to-pink-900/30 text-gray-600">
                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center h-8 w-8 rounded-full bg-white text-black">
                          <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </span>
                        <span className="text-xs font-medium text-white">{s._count.episodes} ép.</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 px-0.5">
                    <h3 className="text-xs sm:text-sm font-medium line-clamp-1 text-gray-200 group-hover:text-white transition-colors">{s.title}</h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{s._count.episodes} épisode{s._count.episodes > 1 ? "s" : ""}</p>
                  </div>
                </Link>
              ))}
            </ContentRow>
          )}

          {/* Empty state */}
          {latestFilms.length === 0 && latestSeries.length === 0 && (
            <div className="rounded-2xl border border-white/5 bg-gray-900/30 p-10 sm:p-16 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-purple-500/10 flex items-center justify-center">
                <svg className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

function ContentRow({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold md:text-2xl">{title}</h2>
        <Link href={href} className="text-xs sm:text-sm text-purple-400 hover:text-purple-300 transition-colors whitespace-nowrap flex items-center gap-1">
          Voir tout
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </Link>
      </div>
      <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {children}
      </div>
    </section>
  );
}
