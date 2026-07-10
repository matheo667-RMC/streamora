import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DownloadButton } from "@/components/DownloadButton";
import { VideoPlayer } from "@/components/VideoPlayer";
import { MultiServerPlayer } from "@/components/MultiServerPlayer";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { TrackWatch } from "@/components/TrackWatch";

interface Props {
  params: { id: string };
}

export const dynamic = "force-dynamic";

export default async function FilmDetailPage({ params }: Props) {
  const film = await prisma.film.findUnique({
    where: { id: params.id },
    include: { _count: { select: { downloads: true } } },
  });

  if (!film) notFound();

  const relatedFilms = await prisma.film.findMany({
    where: { category: film.category, id: { not: film.id } },
    take: 12,
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-[#0d0d0d]">
      <div className="pt-16 sm:pt-20">
        {/* Track watch history */}
        {(film.tmdbId || film.videoUrl) && (
          <TrackWatch
            id={film.id}
            type="film"
            title={film.title}
            posterUrl={film.posterUrl || undefined}
            filmId={film.id}
            videoUrl={film.videoUrl || `tmdb:${film.tmdbId}`}
          />
        )}

        {/* Video Player */}
        {(film.tmdbId || film.videoUrl) && (
          <div className="mx-auto max-w-[1000px] px-4 sm:px-6">
            <div className="rounded-xl overflow-hidden border border-white/5 shadow-2xl shadow-black/50">
              {film.tmdbId ? (
                <MultiServerPlayer tmdbId={film.tmdbId} type="movie" title={film.title} />
              ) : (
                <VideoPlayer videoUrl={film.videoUrl} title={film.title} poster={film.posterUrl || undefined} />
              )}
            </div>
          </div>
        )}

        {/* Film info - papystreaming style: poster left + details right */}
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 mt-6">
          <div className="rounded-xl border border-white/5 bg-[#151515]/80 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-5">
              {/* Poster */}
              <div className="shrink-0 self-start">
                <div className="relative w-32 sm:w-40 aspect-[2/3] rounded-lg overflow-hidden ring-1 ring-white/10 shadow-lg">
                  {film.posterUrl ? (
                    <Image src={film.posterUrl} alt={film.title} fill className="object-cover" priority />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gray-800 text-gray-600">
                      <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-1.5 left-1.5">
                    <span className="rounded bg-purple-600 px-1.5 py-0.5 text-[9px] font-bold">HD</span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold">{film.title}</h1>

                {film.description && (
                  <p className="mt-3 text-sm text-gray-400 leading-relaxed">{film.description}</p>
                )}

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-500 shrink-0 w-24">Genre :</span>
                    <span className="text-purple-400 font-medium">{film.category}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-500 shrink-0 w-24">Qualité :</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="rounded bg-purple-600 px-1.5 py-0.5 text-[10px] font-bold">HD</span>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-500 shrink-0 w-24">Année :</span>
                    <span className="text-gray-300">{film.year}</span>
                  </div>
                  {film.duration && (
                    <div className="flex gap-2">
                      <span className="text-gray-500 shrink-0 w-24">Durée :</span>
                      <span className="text-gray-300">{film.duration}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="text-gray-500 shrink-0 w-24">Vues :</span>
                    <span className="text-gray-300">{film._count.downloads}</span>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {film.videoUrl && <DownloadButton filmId={film.id} />}
                  <Link href="/films" className="btn-secondary text-sm px-4 py-2">
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Retour
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related films grid */}
        {relatedFilms.length > 0 && (
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 mt-8 pb-16">
            <div className="rounded-xl border border-white/5 bg-[#151515]/80 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-5">
                <h2 className="flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-sm font-bold">
                  Films similaires
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </h2>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {relatedFilms.map((rf) => (
                  <Link key={rf.id} href={`/films/${rf.id}`} className="group">
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 ring-1 ring-white/10 transition-all duration-300 group-hover:ring-purple-500/50 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-purple-900/30">
                      {rf.posterUrl ? (
                        <Image src={rf.posterUrl} alt={rf.title} fill className="object-cover" sizes="170px" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-purple-900/30 to-pink-900/30 text-gray-600">
                          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                          </svg>
                        </div>
                      )}
                      <div className="absolute top-1.5 left-1.5">
                        <span className="rounded bg-purple-600 px-1.5 py-0.5 text-[9px] font-bold leading-none">HD</span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs sm:text-sm text-center text-gray-300 line-clamp-2 group-hover:text-white transition-colors">{rf.title}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
    </>
  );
}
