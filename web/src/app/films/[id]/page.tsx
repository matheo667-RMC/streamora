import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { DownloadButton } from "@/components/DownloadButton";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Navbar } from "@/components/Navbar";

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
    take: 6,
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-black">
      {/* Hero section with blurred poster background */}
      <div className="relative">
        <div className="absolute inset-0 h-[500px]">
          {film.posterUrl && (
            <Image
              src={film.posterUrl}
              alt=""
              fill
              className="object-cover opacity-20 blur-xl"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pt-24 pb-8">
          <Link
            href="/films"
            className="mb-6 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
          >
            &larr; Retour aux films
          </Link>

          <div className="flex flex-col md:flex-row gap-8 mt-4">
            {/* Poster */}
            <div className="flex-shrink-0 w-56 md:w-64">
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-gray-800 shadow-2xl shadow-purple-900/20 ring-1 ring-white/10">
                {film.posterUrl ? (
                  <Image
                    src={film.posterUrl}
                    alt={film.title}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-600">
                    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold md:text-4xl lg:text-5xl">{film.title}</h1>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-purple-600/30 border border-purple-500/30 px-3 py-1 text-sm text-purple-300 font-medium">
                  {film.category}
                </span>
                <span className="text-sm text-gray-400 font-medium">{film.year}</span>
                {film.duration && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-gray-600" />
                    <span className="text-sm text-gray-400">{film.duration}</span>
                  </>
                )}
                <span className="h-1 w-1 rounded-full bg-gray-600" />
                <span className="text-sm text-gray-400">
                  {film._count.downloads} vue{film._count.downloads > 1 ? "s" : ""}
                </span>
              </div>

              {film.description && (
                <p className="mt-5 text-gray-300 leading-relaxed max-w-2xl">
                  {film.description}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                {film.videoUrl && (
                  <DownloadButton filmId={film.id} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Player */}
      {film.videoUrl && (
        <div className="mx-auto max-w-7xl px-4 mt-4">
          <div className="rounded-xl overflow-hidden border border-white/5">
            <VideoPlayer videoUrl={film.videoUrl} title={film.title} poster={film.posterUrl || undefined} />
          </div>
        </div>
      )}

      {/* Related films */}
      {relatedFilms.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 mt-12 pb-16">
          <h2 className="mb-6 text-xl font-bold">Films similaires</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {relatedFilms.map((rf) => (
              <Link key={rf.id} href={`/films/${rf.id}`} className="card group">
                <div className="relative aspect-[2/3] bg-gray-800">
                  {rf.posterUrl ? (
                    <Image
                      src={rf.posterUrl}
                      alt={rf.title}
                      fill
                      className="object-cover"
                      sizes="16vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-600">
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <h3 className="text-xs font-semibold line-clamp-1">{rf.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
