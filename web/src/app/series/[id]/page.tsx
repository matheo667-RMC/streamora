import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { EpisodePlayer } from "@/components/EpisodePlayer";

interface Props {
  params: { id: string };
}

export const dynamic = "force-dynamic";

export default async function SeriesDetailPage({ params }: Props) {
  const series = await prisma.series.findUnique({
    where: { id: params.id },
    include: {
      episodes: { orderBy: [{ season: "asc" }, { number: "asc" }] },
    },
  });

  if (!series) notFound();

  const seasonNumbers = [...new Set(series.episodes.map((ep) => ep.season))].sort(
    (a, b) => a - b
  );

  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-black">
      {/* Hero backdrop */}
      <div className="relative h-[50vh] sm:h-[55vh]">
        {series.posterUrl && (
          <Image
            src={series.posterUrl}
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
                  {series.posterUrl && (
                    <Image
                      src={series.posterUrl}
                      alt={series.title}
                      fill
                      className="object-cover"
                      priority
                    />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pb-2">
                <div className="flex items-center gap-2 mb-3">
                  <span className="rounded bg-purple-600/90 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">Série</span>
                  <span className="text-sm text-gray-400">{series.year}</span>
                </div>
                <h1 className="text-3xl font-bold md:text-4xl lg:text-5xl leading-tight">{series.title}</h1>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-gray-400">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-gray-200">{series.category}</span>
                  <span>{seasonNumbers.length} saison{seasonNumbers.length > 1 ? "s" : ""}</span>
                  <span className="text-gray-600">·</span>
                  <span>{series.episodes.length} épisode{series.episodes.length > 1 ? "s" : ""}</span>
                </div>

                {series.description && (
                  <p className="mt-4 text-sm sm:text-base text-gray-300 leading-relaxed max-w-2xl line-clamp-3">
                    {series.description}
                  </p>
                )}

                {series.episodes.length > 0 && series.episodes[0]?.videoUrl && (
                  <div className="mt-5 flex gap-3">
                    <span className="inline-flex items-center gap-2 rounded-lg bg-white text-black px-6 py-2.5 text-sm font-bold hover:bg-gray-200 transition-colors cursor-default">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      Regarder S01E01
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Episodes */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-16">
        {seasonNumbers.length > 0 ? (
          <EpisodePlayer
            seasons={seasonNumbers}
            episodes={series.episodes.map(ep => ({
              id: ep.id,
              season: ep.season,
              number: ep.number,
              title: ep.title,
              videoUrl: ep.videoUrl,
              duration: ep.duration,
            }))}
            seriesTitle={series.title}
            poster={series.posterUrl || undefined}
          />
        ) : (
          <div className="mt-8 rounded-xl border border-white/5 bg-gray-900/30 p-12 text-center">
            <p className="text-gray-400">Aucun épisode disponible pour le moment.</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
