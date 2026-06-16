import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { DownloadButton } from "@/components/DownloadButton";
import { VideoPlayer } from "@/components/VideoPlayer";

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

  const session = await auth();

  const relatedFilms = await prisma.film.findMany({
    where: { category: film.category, id: { not: film.id } },
    take: 6,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Link
        href="/films"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
      >
        &larr; Retour aux films
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Poster */}
        <div className="lg:col-span-1">
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-gray-800">
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
                <svg
                  className="h-20 w-20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold md:text-4xl">{film.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-primary-900/50 px-3 py-1 text-sm text-primary-300">
              {film.category}
            </span>
            <span className="text-sm text-gray-400">{film.year}</span>
            {film.duration && (
              <span className="text-sm text-gray-400">{film.duration}</span>
            )}
            <span className="text-sm text-gray-400">
              {film._count.downloads} téléchargement
              {film._count.downloads > 1 ? "s" : ""}
            </span>
          </div>

          {film.description && (
            <p className="mt-6 text-gray-300 leading-relaxed">
              {film.description}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {film.videoUrl && session?.user && (
              <VideoPlayer videoUrl={film.videoUrl} title={film.title} />
            )}
            {film.videoUrl && session?.user && (
              <DownloadButton filmId={film.id} />
            )}
            {!session?.user && (
              <Link href="/login" className="btn-primary">
                Connectez-vous pour regarder
              </Link>
            )}
          </div>

          {/* Video embed */}
          {film.videoUrl && session?.user && (
            <div className="mt-8">
              <div className="aspect-video overflow-hidden rounded-xl bg-black">
                <video
                  src={film.videoUrl}
                  controls
                  className="h-full w-full"
                  poster={film.posterUrl || undefined}
                >
                  Votre navigateur ne supporte pas la lecture vidéo.
                </video>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related films */}
      {relatedFilms.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">Films similaires</h2>
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
                      <svg
                        className="h-8 w-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <h3 className="text-xs font-semibold line-clamp-1">
                    {rf.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
