import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DownloadButton } from "@/components/DownloadButton";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

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
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-black">
      {/* Hero backdrop - full width */}
      <div className="relative h-[55vh] sm:h-[60vh]">
        {film.posterUrl && (
          <Image
            src={film.posterUrl}
            alt=""
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0">
          <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-8">
            <div className="flex flex-col md:flex-row items-end gap-6">
              {/* Poster */}
              <div className="hidden md:block flex-shrink-0">
                <div className="relative w-44 lg:w-52 aspect-[2/3] rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10">
                  {film.posterUrl ? (
                    <Image
                      src={film.posterUrl}
                      alt={film.title}
                      fill
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gray-800">
                      <svg className="h-16 w-16 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="rounded bg-purple-600/90 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">Film</span>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-medium text-gray-300">HD</span>
                </div>
                <h1 className="text-3xl font-bold md:text-4xl lg:text-5xl leading-tight">{film.title}</h1>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-400">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-gray-200">{film.category}</span>
                  <span>{film.year}</span>
                  {film.duration && (
                    <>
                      <span className="text-gray-600">·</span>
                      <span>{film.duration}</span>
                    </>
                  )}
                  <span className="text-gray-600">·</span>
                  <span>{film._count.downloads} vue{film._count.downloads > 1 ? "s" : ""}</span>
                </div>

                {film.description && (
                  <p className="mt-4 text-sm sm:text-base text-gray-300 leading-relaxed max-w-2xl line-clamp-3">
                    {film.description}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  {film.videoUrl && (
                    <>
                      <DownloadButton filmId={film.id} />
                    </>
                  )}
                  <Link href="/films" className="btn-secondary text-sm px-5 py-2.5">
                    <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Retour
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Player */}
      {film.videoUrl && (
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 mt-6">
          <div className="rounded-xl overflow-hidden border border-white/5">
            <VideoPlayer videoUrl={film.videoUrl} title={film.title} poster={film.posterUrl || undefined} />
          </div>
        </div>
      )}

      {/* Related films - horizontal scroll like Netflix */}
      {relatedFilms.length > 0 && (
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 mt-12 pb-16">
          <h2 className="mb-4 text-lg sm:text-xl font-bold">Films similaires</h2>
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {relatedFilms.map((rf) => (
              <Link key={rf.id} href={`/films/${rf.id}`} className="flex-none w-[140px] sm:w-[160px] md:w-[180px] group">
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 ring-1 ring-white/5 transition-all duration-300 group-hover:ring-purple-500/40 group-hover:shadow-xl group-hover:shadow-purple-900/20 group-hover:scale-105">
                  {rf.posterUrl ? (
                    <Image src={rf.posterUrl} alt={rf.title} fill className="object-cover" sizes="180px" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-purple-900/30 to-pink-900/30 text-gray-600">
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <span className="flex items-center justify-center h-7 w-7 rounded-full bg-white text-black">
                      <svg className="h-3.5 w-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </span>
                  </div>
                </div>
                <div className="mt-2 px-0.5">
                  <h3 className="text-xs sm:text-sm font-medium line-clamp-1 text-gray-200 group-hover:text-white transition-colors">{rf.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <Footer />
    </div>
    </>
  );
}
