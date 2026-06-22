import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { HeroBanner } from "@/components/HeroBanner";

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

  // Build hero items from all films and series that have posters
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
        {/* Hero Section - rotates between films/series */}
        <HeroBanner items={heroItems} />

        <div className="mx-auto max-w-7xl space-y-8 sm:space-y-10 px-4 pb-16 -mt-16 relative z-10">
          {/* Latest Films */}
          {latestFilms.length > 0 && (
            <ContentRow title="Nouveautés" href="/films">
              {latestFilms.map((film) => (
                <FilmCard key={film.id} film={film} />
              ))}
            </ContentRow>
          )}



          {/* Series */}
          {latestSeries.length > 0 && (
            <ContentRow title="Séries" href="/series">
              {latestSeries.map((s) => (
                <Link key={s.id} href={`/series/${s.id}`} className="flex-none w-32 sm:w-36 md:w-44 card group">
                  <div className="relative aspect-[2/3] bg-gray-900">
                    {s.posterUrl ? (
                      <Image src={s.posterUrl} alt={s.title} fill className="object-cover" sizes="(max-width: 640px) 33vw, 12vw" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50 text-gray-600">
                        <svg className="h-8 w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-2 sm:p-3">
                    <h3 className="text-xs sm:text-sm font-semibold line-clamp-1">{s.title}</h3>
                    <p className="mt-0.5 text-[10px] sm:text-xs text-gray-500">{s._count.episodes} épisode{s._count.episodes > 1 ? "s" : ""}</p>
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
      </div>
    </>
  );
}

function ContentRow({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 sm:mb-4 flex items-center justify-between">
        <h2 className="text-lg sm:text-xl font-bold md:text-2xl">{title}</h2>
        <Link href={href} className="text-xs sm:text-sm text-purple-400 hover:text-purple-300 transition-colors whitespace-nowrap">
          Voir tout →
        </Link>
      </div>
      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {children}
      </div>
    </section>
  );
}

function FilmCard({ film }: { film: { id: string; title: string; posterUrl: string; year: number; category: string; _count: { downloads: number } } }) {
  return (
    <Link href={`/films/${film.id}`} className="flex-none w-32 sm:w-36 md:w-44 card group">
      <div className="relative aspect-[2/3] bg-gray-900">
        {film.posterUrl ? (
          <Image src={film.posterUrl} alt={film.title} fill className="object-cover" sizes="(max-width: 640px) 33vw, 12vw" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-purple-900/50 to-pink-900/50 text-gray-600">
            <svg className="h-8 w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="p-2 sm:p-3">
        <h3 className="text-xs sm:text-sm font-semibold line-clamp-1">{film.title}</h3>
        <div className="mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-500">
          <span>{film.year}</span>
          <span>·</span>
          <span className="truncate">{film.category}</span>
        </div>
      </div>
    </Link>
  );
}
