import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SectionHeader, PosterCard, PosterItem } from "@/components/Papy";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  type FilmRow = { id: string; title: string; category: string | null; posterUrl: string | null; description?: string | null };
  type SeriesRow = { id: string; title: string; posterUrl: string | null; episodes: number };

  let films: FilmRow[] = [];
  let series: SeriesRow[] = [];
  let trending: FilmRow[] = [];
  let featured: FilmRow | null = null;

  try {
    const [f, s, t] = await Promise.all([
      prisma.film.findMany({ where: { posterUrl: { not: "" } }, take: 18, orderBy: { createdAt: "desc" } }),
      prisma.series.findMany({ where: { posterUrl: { not: "" } }, take: 18, orderBy: { createdAt: "desc" }, include: { _count: { select: { episodes: true } } } }),
      prisma.film.findMany({ where: { posterUrl: { not: "" } }, take: 18, orderBy: { downloads: { _count: "desc" } } }),
    ]);
    films = f.map((x) => ({ id: x.id, title: x.title, category: x.category, posterUrl: x.posterUrl, description: x.description }));
    series = (s as (typeof s[number] & { _count: { episodes: number } })[]).map((x) => ({ id: x.id, title: x.title, posterUrl: x.posterUrl, episodes: x._count.episodes }));
    trending = t.map((x) => ({ id: x.id, title: x.title, category: x.category, posterUrl: x.posterUrl }));
    featured = films[0] || trending[0] || null;
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

        {/* Hero banner */}
        {featured && featured.posterUrl && (
          <section className="relative h-[62vh] min-h-[380px] w-full overflow-hidden">
            <Image src={featured.posterUrl} alt={featured.title} fill priority className="object-cover object-top scale-110 blur-[2px] opacity-40" sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f23] via-[#0f0f23]/70 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f23]/90 to-transparent" />
            <div className="relative z-10 mx-auto max-w-[1300px] h-full px-4 sm:px-6 flex items-end pb-12">
              <div className="flex gap-5 items-end">
                <div className="relative hidden sm:block w-40 aspect-[2/3] rounded-xl overflow-hidden ring-1 ring-white/20 shadow-2xl shrink-0">
                  <Image src={featured.posterUrl} alt={featured.title} fill className="object-cover" sizes="160px" />
                </div>
                <div className="max-w-xl">
                  <span className="inline-block rounded bg-gradient-to-r from-purple-600 to-pink-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">À la une</span>
                  <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold drop-shadow-lg">{featured.title}</h1>
                  {featured.description && <p className="mt-3 text-sm text-gray-300 line-clamp-3">{featured.description}</p>}
                  <Link href={`/films/${featured.id}`} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-2.5 text-sm font-bold hover:opacity-90">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    Regarder
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className={`mx-auto max-w-[1300px] px-4 sm:px-6 ${featured ? "pt-10" : "pt-24"} pb-16 space-y-12`}>

          {/* Tendances de la semaine */}
          {trending.length > 0 && (
            <section>
              <SectionHeader title="Tendances de la semaine" href="/films" />
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
                {trending.map((f) => <PosterCard key={f.id} item={filmItem(f)} />)}
              </div>
            </section>
          )}

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
