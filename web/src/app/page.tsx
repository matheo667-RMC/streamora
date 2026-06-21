import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  type FilmWithCount = Awaited<ReturnType<typeof prisma.film.findMany>>[number] & { _count: { downloads: number } };
  type SeriesWithCount = Awaited<ReturnType<typeof prisma.series.findMany>>[number] & { _count: { episodes: number } };
  let featuredFilms: FilmWithCount[] = [];
  let latestFilms: FilmWithCount[] = [];
  let popularFilms: FilmWithCount[] = [];
  let latestSeries: SeriesWithCount[] = [];

  try {
    const [f1, f2, f3, s1] = await Promise.all([
      prisma.film.findMany({
        where: { featured: true },
        take: 1,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { downloads: true } } },
      }),
      prisma.film.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { downloads: true } } },
      }),
      prisma.film.findMany({
        take: 20,
        orderBy: { downloads: { _count: "desc" } },
        include: { _count: { select: { downloads: true } } },
      }),
      prisma.series.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { episodes: true } } },
      }),
    ]);
    featuredFilms = f1 as FilmWithCount[];
    latestFilms = f2 as FilmWithCount[];
    popularFilms = f3 as FilmWithCount[];
    latestSeries = s1 as SeriesWithCount[];
  } catch {
    // Database not available yet
  }

  const hero = featuredFilms[0] || latestFilms[0] || null;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-black">
        {/* Hero Section */}
        <section className="relative h-[85vh] sm:h-[80vh] w-full overflow-hidden">
          {hero?.posterUrl ? (
            <Image src={hero.posterUrl} alt={hero.title} fill className="object-cover" priority />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-purple-950 via-black to-pink-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-12 lg:p-16">
            <div className="mx-auto max-w-7xl">
              {hero ? (
                <>
                  <span className="mb-2 inline-block rounded bg-purple-600/80 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider">
                    {hero.category}
                  </span>
                  <h1 className="mb-2 text-3xl font-extrabold sm:text-4xl md:text-5xl lg:text-6xl drop-shadow-2xl leading-tight">
                    {hero.title}
                  </h1>
                  <div className="mb-3 flex items-center gap-3 text-sm text-gray-300">
                    <span>{hero.year}</span>
                    {hero.duration && <><span className="text-gray-600">|</span><span>{hero.duration}</span></>}
                  </div>
                  {hero.description && (
                    <p className="mb-5 max-w-lg text-sm text-gray-300 line-clamp-2 sm:text-base sm:line-clamp-3">
                      {hero.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/films/${hero.id}`} className="btn-primary text-sm sm:text-base px-6 sm:px-8 py-3">
                      ▶ Regarder
                    </Link>
                    <Link href="/films" className="btn-secondary text-sm sm:text-base px-6 sm:px-8 py-3">
                      Explorer
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <Image src="/logo.png" alt="Streamora" width={80} height={80} className="mb-4 rounded-xl" />
                  <h1 className="mb-3 text-3xl font-extrabold sm:text-4xl md:text-6xl">
                    Bienvenue sur <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Streamora</span>
                  </h1>
                  <p className="mb-6 max-w-xl text-base text-gray-400 sm:text-lg">
                    Vos films et séries préférés, disponibles en streaming.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/films" className="btn-primary text-base px-8 py-3">Explorer les films</Link>
                    <Link href="/series" className="btn-secondary text-base px-8 py-3">Voir les séries</Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-8 sm:space-y-10 px-4 pb-16 -mt-16 relative z-10">
          {/* Latest Films */}
          {latestFilms.length > 0 && (
            <ContentRow title="Nouveautés" href="/films">
              {latestFilms.map((film) => (
                <FilmCard key={film.id} film={film} />
              ))}
            </ContentRow>
          )}

          {/* Popular Films */}
          {popularFilms.length > 0 && popularFilms.some(f => f._count.downloads > 0) && (
            <ContentRow title="Les plus populaires" href="/films">
              {popularFilms.map((film) => (
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
